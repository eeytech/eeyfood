import { relations } from "drizzle-orm";
import { boolean, date, doublePrecision, integer, pgEnum, pgTable, serial, text, timestamp, uuid, } from "drizzle-orm/pg-core";
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
export const ordersTable = pgTable("Order", {
    id: serial("id").primaryKey(),
    subtotal: doublePrecision("subtotal").default(0).notNull(),
    discountAmount: doublePrecision("discountAmount").default(0).notNull(),
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
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    customerName: text("customerName").notNull(),
    customerPhone: text("customerPhone").notNull(),
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
    products: many(productsTable),
    orders: many(ordersTable),
    stockMovements: many(stockMovementsTable),
    financialClosings: many(financialClosingsTable),
}));
export const menuCategoriesRelations = relations(menuCategoriesTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [menuCategoriesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    products: many(productsTable),
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
export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [ordersTable.restaurantId],
        references: [restaurantsTable.id],
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
