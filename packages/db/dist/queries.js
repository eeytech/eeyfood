import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "./client.js";
import { menuCategoriesTable, orderProductsTable, ordersTable, productsTable, restaurantsTable, stockMovementsTable, } from "./schema.js";
const agruparItensPorPedido = (pedidos, itens) => {
    const itensPorPedido = new Map();
    for (const { orderId, item } of itens) {
        const listaAtual = itensPorPedido.get(orderId) ?? [];
        listaAtual.push(item);
        itensPorPedido.set(orderId, listaAtual);
    }
    return pedidos.map((pedido) => ({
        ...pedido,
        orderProducts: itensPorPedido.get(pedido.id) ?? [],
    }));
};
const resolverSlugRestaurante = async (restaurantId) => {
    const [restaurant] = await db
        .select({
        slug: restaurantsTable.slug,
    })
        .from(restaurantsTable)
        .where(eq(restaurantsTable.id, restaurantId))
        .limit(1);
    return restaurant?.slug ?? null;
};
const getOrderStatusTimestamps = (status) => {
    const now = new Date();
    if (status === "FINISHED") {
        return {
            finishedAt: now,
            closedAt: now,
            cancelledAt: null,
        };
    }
    if (status === "CANCELLED") {
        return {
            finishedAt: null,
            closedAt: now,
            cancelledAt: now,
        };
    }
    return {};
};
export const buscarRestaurantePorSlug = async (slug) => {
    const [restaurant] = await db
        .select()
        .from(restaurantsTable)
        .where(eq(restaurantsTable.slug, slug))
        .limit(1);
    return restaurant ?? null;
};
export const buscarRestauranteComCardapioPorSlug = async (slug) => {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) {
        return null;
    }
    const rows = await db
        .select({
        category: menuCategoriesTable,
        product: productsTable,
    })
        .from(menuCategoriesTable)
        .leftJoin(productsTable, and(eq(productsTable.menuCategoryId, menuCategoriesTable.id), eq(productsTable.isActive, true)))
        .where(and(eq(menuCategoriesTable.restaurantId, restaurant.id), eq(menuCategoriesTable.isActive, true)))
        .orderBy(asc(menuCategoriesTable.displayOrder), asc(menuCategoriesTable.name), asc(productsTable.name));
    const categoriesMap = new Map();
    for (const row of rows) {
        const currentCategory = categoriesMap.get(row.category.id) ?? {
            ...row.category,
            products: [],
        };
        if (row.product) {
            currentCategory.products.push(row.product);
        }
        categoriesMap.set(row.category.id, currentCategory);
    }
    return {
        ...restaurant,
        menuCategories: Array.from(categoriesMap.values()),
    };
};
export const buscarProdutoDoRestaurante = async ({ slug, productId, }) => {
    const [row] = await db
        .select({
        product: productsTable,
        restaurant: {
            name: restaurantsTable.name,
            avatarImageUrl: restaurantsTable.avatarImageUrl,
            slug: restaurantsTable.slug,
        },
    })
        .from(productsTable)
        .innerJoin(restaurantsTable, eq(restaurantsTable.id, productsTable.restaurantId))
        .where(and(eq(productsTable.id, productId), eq(restaurantsTable.slug, slug), eq(productsTable.isActive, true)))
        .limit(1);
    if (!row) {
        return null;
    }
    return {
        ...row.product,
        restaurant: row.restaurant,
    };
};
export const buscarPedidosPorTelefone = async (customerPhone) => {
    const pedidos = await db
        .select({
        order: ordersTable,
        restaurant: {
            name: restaurantsTable.name,
            avatarImageUrl: restaurantsTable.avatarImageUrl,
            slug: restaurantsTable.slug,
        },
    })
        .from(ordersTable)
        .innerJoin(restaurantsTable, eq(restaurantsTable.id, ordersTable.restaurantId))
        .where(eq(ordersTable.customerPhone, customerPhone))
        .orderBy(desc(ordersTable.createdAt));
    if (pedidos.length === 0) {
        return [];
    }
    const orderIds = pedidos.map(({ order }) => order.id);
    const itens = await db
        .select({
        orderId: orderProductsTable.orderId,
        orderProduct: orderProductsTable,
        product: productsTable,
    })
        .from(orderProductsTable)
        .innerJoin(productsTable, eq(productsTable.id, orderProductsTable.productId))
        .where(inArray(orderProductsTable.orderId, orderIds));
    const pedidosNormalizados = pedidos.map(({ order, restaurant }) => ({
        ...order,
        restaurant,
    }));
    return agruparItensPorPedido(pedidosNormalizados, itens.map((item) => ({
        orderId: item.orderId,
        item: {
            ...item.orderProduct,
            product: item.product,
        },
    })));
};
export const criarPedido = async (input) => {
    const restaurant = await buscarRestaurantePorSlug(input.slug);
    if (!restaurant) {
        throw new Error("Restaurante não encontrado.");
    }
    const normalizedProducts = Array.from(input.products.reduce((map, product) => {
        const currentQuantity = map.get(product.id) ?? 0;
        map.set(product.id, currentQuantity + product.quantity);
        return map;
    }, new Map())).map(([id, quantity]) => ({
        id,
        quantity,
    }));
    if (normalizedProducts.length === 0) {
        throw new Error("O pedido precisa ter pelo menos um item.");
    }
    const productIds = normalizedProducts.map((product) => product.id);
    const productsWithPrices = await db
        .select()
        .from(productsTable)
        .where(and(inArray(productsTable.id, productIds), eq(productsTable.restaurantId, restaurant.id), eq(productsTable.isActive, true)));
    const productsMap = new Map(productsWithPrices.map((product) => [product.id, product]));
    const itens = normalizedProducts.map((product) => {
        const currentProduct = productsMap.get(product.id);
        if (!currentProduct) {
            throw new Error("Produto não encontrado.");
        }
        if (currentProduct.trackInventory &&
            currentProduct.stockQuantity < product.quantity) {
            throw new Error(`Estoque insuficiente para o produto ${currentProduct.name}.`);
        }
        const lineTotal = currentProduct.price * product.quantity;
        const unitCost = currentProduct.costPrice;
        return {
            productId: currentProduct.id,
            productNameSnapshot: currentProduct.name,
            quantity: product.quantity,
            price: currentProduct.price,
            unitCost,
            lineTotal,
            currentProduct,
        };
    });
    const subtotal = itens.reduce((accumulator, item) => {
        return accumulator + item.lineTotal;
    }, 0);
    const estimatedCost = itens.reduce((accumulator, item) => {
        return accumulator + item.unitCost * item.quantity;
    }, 0);
    const discountAmount = 0;
    const deliveryFee = 0;
    const total = subtotal + deliveryFee - discountAmount;
    const estimatedProfit = total - estimatedCost;
    return db.transaction(async (tx) => {
        const [order] = await tx
            .insert(ordersTable)
            .values({
            subtotal,
            discountAmount,
            deliveryFee,
            total,
            estimatedCost,
            estimatedProfit,
            status: "PENDING",
            paymentStatus: "PENDING",
            consumptionMethod: input.consumptionMethod,
            paymentMethod: input.paymentMethod,
            changeFor: input.changeFor,
            notes: input.notes,
            restaurantId: restaurant.id,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
        })
            .returning();
        await tx.insert(orderProductsTable).values(itens.map((item) => ({
            productId: item.productId,
            orderId: order.id,
            quantity: item.quantity,
            price: item.price,
            unitCost: item.unitCost,
            lineTotal: item.lineTotal,
            productNameSnapshot: item.productNameSnapshot,
        })));
        for (const item of itens) {
            if (!item.currentProduct.trackInventory) {
                continue;
            }
            const previousQuantity = item.currentProduct.stockQuantity;
            const currentQuantity = previousQuantity - item.quantity;
            await tx
                .update(productsTable)
                .set({
                stockQuantity: currentQuantity,
                updatedAt: new Date(),
            })
                .where(eq(productsTable.id, item.productId));
            await tx.insert(stockMovementsTable).values({
                restaurantId: restaurant.id,
                productId: item.productId,
                orderId: order.id,
                type: "OUT",
                quantityDelta: -item.quantity,
                previousQuantity,
                currentQuantity,
                reason: `Baixa automática do pedido #${String(order.id)}`,
            });
        }
        return order;
    });
};
export const atualizarStatusPedido = async ({ orderId, status, }) => {
    const result = await db.transaction(async (tx) => {
        const [existingOrder] = await tx
            .select({
            id: ordersTable.id,
            status: ordersTable.status,
            restaurantId: ordersTable.restaurantId,
        })
            .from(ordersTable)
            .where(eq(ordersTable.id, orderId))
            .limit(1);
        if (!existingOrder) {
            return null;
        }
        const [updatedOrder] = await tx
            .update(ordersTable)
            .set({
            status,
            ...getOrderStatusTimestamps(status),
            updatedAt: new Date(),
        })
            .where(eq(ordersTable.id, orderId))
            .returning({
            id: ordersTable.id,
            status: ordersTable.status,
            restaurantId: ordersTable.restaurantId,
        });
        if (!updatedOrder) {
            return null;
        }
        if (status === "CANCELLED" && existingOrder.status !== "CANCELLED") {
            const orderItems = await tx
                .select({
                orderProduct: orderProductsTable,
                product: productsTable,
            })
                .from(orderProductsTable)
                .innerJoin(productsTable, eq(productsTable.id, orderProductsTable.productId))
                .where(eq(orderProductsTable.orderId, orderId));
            for (const item of orderItems) {
                if (!item.product.trackInventory) {
                    continue;
                }
                const previousQuantity = item.product.stockQuantity;
                const currentQuantity = previousQuantity + item.orderProduct.quantity;
                await tx
                    .update(productsTable)
                    .set({
                    stockQuantity: currentQuantity,
                    updatedAt: new Date(),
                })
                    .where(eq(productsTable.id, item.product.id));
                await tx.insert(stockMovementsTable).values({
                    restaurantId: updatedOrder.restaurantId,
                    productId: item.product.id,
                    orderId,
                    type: "IN",
                    quantityDelta: item.orderProduct.quantity,
                    previousQuantity,
                    currentQuantity,
                    reason: `Reposição por cancelamento do pedido #${String(orderId)}`,
                });
            }
        }
        return updatedOrder;
    });
    if (!result) {
        return null;
    }
    const restaurantSlug = await resolverSlugRestaurante(result.restaurantId);
    if (!restaurantSlug) {
        return null;
    }
    return {
        id: result.id,
        status: result.status,
        restaurantSlug,
    };
};
export const atualizarStatusPagamentoPedido = async ({ orderId, paymentStatus, }) => {
    const [updatedOrder] = await db
        .update(ordersTable)
        .set({
        paymentStatus,
        paidAt: paymentStatus === "PAID" ? new Date() : null,
        updatedAt: new Date(),
    })
        .where(eq(ordersTable.id, orderId))
        .returning({
        id: ordersTable.id,
        paymentStatus: ordersTable.paymentStatus,
        restaurantId: ordersTable.restaurantId,
    });
    if (!updatedOrder) {
        return null;
    }
    const restaurantSlug = await resolverSlugRestaurante(updatedOrder.restaurantId);
    if (!restaurantSlug) {
        return null;
    }
    return {
        id: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        restaurantSlug,
    };
};
export const buscarPedidoRecebimentoPorId = async (orderId) => {
    const [pedido] = await db
        .select({
        order: ordersTable,
        restaurant: {
            id: restaurantsTable.id,
            name: restaurantsTable.name,
            slug: restaurantsTable.slug,
        },
    })
        .from(ordersTable)
        .innerJoin(restaurantsTable, eq(restaurantsTable.id, ordersTable.restaurantId))
        .where(eq(ordersTable.id, orderId))
        .limit(1);
    if (!pedido) {
        return null;
    }
    const itens = await db
        .select({
        orderProduct: orderProductsTable,
        product: {
            id: productsTable.id,
            name: productsTable.name,
            imageUrl: productsTable.imageUrl,
        },
    })
        .from(orderProductsTable)
        .innerJoin(productsTable, eq(productsTable.id, orderProductsTable.productId))
        .where(eq(orderProductsTable.orderId, orderId));
    return {
        ...pedido.order,
        restaurant: pedido.restaurant,
        orderProducts: itens.map((item) => ({
            ...item.orderProduct,
            product: item.product,
        })),
    };
};
export const listarPedidosRecebimentoPorSlug = async (slug) => {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) {
        return [];
    }
    const pedidos = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.restaurantId, restaurant.id))
        .orderBy(desc(ordersTable.createdAt));
    const pedidosDetalhados = await Promise.all(pedidos.map((pedido) => buscarPedidoRecebimentoPorId(pedido.id)));
    return pedidosDetalhados.filter((pedido) => pedido !== null);
};
