import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "./client.js";
import { abandonedCartsTable, couponsTable, diningTablesTable, menuCategoriesTable, orderProductsTable, ordersTable, productsTable, restaurantsTable, stockMovementsTable, walletsTable, } from "./schema.js";
const CASHBACK_PERCENTUAL_PADRAO = 0.05;
const arredondarMoeda = (value) => {
    return Number(value.toFixed(2));
};
const normalizarCodigoCupom = (couponCode) => {
    const normalizedCouponCode = couponCode?.trim().toUpperCase();
    return normalizedCouponCode ? normalizedCouponCode : undefined;
};
const normalizarProdutosPedido = (products) => {
    return Array.from(products.reduce((map, product) => {
        const currentQuantity = map.get(product.id) ?? 0;
        map.set(product.id, currentQuantity + product.quantity);
        return map;
    }, new Map())).map(([id, quantity]) => ({
        id,
        quantity,
    }));
};
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
const normalizarTelefoneLead = (phone) => {
    const normalizedPhone = phone?.replace(/\D/g, "") ?? "";
    return normalizedPhone.length > 0 ? normalizedPhone : null;
};
const isTelefoneElegivelParaCarteira = (phone) => {
    if (!/^\d{11}$/.test(phone)) {
        return false;
    }
    if (/^(\d)\1+$/.test(phone)) {
        return false;
    }
    return phone.charAt(2) === "9";
};
const normalizarNomeLead = (name) => {
    const normalizedName = name?.trim() ?? "";
    return normalizedName.length > 0 ? normalizedName : null;
};
const validarAgendamentoPedido = ({ consumptionMethod, scheduledFor, }) => {
    if (!scheduledFor) {
        return null;
    }
    if (consumptionMethod === "DINE_IN") {
        throw new Error("Pedidos no salão não podem ser agendados.");
    }
    const now = new Date();
    const minimumLeadTimeInMs = 15 * 60 * 1000;
    const maximumWindowInMs = 30 * 24 * 60 * 60 * 1000;
    const scheduledTime = scheduledFor.getTime();
    if (Number.isNaN(scheduledTime)) {
        throw new Error("Data e hora de agendamento inválidas.");
    }
    if (scheduledTime < now.getTime() + minimumLeadTimeInMs) {
        throw new Error("O agendamento precisa ter pelo menos 15 minutos de antecedência.");
    }
    if (scheduledTime > now.getTime() + maximumWindowInMs) {
        throw new Error("O agendamento pode ser feito em até 30 dias.");
    }
    return scheduledFor;
};
const pedidoEstaAtivo = (status) => {
    return status !== "FINISHED" && status !== "CANCELLED";
};
export const buscarRestaurantePorSlug = async (slug) => {
    const [restaurant] = await db
        .select()
        .from(restaurantsTable)
        .where(eq(restaurantsTable.slug, slug))
        .limit(1);
    return restaurant ?? null;
};
const marcarCarrinhoAbandonadoComoConvertido = async ({ orderId, restaurantId, sessionId, }) => {
    if (!sessionId) {
        return;
    }
    await db
        .update(abandonedCartsTable)
        .set({
        status: "CONVERTED",
        convertedOrderId: orderId,
        convertedAt: new Date(),
        updatedAt: new Date(),
    })
        .where(and(eq(abandonedCartsTable.restaurantId, restaurantId), eq(abandonedCartsTable.sessionId, sessionId)));
};
export const salvarCarrinhoAbandonado = async (input) => {
    const restaurant = await buscarRestaurantePorSlug(input.slug);
    if (!restaurant) {
        throw new Error("Restaurante nao encontrado.");
    }
    if (input.products.length === 0) {
        return null;
    }
    const scheduledFor = input.scheduledFor
        ? validarAgendamentoPedido({
            consumptionMethod: input.consumptionMethod,
            scheduledFor: input.scheduledFor,
        })
        : null;
    const customerName = normalizarNomeLead(input.customerName);
    const customerPhone = normalizarTelefoneLead(input.customerPhone);
    if (!customerName && !customerPhone) {
        return null;
    }
    const cartSnapshot = input.products.map((product) => ({
        productId: product.id,
        name: product.name,
        quantity: product.quantity,
        unitPrice: product.price,
        lineTotal: arredondarMoeda(product.price * product.quantity),
    }));
    const subtotal = arredondarMoeda(cartSnapshot.reduce((accumulator, item) => {
        return accumulator + item.lineTotal;
    }, 0));
    const itemCount = cartSnapshot.reduce((accumulator, item) => {
        return accumulator + item.quantity;
    }, 0);
    const values = {
        sessionId: input.sessionId,
        status: "ACTIVE",
        restaurantId: restaurant.id,
        customerName,
        customerPhone,
        consumptionMethod: input.consumptionMethod,
        paymentMethod: input.paymentMethod,
        couponCode: normalizarCodigoCupom(input.couponCode),
        useWalletBalance: input.useWalletBalance ?? false,
        scheduledFor,
        subtotal,
        total: subtotal,
        itemCount,
        cartSnapshot,
        convertedOrderId: null,
        convertedAt: null,
        updatedAt: new Date(),
    };
    const [abandonedCart] = await db
        .insert(abandonedCartsTable)
        .values(values)
        .onConflictDoUpdate({
        target: [
            abandonedCartsTable.restaurantId,
            abandonedCartsTable.sessionId,
        ],
        set: values,
    })
        .returning();
    return abandonedCart ?? null;
};
const resolverCupomAplicado = async ({ couponCode, restaurantId, customerPhone, subtotal, }) => {
    const normalizedCouponCode = normalizarCodigoCupom(couponCode);
    if (!normalizedCouponCode) {
        return null;
    }
    const [coupon] = await db
        .select()
        .from(couponsTable)
        .where(and(eq(couponsTable.restaurantId, restaurantId), eq(couponsTable.code, normalizedCouponCode)))
        .limit(1);
    if (!coupon) {
        throw new Error("Cupom invalido ou indisponivel para este restaurante.");
    }
    if (!coupon.isActive) {
        throw new Error("Este cupom esta inativo no momento.");
    }
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
        throw new Error("Este cupom ainda nao esta disponivel para uso.");
    }
    if (coupon.endsAt && coupon.endsAt < now) {
        throw new Error("Este cupom expirou.");
    }
    if (subtotal < coupon.minimumOrderValue) {
        throw new Error(`Este cupom exige pedido minimo de R$ ${coupon.minimumOrderValue
            .toFixed(2)
            .replace(".", ",")}.`);
    }
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        throw new Error("Este cupom ja atingiu o limite total de uso.");
    }
    const [usageByCustomer] = await db
        .select({
        count: sql `count(*)`,
    })
        .from(ordersTable)
        .where(and(eq(ordersTable.restaurantId, restaurantId), eq(ordersTable.customerPhone, customerPhone), eq(ordersTable.couponId, coupon.id)));
    const customerUsageCount = Number(usageByCustomer?.count ?? 0);
    if (customerUsageCount >= coupon.perCustomerLimit) {
        throw new Error("Este cupom ja foi utilizado o maximo permitido para este celular.");
    }
    const grossDiscount = coupon.discountType === "PERCENTAGE"
        ? subtotal * (coupon.discountValue / 100)
        : coupon.discountValue;
    const discountWithCap = coupon.maxDiscountAmount !== null
        ? Math.min(grossDiscount, coupon.maxDiscountAmount)
        : grossDiscount;
    return {
        coupon: {
            id: coupon.id,
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
        },
        discountAmount: arredondarMoeda(Math.min(discountWithCap, subtotal)),
    };
};
const carregarContextoPedidoCalculado = async (input) => {
    const restaurant = await buscarRestaurantePorSlug(input.slug);
    if (!restaurant) {
        throw new Error("Restaurante nao encontrado.");
    }
    const normalizedProducts = normalizarProdutosPedido(input.products);
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
            throw new Error("Produto nao encontrado.");
        }
        if (currentProduct.trackInventory &&
            currentProduct.stockQuantity < product.quantity) {
            throw new Error(`Estoque insuficiente para o produto ${currentProduct.name}.`);
        }
        const lineTotal = arredondarMoeda(currentProduct.price * product.quantity);
        return {
            productId: currentProduct.id,
            productNameSnapshot: currentProduct.name,
            quantity: product.quantity,
            price: currentProduct.price,
            unitCost: currentProduct.costPrice,
            lineTotal,
            currentProduct,
        };
    });
    const subtotal = arredondarMoeda(itens.reduce((accumulator, item) => {
        return accumulator + item.lineTotal;
    }, 0));
    const estimatedCost = arredondarMoeda(itens.reduce((accumulator, item) => {
        return accumulator + item.unitCost * item.quantity;
    }, 0));
    const coupon = await resolverCupomAplicado({
        couponCode: input.couponCode,
        restaurantId: restaurant.id,
        customerPhone: input.customerPhone,
        subtotal,
    });
    const [wallet] = await db
        .select()
        .from(walletsTable)
        .where(and(eq(walletsTable.restaurantId, restaurant.id), eq(walletsTable.customerPhone, input.customerPhone)))
        .limit(1);
    if (input.useWalletBalance && (!wallet || wallet.balance <= 0)) {
        throw new Error("Voce nao possui saldo de cashback disponivel para resgate.");
    }
    const couponDiscountAmount = coupon?.discountAmount ?? 0;
    const totalAfterCoupon = Math.max(subtotal - couponDiscountAmount, 0);
    const cashbackRedeemedAmount = input.useWalletBalance && wallet
        ? arredondarMoeda(Math.min(wallet.balance, totalAfterCoupon))
        : 0;
    const deliveryFee = 0;
    const discountAmount = arredondarMoeda(couponDiscountAmount + cashbackRedeemedAmount);
    const total = arredondarMoeda(Math.max(subtotal + deliveryFee - discountAmount, 0));
    const cashbackEarnedAmount = arredondarMoeda(total * CASHBACK_PERCENTUAL_PADRAO);
    return {
        restaurant,
        itens,
        subtotal,
        estimatedCost,
        coupon,
        wallet: wallet ?? null,
        couponDiscountAmount,
        cashbackRedeemedAmount,
        deliveryFee,
        discountAmount,
        total,
        cashbackEarnedAmount,
    };
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
        diningTable: {
            id: diningTablesTable.id,
            name: diningTablesTable.name,
            seats: diningTablesTable.seats,
        },
    })
        .from(ordersTable)
        .innerJoin(restaurantsTable, eq(restaurantsTable.id, ordersTable.restaurantId))
        .leftJoin(diningTablesTable, eq(diningTablesTable.id, ordersTable.diningTableId))
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
    const pedidosNormalizados = pedidos.map(({ order, restaurant, diningTable }) => ({
        ...order,
        restaurant,
        diningTable: diningTable ? diningTable : null,
    }));
    return agruparItensPorPedido(pedidosNormalizados, itens.map((item) => ({
        orderId: item.orderId,
        item: {
            ...item.orderProduct,
            product: item.product,
        },
    })));
};
export const validarBeneficiosPedido = async (input) => {
    const contexto = await carregarContextoPedidoCalculado(input);
    return {
        subtotal: contexto.subtotal,
        deliveryFee: contexto.deliveryFee,
        discountAmount: contexto.discountAmount,
        couponDiscountAmount: contexto.couponDiscountAmount,
        cashbackRedeemedAmount: contexto.cashbackRedeemedAmount,
        total: contexto.total,
        cashbackEarnedAmount: contexto.cashbackEarnedAmount,
        appliedCoupon: contexto.coupon?.coupon ?? null,
        wallet: contexto.wallet
            ? {
                id: contexto.wallet.id,
                currentBalance: contexto.wallet.balance,
                remainingBalance: arredondarMoeda(Math.max(contexto.wallet.balance - contexto.cashbackRedeemedAmount, 0)),
                availableToRedeem: contexto.cashbackRedeemedAmount,
            }
            : null,
    };
};
export const criarPedido = async (input) => {
    const contexto = await carregarContextoPedidoCalculado(input);
    const scheduledFor = validarAgendamentoPedido({
        consumptionMethod: input.consumptionMethod,
        scheduledFor: input.scheduledFor,
    });
    const estimatedProfit = arredondarMoeda(contexto.total - contexto.estimatedCost);
    const order = await db.transaction(async (tx) => {
        if (contexto.coupon) {
            const [couponSnapshot] = await tx
                .select({
                id: couponsTable.id,
                usageCount: couponsTable.usageCount,
                usageLimit: couponsTable.usageLimit,
                perCustomerLimit: couponsTable.perCustomerLimit,
            })
                .from(couponsTable)
                .where(eq(couponsTable.id, contexto.coupon.coupon.id))
                .limit(1);
            if (!couponSnapshot) {
                throw new Error("Cupom invalido ou indisponivel para este pedido.");
            }
            if (couponSnapshot.usageLimit !== null &&
                couponSnapshot.usageCount >= couponSnapshot.usageLimit) {
                throw new Error("Este cupom acabou de atingir o limite de uso.");
            }
            const [usageByCustomer] = await tx
                .select({
                count: sql `count(*)`,
            })
                .from(ordersTable)
                .where(and(eq(ordersTable.restaurantId, contexto.restaurant.id), eq(ordersTable.customerPhone, input.customerPhone), eq(ordersTable.couponId, couponSnapshot.id)));
            if (Number(usageByCustomer?.count ?? 0) >= couponSnapshot.perCustomerLimit) {
                throw new Error("Este cupom ja foi utilizado o maximo permitido para este celular.");
            }
            await tx
                .update(couponsTable)
                .set({
                usageCount: couponSnapshot.usageCount + 1,
                updatedAt: new Date(),
            })
                .where(eq(couponsTable.id, couponSnapshot.id));
        }
        if (contexto.cashbackRedeemedAmount > 0 && contexto.wallet) {
            const [updatedWallet] = await tx
                .update(walletsTable)
                .set({
                balance: arredondarMoeda(contexto.wallet.balance - contexto.cashbackRedeemedAmount),
                totalRedeemed: arredondarMoeda(contexto.wallet.totalRedeemed + contexto.cashbackRedeemedAmount),
                lastRedeemAt: new Date(),
                updatedAt: new Date(),
            })
                .where(and(eq(walletsTable.id, contexto.wallet.id), gte(walletsTable.balance, contexto.cashbackRedeemedAmount)))
                .returning({
                id: walletsTable.id,
            });
            if (!updatedWallet) {
                throw new Error("O saldo de cashback nao esta mais disponivel para uso.");
            }
        }
        const [order] = await tx
            .insert(ordersTable)
            .values({
            subtotal: contexto.subtotal,
            discountAmount: contexto.discountAmount,
            couponDiscountAmount: contexto.couponDiscountAmount,
            cashbackRedeemedAmount: contexto.cashbackRedeemedAmount,
            cashbackEarnedAmount: contexto.cashbackEarnedAmount,
            deliveryFee: contexto.deliveryFee,
            total: contexto.total,
            estimatedCost: contexto.estimatedCost,
            estimatedProfit,
            status: "PENDING",
            paymentStatus: "PENDING",
            consumptionMethod: input.consumptionMethod,
            paymentMethod: input.paymentMethod,
            changeFor: input.changeFor,
            notes: input.notes,
            couponId: contexto.coupon?.coupon.id,
            couponCode: contexto.coupon?.coupon.code,
            restaurantId: contexto.restaurant.id,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            scheduledFor,
        })
            .returning();
        await tx.insert(orderProductsTable).values(contexto.itens.map((item) => ({
            productId: item.productId,
            orderId: order.id,
            quantity: item.quantity,
            price: item.price,
            unitCost: item.unitCost,
            lineTotal: item.lineTotal,
            productNameSnapshot: item.productNameSnapshot,
        })));
        for (const item of contexto.itens) {
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
                restaurantId: contexto.restaurant.id,
                productId: item.productId,
                orderId: order.id,
                type: "OUT",
                quantityDelta: -item.quantity,
                previousQuantity,
                currentQuantity,
                reason: `Baixa automatica do pedido #${String(order.id)}`,
            });
        }
        return order;
    });
    await marcarCarrinhoAbandonadoComoConvertido({
        orderId: order.id,
        restaurantId: contexto.restaurant.id,
        sessionId: input.abandonedCartSessionId,
    });
    return order;
};
export const listarMesasComandasPorSlug = async (slug) => {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) {
        return [];
    }
    const tables = await db
        .select()
        .from(diningTablesTable)
        .where(and(eq(diningTablesTable.restaurantId, restaurant.id), eq(diningTablesTable.isActive, true)))
        .orderBy(asc(diningTablesTable.displayOrder), asc(diningTablesTable.name));
    const activeOrders = await db
        .select({
        id: ordersTable.id,
        diningTableId: ordersTable.diningTableId,
        createdAt: ordersTable.createdAt,
        status: ordersTable.status,
        consumptionMethod: ordersTable.consumptionMethod,
    })
        .from(ordersTable)
        .where(eq(ordersTable.restaurantId, restaurant.id))
        .orderBy(desc(ordersTable.createdAt));
    const activeOrdersByTable = new Map();
    for (const order of activeOrders) {
        if (order.consumptionMethod !== "DINE_IN" ||
            !order.diningTableId ||
            !pedidoEstaAtivo(order.status)) {
            continue;
        }
        if (!activeOrdersByTable.has(order.diningTableId)) {
            activeOrdersByTable.set(order.diningTableId, order.id);
        }
    }
    const detailedOrders = await Promise.all(Array.from(activeOrdersByTable.values()).map((orderId) => buscarPedidoRecebimentoPorId(orderId)));
    const orderMap = new Map();
    for (const order of detailedOrders) {
        if (order) {
            orderMap.set(order.id, order);
        }
    }
    return tables.map((table) => {
        const orderId = activeOrdersByTable.get(table.id);
        return {
            table,
            currentOrder: orderId ? orderMap.get(orderId) ?? null : null,
        };
    });
};
export const abrirComandaMesa = async ({ slug, diningTableId, customerName, }) => {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) {
        throw new Error("Restaurante nao encontrado.");
    }
    const [table] = await db
        .select()
        .from(diningTablesTable)
        .where(and(eq(diningTablesTable.id, diningTableId), eq(diningTablesTable.restaurantId, restaurant.id), eq(diningTablesTable.isActive, true)))
        .limit(1);
    if (!table) {
        throw new Error("Mesa nao encontrada.");
    }
    const [existingOrder] = await db
        .select({
        id: ordersTable.id,
        status: ordersTable.status,
    })
        .from(ordersTable)
        .where(and(eq(ordersTable.restaurantId, restaurant.id), eq(ordersTable.diningTableId, table.id), eq(ordersTable.consumptionMethod, "DINE_IN")))
        .orderBy(desc(ordersTable.createdAt))
        .limit(1);
    if (existingOrder && pedidoEstaAtivo(existingOrder.status)) {
        const currentOrder = await buscarPedidoRecebimentoPorId(existingOrder.id);
        if (!currentOrder) {
            throw new Error("Nao foi possivel carregar a comanda aberta.");
        }
        return currentOrder;
    }
    const [order] = await db
        .insert(ordersTable)
        .values({
        subtotal: 0,
        discountAmount: 0,
        couponDiscountAmount: 0,
        cashbackRedeemedAmount: 0,
        cashbackEarnedAmount: 0,
        deliveryFee: 0,
        total: 0,
        estimatedCost: 0,
        estimatedProfit: 0,
        status: "PENDING",
        paymentStatus: "PENDING",
        consumptionMethod: "DINE_IN",
        paymentMethod: "DINHEIRO",
        restaurantId: restaurant.id,
        diningTableId: table.id,
        customerName: customerName?.trim() || table.name,
        customerPhone: `MESA-${table.id.slice(0, 8)}-${Date.now().toString()}`,
    })
        .returning({
        id: ordersTable.id,
    });
    const createdOrder = await buscarPedidoRecebimentoPorId(order.id);
    if (!createdOrder) {
        throw new Error("Nao foi possivel abrir a comanda da mesa.");
    }
    return createdOrder;
};
export const adicionarItensComanda = async ({ orderId, products, }) => {
    const normalizedProducts = normalizarProdutosPedido(products);
    if (normalizedProducts.length === 0) {
        throw new Error("Selecione pelo menos um item para lancar na comanda.");
    }
    const result = await db.transaction(async (tx) => {
        const [order] = await tx
            .select()
            .from(ordersTable)
            .where(eq(ordersTable.id, orderId))
            .limit(1);
        if (!order) {
            throw new Error("Comanda nao encontrada.");
        }
        if (order.consumptionMethod !== "DINE_IN" || !order.diningTableId) {
            throw new Error("Este pedido nao pertence a uma comanda de mesa.");
        }
        if (!pedidoEstaAtivo(order.status)) {
            throw new Error("Nao e possivel adicionar itens a uma comanda encerrada.");
        }
        const [table] = await tx
            .select()
            .from(diningTablesTable)
            .where(eq(diningTablesTable.id, order.diningTableId))
            .limit(1);
        const productsWithPrices = await tx
            .select()
            .from(productsTable)
            .where(and(inArray(productsTable.id, normalizedProducts.map((product) => product.id)), eq(productsTable.restaurantId, order.restaurantId), eq(productsTable.isActive, true)));
        const productsMap = new Map(productsWithPrices.map((product) => [product.id, product]));
        const currentOrderProducts = await tx
            .select()
            .from(orderProductsTable)
            .where(eq(orderProductsTable.orderId, order.id));
        const currentOrderProductsMap = new Map(currentOrderProducts.map((orderProduct) => [orderProduct.productId, orderProduct]));
        for (const selectedProduct of normalizedProducts) {
            const product = productsMap.get(selectedProduct.id);
            if (!product) {
                throw new Error("Produto nao encontrado para esta comanda.");
            }
            if (product.trackInventory && product.stockQuantity < selectedProduct.quantity) {
                throw new Error(`Estoque insuficiente para o produto ${product.name}.`);
            }
            const existingOrderProduct = currentOrderProductsMap.get(product.id);
            if (existingOrderProduct) {
                const nextQuantity = existingOrderProduct.quantity + selectedProduct.quantity;
                const nextLineTotal = arredondarMoeda(nextQuantity * existingOrderProduct.price);
                await tx
                    .update(orderProductsTable)
                    .set({
                    quantity: nextQuantity,
                    lineTotal: nextLineTotal,
                    updatedAt: new Date(),
                })
                    .where(eq(orderProductsTable.id, existingOrderProduct.id));
            }
            else {
                await tx.insert(orderProductsTable).values({
                    orderId: order.id,
                    productId: product.id,
                    quantity: selectedProduct.quantity,
                    price: product.price,
                    unitCost: product.costPrice,
                    lineTotal: arredondarMoeda(product.price * selectedProduct.quantity),
                    productNameSnapshot: product.name,
                });
            }
            if (product.trackInventory) {
                const previousQuantity = product.stockQuantity;
                const currentQuantity = previousQuantity - selectedProduct.quantity;
                await tx
                    .update(productsTable)
                    .set({
                    stockQuantity: currentQuantity,
                    updatedAt: new Date(),
                })
                    .where(eq(productsTable.id, product.id));
                await tx.insert(stockMovementsTable).values({
                    restaurantId: order.restaurantId,
                    productId: product.id,
                    orderId: order.id,
                    type: "OUT",
                    quantityDelta: -selectedProduct.quantity,
                    previousQuantity,
                    currentQuantity,
                    reason: `Lancamento na comanda ${table?.name ?? "mesa"} do pedido #${String(order.id)}`,
                });
            }
        }
        const updatedOrderProducts = await tx
            .select()
            .from(orderProductsTable)
            .where(eq(orderProductsTable.orderId, order.id));
        const subtotal = arredondarMoeda(updatedOrderProducts.reduce((accumulator, item) => {
            return accumulator + item.lineTotal;
        }, 0));
        const estimatedCost = arredondarMoeda(updatedOrderProducts.reduce((accumulator, item) => {
            return accumulator + item.unitCost * item.quantity;
        }, 0));
        const total = arredondarMoeda(subtotal + order.deliveryFee - order.discountAmount);
        const estimatedProfit = arredondarMoeda(total - estimatedCost);
        await tx
            .update(ordersTable)
            .set({
            subtotal,
            total,
            estimatedCost,
            estimatedProfit,
            updatedAt: new Date(),
        })
            .where(eq(ordersTable.id, order.id));
        return {
            orderId: order.id,
            hadItemsBefore: currentOrderProducts.length > 0,
        };
    });
    const updatedOrder = await buscarPedidoRecebimentoPorId(result.orderId);
    if (!updatedOrder) {
        throw new Error("Nao foi possivel carregar a comanda atualizada.");
    }
    return updatedOrder;
};
export const fecharComanda = async ({ orderId, paymentMethod, }) => {
    const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId))
        .limit(1);
    if (!order) {
        throw new Error("Comanda nao encontrada.");
    }
    if (order.consumptionMethod !== "DINE_IN") {
        throw new Error("Este pedido nao pertence a uma mesa.");
    }
    if (!pedidoEstaAtivo(order.status)) {
        throw new Error("A comanda selecionada ja foi encerrada.");
    }
    await db
        .update(ordersTable)
        .set({
        paymentMethod,
        updatedAt: new Date(),
    })
        .where(eq(ordersTable.id, orderId));
    await atualizarStatusPagamentoPedido({
        orderId,
        paymentStatus: "PAID",
    });
    await atualizarStatusPedido({
        orderId,
        status: "FINISHED",
    });
    const updatedOrder = await buscarPedidoRecebimentoPorId(orderId);
    if (!updatedOrder) {
        throw new Error("Nao foi possivel carregar a comanda encerrada.");
    }
    return updatedOrder;
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
                    reason: `Reposicao por cancelamento do pedido #${String(orderId)}`,
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
    const result = await db.transaction(async (tx) => {
        const [existingOrder] = await tx
            .select({
            id: ordersTable.id,
            restaurantId: ordersTable.restaurantId,
            customerPhone: ordersTable.customerPhone,
            paymentStatus: ordersTable.paymentStatus,
            cashbackEarnedAmount: ordersTable.cashbackEarnedAmount,
            cashbackCreditedAt: ordersTable.cashbackCreditedAt,
        })
            .from(ordersTable)
            .where(eq(ordersTable.id, orderId))
            .limit(1);
        if (!existingOrder) {
            return null;
        }
        const now = new Date();
        const [updatedOrder] = await tx
            .update(ordersTable)
            .set({
            paymentStatus,
            paidAt: paymentStatus === "PAID" ? now : null,
            updatedAt: now,
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
        const shouldCreditCashback = paymentStatus === "PAID" &&
            existingOrder.paymentStatus !== "PAID" &&
            existingOrder.cashbackEarnedAmount > 0 &&
            existingOrder.cashbackCreditedAt === null &&
            isTelefoneElegivelParaCarteira(existingOrder.customerPhone);
        if (shouldCreditCashback) {
            const [wallet] = await tx
                .select()
                .from(walletsTable)
                .where(and(eq(walletsTable.restaurantId, existingOrder.restaurantId), eq(walletsTable.customerPhone, existingOrder.customerPhone)))
                .limit(1);
            if (wallet) {
                await tx
                    .update(walletsTable)
                    .set({
                    balance: arredondarMoeda(wallet.balance + existingOrder.cashbackEarnedAmount),
                    totalEarned: arredondarMoeda(wallet.totalEarned + existingOrder.cashbackEarnedAmount),
                    lastCreditAt: now,
                    updatedAt: now,
                })
                    .where(eq(walletsTable.id, wallet.id));
            }
            else {
                await tx.insert(walletsTable).values({
                    restaurantId: existingOrder.restaurantId,
                    customerPhone: existingOrder.customerPhone,
                    balance: existingOrder.cashbackEarnedAmount,
                    totalEarned: existingOrder.cashbackEarnedAmount,
                    totalRedeemed: 0,
                    lastCreditAt: now,
                });
            }
            await tx
                .update(ordersTable)
                .set({
                cashbackCreditedAt: now,
                updatedAt: now,
            })
                .where(eq(ordersTable.id, orderId));
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
        paymentStatus: result.paymentStatus,
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
        diningTable: {
            id: diningTablesTable.id,
            name: diningTablesTable.name,
            seats: diningTablesTable.seats,
        },
    })
        .from(ordersTable)
        .innerJoin(restaurantsTable, eq(restaurantsTable.id, ordersTable.restaurantId))
        .leftJoin(diningTablesTable, eq(diningTablesTable.id, ordersTable.diningTableId))
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
        diningTable: pedido.diningTable ? pedido.diningTable : null,
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
    return pedidosDetalhados.filter((pedido) => pedido !== null &&
        !(pedido.consumptionMethod === "DINE_IN" &&
            pedido.orderProducts.length === 0 &&
            pedidoEstaAtivo(pedido.status)));
};
