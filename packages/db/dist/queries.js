import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./client.js";
import { menuCategoriesTable, orderProductsTable, ordersTable, productsTable, restaurantsTable, } from "./schema.js";
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
        .leftJoin(productsTable, eq(productsTable.menuCategoryId, menuCategoriesTable.id))
        .where(eq(menuCategoriesTable.restaurantId, restaurant.id));
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
        .where(and(eq(productsTable.id, productId), eq(restaurantsTable.slug, slug)))
        .limit(1);
    if (!row) {
        return null;
    }
    return {
        ...row.product,
        restaurant: row.restaurant,
    };
};
export const buscarPedidosPorCpf = async (customerCpf) => {
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
        .where(eq(ordersTable.customerCpf, customerCpf))
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
    const productIds = input.products.map((product) => product.id);
    const productsWithPrices = await db
        .select()
        .from(productsTable)
        .where(inArray(productsTable.id, productIds));
    const productsMap = new Map(productsWithPrices.map((product) => [product.id, product]));
    const itens = input.products.map((product) => {
        const currentProduct = productsMap.get(product.id);
        if (!currentProduct) {
            throw new Error("Produto não encontrado.");
        }
        return {
            productId: currentProduct.id,
            quantity: product.quantity,
            price: currentProduct.price,
        };
    });
    const total = itens.reduce((accumulator, item) => accumulator + item.price * item.quantity, 0);
    return db.transaction(async (tx) => {
        const [order] = await tx
            .insert(ordersTable)
            .values({
            total,
            status: "PENDING",
            consumptionMethod: input.consumptionMethod,
            paymentMethod: input.paymentMethod,
            changeFor: input.changeFor,
            restaurantId: restaurant.id,
            customerName: input.customerName,
            customerCpf: input.customerCpf,
        })
            .returning();
        await tx.insert(orderProductsTable).values(itens.map((item) => ({
            ...item,
            orderId: order.id,
        })));
        return order;
    });
};
export const atualizarStatusPedido = async ({ orderId, status, }) => {
    const [updatedOrder] = await db
        .update(ordersTable)
        .set({
        status,
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
    const [restaurant] = await db
        .select({
        slug: restaurantsTable.slug,
    })
        .from(restaurantsTable)
        .where(eq(restaurantsTable.id, updatedOrder.restaurantId))
        .limit(1);
    if (!restaurant) {
        return null;
    }
    return {
        id: updatedOrder.id,
        status: updatedOrder.status,
        restaurantSlug: restaurant.slug,
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
