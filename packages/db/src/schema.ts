import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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

export const transactionTypeEnum = pgEnum("TransactionType", [
  "REVENUE",
  "EXPENSE",
]);

export const transactionStatusEnum = pgEnum("TransactionStatus", [
  "PENDING",
  "PAID",
  "CANCELLED",
]);

export const restaurantStatusEnum = pgEnum("RestaurantStatus", [
  "AUTO",
  "ALWAYS_OPEN",
  "ALWAYS_CLOSED",
]);

export const vehicleStatusEnum = pgEnum("VehicleStatus", [
  "ACTIVE",
  "MAINTENANCE",
  "INACTIVE",
]);

export const restaurantsTable = pgTable("Restaurant", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  avatarImageUrl: text("avatarImageUrl").notNull(),
  coverImageUrl: text("coverImageUrl").notNull(),
  status: restaurantStatusEnum("status").default("AUTO").notNull(),
  cashbackPercent: doublePrecision("cashbackPercent").default(0).notNull(),
  acceptMercadoPago: boolean("acceptMercadoPago").default(true).notNull(),
  isCouponsEnabled: boolean("isCouponsEnabled").default(true).notNull(),
  isCashbackEnabled: boolean("isCashbackEnabled").default(true).notNull(),
  showOptionImages: boolean("showOptionImages").default(true).notNull(),
  isDeliveryEnabled: boolean("isDeliveryEnabled").default(true).notNull(),
  isTakeawayEnabled: boolean("isTakeawayEnabled").default(true).notNull(),
  isDineInEnabled: boolean("isDineInEnabled").default(true).notNull(),
  cnpj: text("cnpj"),
  phone: text("phone"),
  address: text("address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  deliveryFee: doublePrecision("deliveryFee").default(0).notNull(),
  minimumOrderValue: doublePrecision("minimumOrderValue").default(0).notNull(),
  freeDeliveryThreshold: doublePrecision("freeDeliveryThreshold"),
  estimatedDeliveryTime: text("estimatedDeliveryTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const operatingHoursTable = pgTable("OperatingHours", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurantId")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  dayOfWeek: integer("dayOfWeek").notNull(), // 0-6 (Sunday-Saturday)
  openTime: text("openTime").notNull(), // "HH:mm"
  closeTime: text("closeTime").notNull(), // "HH:mm"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  restaurantDayUniqueIndex: uniqueIndex("operating_hours_restaurant_day_unique").on(
    table.restaurantId,
    table.dayOfWeek,
  ),
}));

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
  // Campos Fiscais
  ncm: text("ncm"),
  cfop: text("cfop"),
  csosn: text("csosn"),
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

export const financialCategoriesTable = pgTable("FinancialCategory", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: transactionTypeEnum("type").notNull(),
  restaurantId: uuid("restaurantId")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const aiSettingsTable = pgTable("AiSettings", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurantId")
    .notNull()
    .unique()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  openaiApiKey: text("openaiApiKey"),
  evolutionInstanceName: text("evolutionInstanceName"),
  evolutionApiKey: text("evolutionApiKey"),
  botName: text("botName").default("EeyFood Bot").notNull(),
  systemPrompt: text("systemPrompt").default(
    "Você é um atendente virtual de delivery educado e eficiente. Ajude o cliente a escolher itens do cardápio e finalize o pedido capturando nome, telefone e itens."
  ),
  isBotActive: boolean("isBotActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const financialTransactionsTable = pgTable("FinancialTransaction", {
  id: uuid("id").defaultRandom().primaryKey(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").default("PENDING").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidAt: timestamp("paidAt"),
  categoryId: uuid("categoryId").references(() => financialCategoriesTable.id, {
    onDelete: "set null",
  }),
  orderId: integer("orderId").references(() => ordersTable.id, {
    onDelete: "set null",
  }),
  restaurantId: uuid("restaurantId")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const couponsTable = pgTable(

  "Coupon",
  {
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
  },
  (table) => ({
    restaurantCodeUniqueIndex: uniqueIndex("coupon_restaurant_code_unique").on(
      table.restaurantId,
      table.code,
    ),
  }),
);

export const walletsTable = pgTable(
  "Wallet",
  {
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
  },
  (table) => ({
    restaurantPhoneUniqueIndex: uniqueIndex("wallet_restaurant_phone_unique").on(
      table.restaurantId,
      table.customerPhone,
    ),
  }),
);

export const loyaltyRulesTable = pgTable("LoyaltyRule", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurantId")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  minOrderValue: doublePrecision("minOrderValue").default(0).notNull(),
  cashbackPercent: doublePrecision("cashbackPercent").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  menuCategoryId: uuid("menuCategoryId").references(() => menuCategoriesTable.id, { onDelete: "cascade" }),
  productId: uuid("productId").references(() => productsTable.id, { onDelete: "cascade" }),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const abandonedCartsTable = pgTable(
  "AbandonedCart",
  {
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
      .$type<
        Array<{
          productId: string;
          name: string;
          quantity: number;
          unitPrice: number;
          lineTotal: number;
        }>
      >()
      .notNull(),
    convertedOrderId: integer("convertedOrderId").references(() => ordersTable.id, {
      onDelete: "set null",
    }),
    convertedAt: timestamp("convertedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    restaurantSessionUniqueIndex: uniqueIndex(
      "abandoned_cart_restaurant_session_unique",
    ).on(table.restaurantId, table.sessionId),
  }),
);

export const couriersTable = pgTable("Courier", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  vehicleType: text("vehicleType"),
  licensePlate: text("licensePlate"),
  cpf: text("cpf"),
  rg: text("rg"),
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  cnhNumero: text("cnhNumero"),
  cnhCategoria: text("cnhCategoria"),
  cnhVencimento: date("cnhVencimento"),
  usesOwnVehicle: boolean("usesOwnVehicle").default(true),
  workDays: text("workDays").array(),
  shiftStart: text("shiftStart"),
  shiftEnd: text("shiftEnd"),
  isAvailable: boolean("isAvailable").default(false).notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  isActive: boolean("isActive").default(true).notNull(),
  restaurantId: uuid("restaurantId")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const companyVehiclesTable = pgTable("CompanyVehicle", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurantId")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  color: text("color"),
  licensePlate: text("licensePlate").notNull(),
  renavam: text("renavam"),
  chassi: text("chassi"),
  status: vehicleStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

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
  courierId: uuid("courierId").references(() => couriersTable.id, {
    onDelete: "set null",
  }),
  customerName: text("customerName").notNull(),
  customerPhone: text("customerPhone").notNull(),
  deliveryAddress: text("deliveryAddress"),
  deliveryLatitude: doublePrecision("deliveryLatitude"),
  deliveryLongitude: doublePrecision("deliveryLongitude"),
  scheduledFor: timestamp("scheduledFor"),
  cashbackCreditedAt: timestamp("cashbackCreditedAt"),
  paidAt: timestamp("paidAt"),
  dispatchedAt: timestamp("dispatchedAt"),
  deliveredAt: timestamp("deliveredAt"),
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
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const productOptionGroupsTable = pgTable("ProductOptionGroup", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  minOptions: integer("minOptions").default(0).notNull(),
  maxOptions: integer("maxOptions").default(1).notNull(),
  displayOrder: integer("displayOrder").default(0).notNull(),
  productId: uuid("productId")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const productOptionsTable = pgTable("ProductOption", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  price: doublePrecision("price").default(0).notNull(),
  displayOrder: integer("displayOrder").default(0).notNull(),
  productOptionGroupId: uuid("productOptionGroupId")
    .notNull()
    .references(() => productOptionGroupsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const orderProductOptionsTable = pgTable("OrderProductOption", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderProductId: uuid("orderProductId")
    .notNull()
    .references(() => orderProductsTable.id, { onDelete: "cascade" }),
  productOptionId: uuid("productOptionId")
    .notNull()
    .references(() => productOptionsTable.id, { onDelete: "set null" }),
  nameSnapshot: text("nameSnapshot").notNull(),
  priceSnapshot: doublePrecision("priceSnapshot").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const orderRatingsTable = pgTable("OrderRating", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: integer("orderId")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  restaurantId: uuid("restaurantId")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  customerName: text("customerName").notNull(),
  stars: integer("stars").notNull(),
  comment: text("comment"),
  imageUrl: text("imageUrl"),
  isActive: boolean("isActive").default(true).notNull(),
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

export const restaurantsRelations = relations(
  restaurantsTable,
  ({ one, many }) => ({

  menuCategories: many(menuCategoriesTable),
  operatingHours: many(operatingHoursTable),
  diningTables: many(diningTablesTable),
  products: many(productsTable),
  coupons: many(couponsTable),
  abandonedCarts: many(abandonedCartsTable),
  orders: many(ordersTable),
  stockMovements: many(stockMovementsTable),
  wallets: many(walletsTable),
  financialClosings: many(financialClosingsTable),
  couriers: many(couriersTable),
  companyVehicles: many(companyVehiclesTable),
  financialCategories: many(financialCategoriesTable),
  financialTransactions: many(financialTransactionsTable),
  aiSettings: one(aiSettingsTable),
  ratings: many(orderRatingsTable),
}));

export const orderRatingsRelations = relations(
  orderRatingsTable,
  ({ one }) => ({
    order: one(ordersTable, {
      fields: [orderRatingsTable.orderId],
      references: [ordersTable.id],
    }),
    restaurant: one(restaurantsTable, {
      fields: [orderRatingsTable.restaurantId],
      references: [restaurantsTable.id],
    }),
  }),
);

export const operatingHoursRelations = relations(
  operatingHoursTable,
  ({ one }) => ({
    restaurant: one(restaurantsTable, {
      fields: [operatingHoursTable.restaurantId],
      references: [restaurantsTable.id],
    }),
  }),
);

export const aiSettingsRelations = relations(aiSettingsTable, ({ one }) => ({
  restaurant: one(restaurantsTable, {
    fields: [aiSettingsTable.restaurantId],
    references: [restaurantsTable.id],
  }),
}));

export const financialCategoriesRelations = relations(

  financialCategoriesTable,
  ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
      fields: [financialCategoriesTable.restaurantId],
      references: [restaurantsTable.id],
    }),
    transactions: many(financialTransactionsTable),
  }),
);

export const financialTransactionsRelations = relations(
  financialTransactionsTable,
  ({ one }) => ({
    restaurant: one(restaurantsTable, {
      fields: [financialTransactionsTable.restaurantId],
      references: [restaurantsTable.id],
    }),
    category: one(financialCategoriesTable, {
      fields: [financialTransactionsTable.categoryId],
      references: [financialCategoriesTable.id],
    }),
    order: one(ordersTable, {
      fields: [financialTransactionsTable.orderId],
      references: [ordersTable.id],
    }),
  }),
);

export const couriersRelations = relations(couriersTable, ({ one, many }) => ({
  restaurant: one(restaurantsTable, {
    fields: [couriersTable.restaurantId],
    references: [restaurantsTable.id],
  }),
  orders: many(ordersTable),
}));

export const menuCategoriesRelations = relations(
  menuCategoriesTable,
  ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
      fields: [menuCategoriesTable.restaurantId],
      references: [restaurantsTable.id],
    }),
    products: many(productsTable),
  }),
);

export const diningTablesRelations = relations(
  diningTablesTable,
  ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
      fields: [diningTablesTable.restaurantId],
      references: [restaurantsTable.id],
    }),
    orders: many(ordersTable),
  }),
);

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
  optionGroups: many(productOptionGroupsTable),
}));

export const productOptionGroupsRelations = relations(
  productOptionGroupsTable,
  ({ one, many }) => ({
    product: one(productsTable, {
      fields: [productOptionGroupsTable.productId],
      references: [productsTable.id],
    }),
    options: many(productOptionsTable),
  }),
);

export const productOptionsRelations = relations(
  productOptionsTable,
  ({ one }) => ({
    group: one(productOptionGroupsTable, {
      fields: [productOptionsTable.productOptionGroupId],
      references: [productOptionGroupsTable.id],
    }),
  }),
);

export const couponsRelations = relations(couponsTable, ({ one, many }) => ({
  restaurant: one(restaurantsTable, {
    fields: [couponsTable.restaurantId],
    references: [restaurantsTable.id],
  }),
  orders: many(ordersTable),
}));

export const loyaltyRulesRelations = relations(
  loyaltyRulesTable,
  ({ one }) => ({
    restaurant: one(restaurantsTable, {
      fields: [loyaltyRulesTable.restaurantId],
      references: [restaurantsTable.id],
    }),
    menuCategory: one(menuCategoriesTable, {
      fields: [loyaltyRulesTable.menuCategoryId],
      references: [menuCategoriesTable.id],
    }),
    product: one(productsTable, {
      fields: [loyaltyRulesTable.productId],
      references: [productsTable.id],
    }),
  }),
);

export const walletsRelations = relations(walletsTable, ({ one }) => ({
  restaurant: one(restaurantsTable, {
    fields: [walletsTable.restaurantId],
    references: [restaurantsTable.id],
  }),
}));

export const abandonedCartsRelations = relations(
  abandonedCartsTable,
  ({ one }) => ({
    restaurant: one(restaurantsTable, {
      fields: [abandonedCartsTable.restaurantId],
      references: [restaurantsTable.id],
    }),
    convertedOrder: one(ordersTable, {
      fields: [abandonedCartsTable.convertedOrderId],
      references: [ordersTable.id],
    }),
  }),
);

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  restaurant: one(restaurantsTable, {
    fields: [ordersTable.restaurantId],
    references: [restaurantsTable.id],
  }),
  diningTable: one(diningTablesTable, {
    fields: [ordersTable.diningTableId],
    references: [diningTablesTable.id],
  }),
  courier: one(couriersTable, {
    fields: [ordersTable.courierId],
    references: [couriersTable.id],
  }),
  coupon: one(couponsTable, {
    fields: [ordersTable.couponId],
    references: [couponsTable.id],
  }),
  orderProducts: many(orderProductsTable),
  stockMovements: many(stockMovementsTable),
}));

export const orderProductsRelations = relations(
  orderProductsTable,
  ({ one, many }) => ({
    product: one(productsTable, {
      fields: [orderProductsTable.productId],
      references: [productsTable.id],
    }),
    order: one(ordersTable, {
      fields: [orderProductsTable.orderId],
      references: [ordersTable.id],
    }),
    orderProductOptions: many(orderProductOptionsTable),
  }),
);

export const orderProductOptionsRelations = relations(
  orderProductOptionsTable,
  ({ one }) => ({
    orderProduct: one(orderProductsTable, {
      fields: [orderProductOptionsTable.orderProductId],
      references: [orderProductsTable.id],
    }),
    productOption: one(productOptionsTable, {
      fields: [orderProductOptionsTable.productOptionId],
      references: [productOptionsTable.id],
    }),
  }),
);

export const stockMovementsRelations = relations(
  stockMovementsTable,
  ({ one }) => ({
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
  }),
);

export const financialClosingsRelations = relations(
  financialClosingsTable,
  ({ one }) => ({
    restaurant: one(restaurantsTable, {
      fields: [financialClosingsTable.restaurantId],
      references: [restaurantsTable.id],
    }),
  }),
);

export const companyVehiclesRelations = relations(companyVehiclesTable, ({ one }) => ({
  restaurant: one(restaurantsTable, {
    fields: [companyVehiclesTable.restaurantId],
    references: [restaurantsTable.id],
  }),
}));
