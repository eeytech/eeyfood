import { relations } from "drizzle-orm";
import { boolean, date, doublePrecision, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid, } from "drizzle-orm/pg-core";
export const orderStatusEnum = pgEnum("OrderStatus", [
    "PENDING",
    "IN_PREPARATION",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "FINISHED",
    "CANCELLED",
]);
export const paymentStatusEnum = pgEnum("PaymentStatus", [
    "PENDING",
    "PAID",
    "FAILED",
    "REFUNDED",
    "CANCELLED",
]);
export const consumptionMethodEnum = pgEnum("ConsumptionMethod", [
    "TAKEAWAY",
    "DINE_IN",
    "DELIVERY",
]);
export const paymentMethodEnum = pgEnum("PaymentMethod", [
    "MERCADO_PAGO",
    "DINHEIRO",
    "CARTAO_PRESENCIAL",
]);
export const couponDiscountTypeEnum = pgEnum("CouponDiscountType", [
    "PERCENTAGE",
    "FIXED",
]);
export const abandonedCartStatusEnum = pgEnum("AbandonedCartStatus", [
    "ACTIVE",
    "CONVERTED",
]);
export const stockMovementTypeEnum = pgEnum("StockMovementType", [
    "IN",
    "OUT",
    "ADJUSTMENT",
]);
export const restaurantsTable = pgTable("Restaurant", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    avatarImageUrl: text("avatarImageUrl").notNull(),
    coverImageUrl: text("coverImageUrl").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const menuCategoriesTable = pgTable("MenuCategory", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    imageUrl: text("imageUrl"),
    displayOrder: integer("displayOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const diningTablesTable = pgTable("DiningTable", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    seats: integer("seats").default(4).notNull(),
    displayOrder: integer("displayOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const productsTable = pgTable("Product", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    price: doublePrecision("price").notNull(),
    costPrice: doublePrecision("costPrice").default(0).notNull(),
    imageUrl: text("imageUrl").notNull(),
    ingredients: text("ingredients").array().notNull(),
    sku: text("sku"),
    trackInventory: boolean("trackInventory").default(false).notNull(),
    stockQuantity: integer("stockQuantity").default(0).notNull(),
    lowStockThreshold: integer("lowStockThreshold").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    menuCategoryId: uuid("menuCategoryId")
        .notNull()
        .references(() => menuCategoriesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const couponsTable = pgTable("Coupon", {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    discountType: couponDiscountTypeEnum("discountType").notNull(),
    discountValue: doublePrecision("discountValue").notNull(),
    minimumOrderValue: doublePrecision("minimumOrderValue").default(0).notNull(),
    maxDiscountAmount: doublePrecision("maxDiscountAmount"),
    usageLimit: integer("usageLimit"),
    usageCount: integer("usageCount").default(0).notNull(),
    perCustomerLimit: integer("perCustomerLimit").default(1).notNull(),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
    restaurantCodeUniqueIndex: uniqueIndex("coupon_restaurant_code_unique").on(table.restaurantId, table.code),
}));
export const walletsTable = pgTable("Wallet", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    customerPhone: text("customerPhone").notNull(),
    balance: doublePrecision("balance").default(0).notNull(),
    totalEarned: doublePrecision("totalEarned").default(0).notNull(),
    totalRedeemed: doublePrecision("totalRedeemed").default(0).notNull(),
    lastCreditAt: timestamp("lastCreditAt"),
    lastRedeemAt: timestamp("lastRedeemAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
    restaurantPhoneUniqueIndex: uniqueIndex("wallet_restaurant_phone_unique").on(table.restaurantId, table.customerPhone),
}));
export const abandonedCartsTable = pgTable("AbandonedCart", {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: text("sessionId").notNull(),
    status: abandonedCartStatusEnum("status").default("ACTIVE").notNull(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    customerName: text("customerName"),
    customerPhone: text("customerPhone"),
    consumptionMethod: consumptionMethodEnum("consumptionMethod").notNull(),
    paymentMethod: paymentMethodEnum("paymentMethod"),
    couponCode: text("couponCode"),
    useWalletBalance: boolean("useWalletBalance").default(false).notNull(),
    scheduledFor: timestamp("scheduledFor"),
    subtotal: doublePrecision("subtotal").default(0).notNull(),
    total: doublePrecision("total").default(0).notNull(),
    itemCount: integer("itemCount").default(0).notNull(),
    cartSnapshot: jsonb("cartSnapshot")
        .$type()
        .notNull(),
    convertedOrderId: integer("convertedOrderId").references(() => ordersTable.id, {
        onDelete: "set null",
    }),
    convertedAt: timestamp("convertedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
    restaurantSessionUniqueIndex: uniqueIndex("abandoned_cart_restaurant_session_unique").on(table.restaurantId, table.sessionId),
}));
export const ordersTable = pgTable("Order", {
    id: serial("id").primaryKey(),
    subtotal: doublePrecision("subtotal").default(0).notNull(),
    discountAmount: doublePrecision("discountAmount").default(0).notNull(),
    couponDiscountAmount: doublePrecision("couponDiscountAmount").default(0).notNull(),
    cashbackRedeemedAmount: doublePrecision("cashbackRedeemedAmount")
        .default(0)
        .notNull(),
    cashbackEarnedAmount: doublePrecision("cashbackEarnedAmount").default(0).notNull(),
    deliveryFee: doublePrecision("deliveryFee").default(0).notNull(),
    total: doublePrecision("total").notNull(),
    estimatedCost: doublePrecision("estimatedCost").default(0).notNull(),
    estimatedProfit: doublePrecision("estimatedProfit").default(0).notNull(),
    status: orderStatusEnum("status").notNull(),
    paymentStatus: paymentStatusEnum("paymentStatus").default("PENDING").notNull(),
    consumptionMethod: consumptionMethodEnum("consumptionMethod").notNull(),
    paymentMethod: paymentMethodEnum("paymentMethod").notNull(),
    changeFor: doublePrecision("changeFor"),
    notes: text("notes"),
    couponId: uuid("couponId").references(() => couponsTable.id, {
        onDelete: "set null",
    }),
    couponCode: text("couponCode"),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    diningTableId: uuid("diningTableId").references(() => diningTablesTable.id, {
        onDelete: "set null",
    }),
    customerName: text("customerName").notNull(),
    customerPhone: text("customerPhone").notNull(),
    scheduledFor: timestamp("scheduledFor"),
    cashbackCreditedAt: timestamp("cashbackCreditedAt"),
    paidAt: timestamp("paidAt"),
    cancelledAt: timestamp("cancelledAt"),
    finishedAt: timestamp("finishedAt"),
    closedAt: timestamp("closedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const orderProductsTable = pgTable("OrderProduct", {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId")
        .notNull()
        .references(() => productsTable.id, { onDelete: "cascade" }),
    orderId: integer("orderId")
        .notNull()
        .references(() => ordersTable.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    price: doublePrecision("price").notNull(),
    unitCost: doublePrecision("unitCost").default(0).notNull(),
    lineTotal: doublePrecision("lineTotal").default(0).notNull(),
    productNameSnapshot: text("productNameSnapshot").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const stockMovementsTable = pgTable("StockMovement", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    productId: uuid("productId")
        .notNull()
        .references(() => productsTable.id, { onDelete: "cascade" }),
    orderId: integer("orderId").references(() => ordersTable.id, {
        onDelete: "set null",
    }),
    type: stockMovementTypeEnum("type").notNull(),
    quantityDelta: integer("quantityDelta").notNull(),
    previousQuantity: integer("previousQuantity").notNull(),
    currentQuantity: integer("currentQuantity").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const financialClosingsTable = pgTable("FinancialClosing", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    referenceDate: date("referenceDate").notNull(),
    grossRevenue: doublePrecision("grossRevenue").default(0).notNull(),
    estimatedCost: doublePrecision("estimatedCost").default(0).notNull(),
    estimatedProfit: doublePrecision("estimatedProfit").default(0).notNull(),
    totalOrders: integer("totalOrders").default(0).notNull(),
    closedAt: timestamp("closedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const restaurantsRelations = relations(restaurantsTable, ({ many }) => ({
    menuCategories: many(menuCategoriesTable),
    diningTables: many(diningTablesTable),
    products: many(productsTable),
    coupons: many(couponsTable),
    abandonedCarts: many(abandonedCartsTable),
    orders: many(ordersTable),
    stockMovements: many(stockMovementsTable),
    wallets: many(walletsTable),
    financialClosings: many(financialClosingsTable),
}));
export const menuCategoriesRelations = relations(menuCategoriesTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [menuCategoriesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    products: many(productsTable),
}));
export const diningTablesRelations = relations(diningTablesTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [diningTablesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    orders: many(ordersTable),
}));
export const productsRelations = relations(productsTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [productsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    menuCategory: one(menuCategoriesTable, {
        fields: [productsTable.menuCategoryId],
        references: [menuCategoriesTable.id],
    }),
    orderProducts: many(orderProductsTable),
    stockMovements: many(stockMovementsTable),
}));
export const couponsRelations = relations(couponsTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [couponsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    orders: many(ordersTable),
}));
export const walletsRelations = relations(walletsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [walletsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const abandonedCartsRelations = relations(abandonedCartsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [abandonedCartsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    convertedOrder: one(ordersTable, {
        fields: [abandonedCartsTable.convertedOrderId],
        references: [ordersTable.id],
    }),
}));
export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [ordersTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    diningTable: one(diningTablesTable, {
        fields: [ordersTable.diningTableId],
        references: [diningTablesTable.id],
    }),
    coupon: one(couponsTable, {
        fields: [ordersTable.couponId],
        references: [couponsTable.id],
    }),
    orderProducts: many(orderProductsTable),
    stockMovements: many(stockMovementsTable),
}));
export const orderProductsRelations = relations(orderProductsTable, ({ one }) => ({
    product: one(productsTable, {
        fields: [orderProductsTable.productId],
        references: [productsTable.id],
    }),
    order: one(ordersTable, {
        fields: [orderProductsTable.orderId],
        references: [ordersTable.id],
    }),
}));
export const stockMovementsRelations = relations(stockMovementsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [stockMovementsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    product: one(productsTable, {
        fields: [stockMovementsTable.productId],
        references: [productsTable.id],
    }),
    order: one(ordersTable, {
        fields: [stockMovementsTable.orderId],
        references: [ordersTable.id],
    }),
}));
export const financialClosingsRelations = relations(financialClosingsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [financialClosingsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
