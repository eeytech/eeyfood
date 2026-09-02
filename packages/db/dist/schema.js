import { relations } from "drizzle-orm";
import { boolean, date, doublePrecision, integer, jsonb, numeric, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid, } from "drizzle-orm/pg-core";
const money = (name) => numeric(name, { precision: 10, scale: 2 }).$type();
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
    "PIX",
    "VALE_ALIMENTACAO",
    "VALE_REFEICAO",
    "FIADO",
]);
export const cashRegisterShiftStatusEnum = pgEnum("CashRegisterShiftStatus", [
    "OPEN",
    "CLOSED",
]);
export const cashMovementTypeEnum = pgEnum("CashMovementType", [
    "SANGRIA",
    "SUPRIMENTO",
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
export const inventoryItemTypeEnum = pgEnum("InventoryItemType", [
    "INSUMO",
    "EMBALAGEM",
    "EQUIPAMENTO",
    "LIMPEZA",
    "OUTROS",
]);
export const inventoryLossReasonEnum = pgEnum("InventoryLossReason", [
    "VENCIDO",
    "DANIFICADO",
    "ESTRAGADO",
    "OUTROS",
]);
export const unitOfMeasureEnum = pgEnum("UnitOfMeasure", [
    "UN",
    "KG",
    "G",
    "L",
    "ML",
    "CX",
    "PCT",
    "M",
]);
export const waiterStatusEnum = pgEnum("WaiterStatus", ["ACTIVE", "INACTIVE"]);
export const reservationStatusEnum = pgEnum("ReservationStatus", [
    "PENDING",
    "CONFIRMED",
    "CANCELLED",
    "FINISHED",
]);
export const queueStatusEnum = pgEnum("QueueStatus", [
    "WAITING",
    "CALLED",
    "SEATED",
    "LEFT",
]);
export const comandaAvulsaStatusEnum = pgEnum("ComandaAvulsaStatus", [
    "ACTIVE",
    "CLOSED",
    "BLOCKED",
]);
export const pizzaPricingRuleEnum = pgEnum("PizzaPricingRule", [
    "MAX",
    "AVERAGE",
]);
export const deliveryFeeRuleTypeEnum = pgEnum("DeliveryFeeRuleType", [
    "RADIUS_KM",
    "NEIGHBORHOOD",
    "CEP_RANGE",
]);
export const marketplaceTypeEnum = pgEnum("MarketplaceType", [
    "IFOOD",
    "RAPPI",
    "NINETY_NINE_FOOD",
]);
export const courierTripStatusEnum = pgEnum("CourierTripStatus", [
    "IN_TRANSIT",
    "COMPLETED",
]);
export const orderProductItemStatusEnum = pgEnum("OrderProductItemStatus", [
    "PENDING",
    "READY",
]);
export const fiscalDocumentStatusEnum = pgEnum("FiscalDocumentStatus", [
    "PENDING",
    "ISSUED",
    "REJECTED",
    "CANCELLED",
]);
export const ledgerEntryTypeEnum = pgEnum("LedgerEntryType", [
    "DEBIT",
    "CREDIT",
]);
export const bankAccountTypeEnum = pgEnum("BankAccountType", [
    "CHECKING",
    "SAVINGS",
    "INTERNAL",
    "DIGITAL",
]);
export const bankStatementEntryStatusEnum = pgEnum("BankStatementEntryStatus", [
    "PENDING",
    "MATCHED",
    "IGNORED",
]);
export const conversationStatusEnum = pgEnum("ConversationStatus", [
    "BOT_ACTIVE",
    "HUMAN_REQUIRED",
]);
export const marketingChannelEnum = pgEnum("MarketingChannel", [
    "META_ADS",
    "GOOGLE_ADS",
    "OTHER",
]);
export const userRoleEnum = pgEnum("UserRole", [
    "SUPER_ADMIN",
    "ADMIN",
    "MANAGER",
    "WAITER",
    "KITCHEN",
]);
export const usersTable = pgTable("User", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("passwordHash").notNull(),
    role: userRoleEnum("role").default("ADMIN").notNull(),
    restaurantId: uuid("restaurantId").references(() => restaurantsTable.id, {
        onDelete: "cascade",
    }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
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
    deliveryFee: money("deliveryFee").default(0).notNull(),
    minimumOrderValue: money("minimumOrderValue").default(0).notNull(),
    freeDeliveryThreshold: money("freeDeliveryThreshold"),
    estimatedDeliveryTime: text("estimatedDeliveryTime"),
    pizzaPricingRule: pizzaPricingRuleEnum("pizzaPricingRule").default("MAX").notNull(),
    // Hardware peripherals (Web Serial / Web USB)
    scaleProtocol: text("scaleProtocol"), // "TOLEDO" | "FILIZOLA" | "ELGIN" | null
    scaleBaudRate: integer("scaleBaudRate").default(9600),
    drawerPulseHex: text("drawerPulseHex"), // hex bytes sent to printer to open drawer
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
    restaurantDayUniqueIndex: uniqueIndex("operating_hours_restaurant_day_unique").on(table.restaurantId, table.dayOfWeek),
}));
export const menuCategoriesTable = pgTable("MenuCategory", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    imageUrl: text("imageUrl"),
    displayOrder: integer("displayOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    isPizzaCategory: boolean("isPizzaCategory").default(false).notNull(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const productionSectorsTable = pgTable("ProductionSector", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#6366f1").notNull(),
    displayOrder: integer("displayOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const diningTablesTable = pgTable("DiningTable", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    seats: integer("seats").default(4).notNull(),
    displayOrder: integer("displayOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    minimumConsumption: money("minimumConsumption").default(0).notNull(),
    positionX: doublePrecision("positionX").default(0).notNull(),
    positionY: doublePrecision("positionY").default(0).notNull(),
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
    price: money("price").notNull(),
    costPrice: money("costPrice").default(0).notNull(),
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
    videoUrl: text("videoUrl"),
    nutritionInfo: jsonb("nutritionInfo").$type(),
    availableFrom: text("availableFrom"),
    availableTo: text("availableTo"),
    isVegan: boolean("isVegan").default(false).notNull(),
    isGlutenFree: boolean("isGlutenFree").default(false).notNull(),
    isLactoseFree: boolean("isLactoseFree").default(false).notNull(),
    isSpicy: boolean("isSpicy").default(false).notNull(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    menuCategoryId: uuid("menuCategoryId")
        .notNull()
        .references(() => menuCategoriesTable.id, { onDelete: "cascade" }),
    productionSectorId: uuid("productionSectorId").references(() => productionSectorsTable.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const productSizePricesTable = pgTable("ProductSizePrice", {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId")
        .notNull()
        .references(() => productsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: money("price").notNull(),
    isDefault: boolean("isDefault").default(false).notNull(),
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
    systemPrompt: text("systemPrompt").default("Você é um atendente virtual de delivery educado e eficiente. Ajude o cliente a escolher itens do cardápio e finalize o pedido capturando nome, telefone e itens."),
    isBotActive: boolean("isBotActive").default(false).notNull(),
    isBotPaused: boolean("isBotPaused").default(false).notNull(),
    pausedAt: timestamp("pausedAt"),
    pausedForPhone: text("pausedForPhone"),
    conversationStatus: conversationStatusEnum("conversationStatus").default("BOT_ACTIVE").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const marketingSpendTable = pgTable("MarketingSpend", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    referenceMonth: date("referenceMonth").notNull(),
    channel: marketingChannelEnum("channel").notNull(),
    amountSpent: money("amountSpent").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const financialTransactionsTable = pgTable("FinancialTransaction", {
    id: uuid("id").defaultRandom().primaryKey(),
    description: text("description").notNull(),
    amount: money("amount").notNull(),
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
    bankAccountId: uuid("bankAccountId").references(() => bankAccountsTable.id, { onDelete: "set null" }),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const couponsTable = pgTable("Coupon", {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    discountType: couponDiscountTypeEnum("discountType").notNull(),
    discountValue: money("discountValue").notNull(),
    minimumOrderValue: money("minimumOrderValue").default(0).notNull(),
    maxDiscountAmount: money("maxDiscountAmount"),
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
    balance: money("balance").default(0).notNull(),
    creditBalance: money("creditBalance").default(0).notNull(),
    points: money("points").default(0).notNull(),
    totalEarned: money("totalEarned").default(0).notNull(),
    totalRedeemed: money("totalRedeemed").default(0).notNull(),
    lastCreditAt: timestamp("lastCreditAt"),
    lastRedeemAt: timestamp("lastRedeemAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
    restaurantPhoneUniqueIndex: uniqueIndex("wallet_restaurant_phone_unique").on(table.restaurantId, table.customerPhone),
}));
export const loyaltyRulesTable = pgTable("LoyaltyRule", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    minOrderValue: money("minOrderValue").default(0).notNull(),
    cashbackPercent: doublePrecision("cashbackPercent").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    menuCategoryId: uuid("menuCategoryId").references(() => menuCategoriesTable.id, { onDelete: "cascade" }),
    productId: uuid("productId").references(() => productsTable.id, { onDelete: "cascade" }),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
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
    subtotal: money("subtotal").default(0).notNull(),
    total: money("total").default(0).notNull(),
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
export const deliveryFeeRulesTable = pgTable("DeliveryFeeRule", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: deliveryFeeRuleTypeEnum("type").notNull(),
    fee: money("fee").notNull(),
    minimumOrderValue: money("minimumOrderValue").default(0).notNull(),
    freeDeliveryThreshold: money("freeDeliveryThreshold"),
    maxDistanceKm: doublePrecision("maxDistanceKm"),
    neighborhood: text("neighborhood"),
    cepFrom: text("cepFrom"),
    cepTo: text("cepTo"),
    isActive: boolean("isActive").default(true).notNull(),
    displayOrder: integer("displayOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const marketplaceIntegrationsTable = pgTable("MarketplaceIntegration", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    type: marketplaceTypeEnum("type").notNull(),
    isActive: boolean("isActive").default(false).notNull(),
    apiToken: text("apiToken"),
    merchantId: text("merchantId"),
    menuMappings: jsonb("menuMappings").$type(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
    restaurantTypeUniqueIndex: uniqueIndex("marketplace_integration_restaurant_type_unique").on(table.restaurantId, table.type),
}));
export const courierTripsTable = pgTable("CourierTrip", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    courierId: uuid("courierId")
        .notNull()
        .references(() => couriersTable.id, { onDelete: "cascade" }),
    orderIds: integer("orderIds").array().notNull(),
    commissionAmount: money("commissionAmount").default(0).notNull(),
    status: courierTripStatusEnum("status").default("IN_TRANSIT").notNull(),
    departedAt: timestamp("departedAt").defaultNow().notNull(),
    returnedAt: timestamp("returnedAt"),
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
    subtotal: money("subtotal").default(0).notNull(),
    discountAmount: money("discountAmount").default(0).notNull(),
    couponDiscountAmount: money("couponDiscountAmount").default(0).notNull(),
    cashbackRedeemedAmount: money("cashbackRedeemedAmount")
        .default(0)
        .notNull(),
    cashbackEarnedAmount: money("cashbackEarnedAmount").default(0).notNull(),
    deliveryFee: money("deliveryFee").default(0).notNull(),
    total: money("total").notNull(),
    estimatedCost: money("estimatedCost").default(0).notNull(),
    estimatedProfit: money("estimatedProfit").default(0).notNull(),
    status: orderStatusEnum("status").notNull(),
    paymentStatus: paymentStatusEnum("paymentStatus").default("PENDING").notNull(),
    consumptionMethod: consumptionMethodEnum("consumptionMethod").notNull(),
    paymentMethod: paymentMethodEnum("paymentMethod").notNull(),
    changeFor: money("changeFor"),
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
    waiterId: uuid("waiterId").references(() => waitersTable.id, {
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
    deliveryProofUrl: text("deliveryProofUrl"),
    deliveryConfirmationLatitude: doublePrecision("deliveryConfirmationLatitude"),
    deliveryConfirmationLongitude: doublePrecision("deliveryConfirmationLongitude"),
    marketplaceOrderId: text("marketplaceOrderId"),
    marketplaceType: marketplaceTypeEnum("marketplaceType"),
    brandName: text("brandName"),
    brandColor: text("brandColor"),
    cashRegisterShiftId: uuid("cashRegisterShiftId").references(() => cashRegisterShiftsTable.id, { onDelete: "set null" }),
    serviceFeePercent: doublePrecision("serviceFeePercent"),
    serviceFeeAmount: money("serviceFeeAmount").default(0).notNull(),
    paymentSplits: jsonb("paymentSplits")
        .$type(),
    customerCpf: text("customerCpf"),
    nfeStatus: fiscalDocumentStatusEnum("nfeStatus"),
    nfeAccessKey: text("nfeAccessKey"),
    nfeDanfeUrl: text("nfeDanfeUrl"),
    nfeRejectionReason: text("nfeRejectionReason"),
    customerLedgerId: uuid("customerLedgerId").references(() => customerLedgersTable.id, { onDelete: "set null" }),
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
    quantity: doublePrecision("quantity").notNull(),
    price: money("price").notNull(),
    unitCost: money("unitCost").default(0).notNull(),
    lineTotal: money("lineTotal").default(0).notNull(),
    productNameSnapshot: text("productNameSnapshot").notNull(),
    notes: text("notes"),
    itemStatus: orderProductItemStatusEnum("itemStatus").default("PENDING").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const productOptionGroupsTable = pgTable("ProductOptionGroup", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    minOptions: integer("minOptions").default(0).notNull(),
    maxOptions: integer("maxOptions").default(1).notNull(),
    displayOrder: integer("displayOrder").default(0).notNull(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    productId: uuid("productId")
        .references(() => productsTable.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const productToOptionGroupsTable = pgTable("ProductToOptionGroup", {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId")
        .notNull()
        .references(() => productsTable.id, { onDelete: "cascade" }),
    productOptionGroupId: uuid("productOptionGroupId")
        .notNull()
        .references(() => productOptionGroupsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
    uniqueProductGroup: uniqueIndex("ProductToOptionGroup_productId_groupId_idx").on(t.productId, t.productOptionGroupId),
}));
export const productOptionsTable = pgTable("ProductOption", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("imageUrl"),
    price: money("price").default(0).notNull(),
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
    priceSnapshot: money("priceSnapshot").notNull(),
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
export const inventoryItemsTable = pgTable("InventoryItem", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: inventoryItemTypeEnum("type").notNull(),
    sku: text("sku"),
    unitOfMeasure: unitOfMeasureEnum("unitOfMeasure").notNull().default("UN"),
    currentQuantity: doublePrecision("currentQuantity").default(0).notNull(),
    lowStockThreshold: doublePrecision("lowStockThreshold").default(0).notNull(),
    unitCost: money("unitCost"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const stockMovementsTable = pgTable("StockMovement", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    productId: uuid("productId").references(() => productsTable.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventoryItemId").references(() => inventoryItemsTable.id, {
        onDelete: "cascade",
    }),
    orderId: integer("orderId").references(() => ordersTable.id, {
        onDelete: "set null",
    }),
    type: stockMovementTypeEnum("type").notNull(),
    quantityDelta: doublePrecision("quantityDelta").notNull(),
    previousQuantity: doublePrecision("previousQuantity").notNull(),
    currentQuantity: doublePrecision("currentQuantity").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const recipeItemsTable = pgTable("RecipeItem", {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId")
        .notNull()
        .references(() => productsTable.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventoryItemId")
        .notNull()
        .references(() => inventoryItemsTable.id, { onDelete: "cascade" }),
    quantityNeeded: doublePrecision("quantityNeeded").notNull(),
    yieldFactor: doublePrecision("yieldFactor").default(1).notNull(),
    preparationMethod: text("preparationMethod"),
    suggestedMargin: doublePrecision("suggestedMargin"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const suppliersTable = pgTable("Supplier", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    companyName: text("companyName").notNull(),
    cnpj: text("cnpj"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const purchaseInvoicesTable = pgTable("PurchaseInvoice", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    supplierId: uuid("supplierId").references(() => suppliersTable.id, { onDelete: "set null" }),
    accessKey: text("accessKey"),
    invoiceNumber: text("invoiceNumber"),
    totalAmount: money("totalAmount").default(0).notNull(),
    xmlContent: text("xmlContent"),
    issuedAt: timestamp("issuedAt"),
    items: jsonb("items").$type(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const inventoryBatchesTable = pgTable("InventoryBatch", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventoryItemId")
        .notNull()
        .references(() => inventoryItemsTable.id, { onDelete: "cascade" }),
    purchaseInvoiceId: uuid("purchaseInvoiceId").references(() => purchaseInvoicesTable.id, { onDelete: "set null" }),
    batchCode: text("batchCode"),
    quantity: doublePrecision("quantity").default(0).notNull(),
    manufacturingDate: date("manufacturingDate"),
    expirationDate: date("expirationDate"),
    unitCost: money("unitCost"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const inventoryLossesTable = pgTable("InventoryLoss", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventoryItemId")
        .notNull()
        .references(() => inventoryItemsTable.id, { onDelete: "cascade" }),
    quantity: doublePrecision("quantity").notNull(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
    reason: inventoryLossReasonEnum("reason").notNull(),
    financialLoss: money("financialLoss").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const financialClosingsTable = pgTable("FinancialClosing", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    referenceDate: date("referenceDate").notNull(),
    grossRevenue: money("grossRevenue").default(0).notNull(),
    estimatedCost: money("estimatedCost").default(0).notNull(),
    estimatedProfit: money("estimatedProfit").default(0).notNull(),
    totalOrders: integer("totalOrders").default(0).notNull(),
    closedAt: timestamp("closedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const cashRegisterShiftsTable = pgTable("CashRegisterShift", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    openedByUser: text("openedByUser").notNull(),
    openedAt: timestamp("openedAt").defaultNow().notNull(),
    closedAt: timestamp("closedAt"),
    openingAmount: money("openingAmount").default(0).notNull(),
    expectedClosingAmount: money("expectedClosingAmount"),
    actualClosingAmount: money("actualClosingAmount"),
    closingDifference: money("closingDifference"),
    status: cashRegisterShiftStatusEnum("status").default("OPEN").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const cashMovementsTable = pgTable("CashMovement", {
    id: uuid("id").defaultRandom().primaryKey(),
    shiftId: uuid("shiftId")
        .notNull()
        .references(() => cashRegisterShiftsTable.id, { onDelete: "cascade" }),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    type: cashMovementTypeEnum("type").notNull(),
    amount: money("amount").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const waitersTable = pgTable("Waiter", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    phone: text("phone"),
    cpf: text("cpf"),
    commissionPercent: doublePrecision("commissionPercent").default(0).notNull(),
    status: waiterStatusEnum("status").default("ACTIVE").notNull(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const commissionRulesTable = pgTable("CommissionRule", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    serviceFeePercent: doublePrecision("serviceFeePercent").default(10).notNull(),
    waiterSharePercent: doublePrecision("waiterSharePercent").default(100).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const tipClosingsTable = pgTable("TipClosing", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    waiterId: uuid("waiterId")
        .notNull()
        .references(() => waitersTable.id, { onDelete: "cascade" }),
    amount: money("amount").notNull(),
    referenceDate: date("referenceDate").notNull(),
    paidAt: timestamp("paidAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const tableReservationsTable = pgTable("TableReservation", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    diningTableId: uuid("diningTableId").references(() => diningTablesTable.id, {
        onDelete: "set null",
    }),
    customerName: text("customerName").notNull(),
    customerPhone: text("customerPhone"),
    partySize: integer("partySize").notNull(),
    scheduledFor: timestamp("scheduledFor").notNull(),
    status: reservationStatusEnum("status").default("PENDING").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const waitingQueueTable = pgTable("WaitingQueue", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    customerName: text("customerName").notNull(),
    partySize: integer("partySize").notNull(),
    arrivedAt: timestamp("arrivedAt").defaultNow().notNull(),
    status: queueStatusEnum("status").default("WAITING").notNull(),
    diningTableId: uuid("diningTableId").references(() => diningTablesTable.id, {
        onDelete: "set null",
    }),
    seatedAt: timestamp("seatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const comandasAvulsasTable = pgTable("ComandaAvulsa", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    numero: integer("numero").notNull(),
    status: comandaAvulsaStatusEnum("status").default("ACTIVE").notNull(),
    customerName: text("customerName"),
    barcode: text("barcode"),
    orderId: integer("orderId").references(() => ordersTable.id, {
        onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
    restaurantNumeroUniqueIndex: uniqueIndex("comanda_avulsa_restaurant_numero_unique").on(table.restaurantId, table.numero),
}));
export const bankAccountsTable = pgTable("BankAccount", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: bankAccountTypeEnum("type").notNull().default("CHECKING"),
    bankName: text("bankName"),
    agency: text("agency"),
    accountNumber: text("accountNumber"),
    currentBalance: money("currentBalance").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const fiscalSettingsTable = pgTable("FiscalSettings", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .unique()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    cnpj: text("cnpj"),
    inscricaoEstadual: text("inscricaoEstadual"),
    ambienteFiscal: text("ambienteFiscal").default("homologacao").notNull(),
    certificadoPfxBase64: text("certificadoPfxBase64"),
    certificadoSenha: text("certificadoSenha"),
    serieNfe: text("serieNfe").default("001").notNull(),
    proximoNumeroNfe: integer("proximoNumeroNfe").default(1).notNull(),
    serieNfce: text("serieNfce").default("001").notNull(),
    proximoNumeroNfce: integer("proximoNumeroNfce").default(1).notNull(),
    focusNfeToken: text("focusNfeToken"),
    webhookUrl: text("webhookUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const customerLedgersTable = pgTable("CustomerLedger", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    customerName: text("customerName").notNull(),
    customerPhone: text("customerPhone"),
    customerCpf: text("customerCpf"),
    creditLimit: money("creditLimit").default(200).notNull(),
    debtBalance: money("debtBalance").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const customerLedgerEntriesTable = pgTable("CustomerLedgerEntry", {
    id: uuid("id").defaultRandom().primaryKey(),
    ledgerId: uuid("ledgerId")
        .notNull()
        .references(() => customerLedgersTable.id, { onDelete: "cascade" }),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    orderId: integer("orderId").references(() => ordersTable.id, {
        onDelete: "set null",
    }),
    bankAccountId: uuid("bankAccountId").references(() => bankAccountsTable.id, {
        onDelete: "set null",
    }),
    type: ledgerEntryTypeEnum("type").notNull(),
    amount: money("amount").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const bankStatementsTable = pgTable("BankStatement", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    bankAccountId: uuid("bankAccountId")
        .notNull()
        .references(() => bankAccountsTable.id, { onDelete: "cascade" }),
    fileName: text("fileName").notNull(),
    periodStart: date("periodStart"),
    periodEnd: date("periodEnd"),
    totalEntries: integer("totalEntries").default(0).notNull(),
    matchedEntries: integer("matchedEntries").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const bankStatementEntriesTable = pgTable("BankStatementEntry", {
    id: uuid("id").defaultRandom().primaryKey(),
    statementId: uuid("statementId")
        .notNull()
        .references(() => bankStatementsTable.id, { onDelete: "cascade" }),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    entryDate: date("entryDate").notNull(),
    description: text("description").notNull(),
    amount: money("amount").notNull(),
    status: bankStatementEntryStatusEnum("status").default("PENDING").notNull(),
    matchedTransactionId: uuid("matchedTransactionId").references(() => financialTransactionsTable.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const productionSectorsRelations = relations(productionSectorsTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [productionSectorsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    products: many(productsTable),
}));
export const restaurantsRelations = relations(restaurantsTable, ({ one, many }) => ({
    menuCategories: many(menuCategoriesTable),
    productionSectors: many(productionSectorsTable),
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
    deliveryFeeRules: many(deliveryFeeRulesTable),
    marketplaceIntegrations: many(marketplaceIntegrationsTable),
    courierTrips: many(courierTripsTable),
    financialCategories: many(financialCategoriesTable),
    financialTransactions: many(financialTransactionsTable),
    aiSettings: one(aiSettingsTable),
    ratings: many(orderRatingsTable),
    cashRegisterShifts: many(cashRegisterShiftsTable),
    waiters: many(waitersTable),
    commissionRules: many(commissionRulesTable),
    tipClosings: many(tipClosingsTable),
    tableReservations: many(tableReservationsTable),
    waitingQueue: many(waitingQueueTable),
    comandasAvulsas: many(comandasAvulsasTable),
    suppliers: many(suppliersTable),
    purchaseInvoices: many(purchaseInvoicesTable),
    inventoryBatches: many(inventoryBatchesTable),
    inventoryLosses: many(inventoryLossesTable),
    bankAccounts: many(bankAccountsTable),
    fiscalSettings: one(fiscalSettingsTable),
    customerLedgers: many(customerLedgersTable),
    bankStatements: many(bankStatementsTable),
    customers: many(customersTable),
    marketingSettings: one(marketingSettingsTable),
    loyaltyPrizes: many(loyaltyPrizesTable),
    marketingSpends: many(marketingSpendTable),
}));
export const orderRatingsRelations = relations(orderRatingsTable, ({ one }) => ({
    order: one(ordersTable, {
        fields: [orderRatingsTable.orderId],
        references: [ordersTable.id],
    }),
    restaurant: one(restaurantsTable, {
        fields: [orderRatingsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const operatingHoursRelations = relations(operatingHoursTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [operatingHoursTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const aiSettingsRelations = relations(aiSettingsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [aiSettingsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const financialCategoriesRelations = relations(financialCategoriesTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [financialCategoriesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    transactions: many(financialTransactionsTable),
}));
export const financialTransactionsRelations = relations(financialTransactionsTable, ({ one }) => ({
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
    bankAccount: one(bankAccountsTable, {
        fields: [financialTransactionsTable.bankAccountId],
        references: [bankAccountsTable.id],
    }),
}));
export const couriersRelations = relations(couriersTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [couriersTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    orders: many(ordersTable),
    trips: many(courierTripsTable),
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
    productionSector: one(productionSectorsTable, {
        fields: [productsTable.productionSectorId],
        references: [productionSectorsTable.id],
    }),
    orderProducts: many(orderProductsTable),
    stockMovements: many(stockMovementsTable),
    optionGroupLinks: many(productToOptionGroupsTable),
    recipeItems: many(recipeItemsTable),
    sizePrices: many(productSizePricesTable),
}));
export const productOptionGroupsRelations = relations(productOptionGroupsTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [productOptionGroupsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    options: many(productOptionsTable),
    productLinks: many(productToOptionGroupsTable),
}));
export const productToOptionGroupsRelations = relations(productToOptionGroupsTable, ({ one }) => ({
    product: one(productsTable, {
        fields: [productToOptionGroupsTable.productId],
        references: [productsTable.id],
    }),
    optionGroup: one(productOptionGroupsTable, {
        fields: [productToOptionGroupsTable.productOptionGroupId],
        references: [productOptionGroupsTable.id],
    }),
}));
export const productOptionsRelations = relations(productOptionsTable, ({ one }) => ({
    group: one(productOptionGroupsTable, {
        fields: [productOptionsTable.productOptionGroupId],
        references: [productOptionGroupsTable.id],
    }),
}));
export const couponsRelations = relations(couponsTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [couponsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    orders: many(ordersTable),
}));
export const loyaltyRulesRelations = relations(loyaltyRulesTable, ({ one }) => ({
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
    courier: one(couriersTable, {
        fields: [ordersTable.courierId],
        references: [couriersTable.id],
    }),
    waiter: one(waitersTable, {
        fields: [ordersTable.waiterId],
        references: [waitersTable.id],
    }),
    coupon: one(couponsTable, {
        fields: [ordersTable.couponId],
        references: [couponsTable.id],
    }),
    cashRegisterShift: one(cashRegisterShiftsTable, {
        fields: [ordersTable.cashRegisterShiftId],
        references: [cashRegisterShiftsTable.id],
    }),
    customerLedger: one(customerLedgersTable, {
        fields: [ordersTable.customerLedgerId],
        references: [customerLedgersTable.id],
    }),
    orderProducts: many(orderProductsTable),
    stockMovements: many(stockMovementsTable),
}));
export const orderProductsRelations = relations(orderProductsTable, ({ one, many }) => ({
    product: one(productsTable, {
        fields: [orderProductsTable.productId],
        references: [productsTable.id],
    }),
    order: one(ordersTable, {
        fields: [orderProductsTable.orderId],
        references: [ordersTable.id],
    }),
    orderProductOptions: many(orderProductOptionsTable),
}));
export const orderProductOptionsRelations = relations(orderProductOptionsTable, ({ one }) => ({
    orderProduct: one(orderProductsTable, {
        fields: [orderProductOptionsTable.orderProductId],
        references: [orderProductsTable.id],
    }),
    productOption: one(productOptionsTable, {
        fields: [orderProductOptionsTable.productOptionId],
        references: [productOptionsTable.id],
    }),
}));
export const inventoryItemsRelations = relations(inventoryItemsTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [inventoryItemsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    stockMovements: many(stockMovementsTable),
    recipeItems: many(recipeItemsTable),
    batches: many(inventoryBatchesTable),
    losses: many(inventoryLossesTable),
}));
export const suppliersRelations = relations(suppliersTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [suppliersTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    purchaseInvoices: many(purchaseInvoicesTable),
}));
export const purchaseInvoicesRelations = relations(purchaseInvoicesTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [purchaseInvoicesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    supplier: one(suppliersTable, {
        fields: [purchaseInvoicesTable.supplierId],
        references: [suppliersTable.id],
    }),
    batches: many(inventoryBatchesTable),
}));
export const inventoryBatchesRelations = relations(inventoryBatchesTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [inventoryBatchesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    inventoryItem: one(inventoryItemsTable, {
        fields: [inventoryBatchesTable.inventoryItemId],
        references: [inventoryItemsTable.id],
    }),
    purchaseInvoice: one(purchaseInvoicesTable, {
        fields: [inventoryBatchesTable.purchaseInvoiceId],
        references: [purchaseInvoicesTable.id],
    }),
}));
export const inventoryLossesRelations = relations(inventoryLossesTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [inventoryLossesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    inventoryItem: one(inventoryItemsTable, {
        fields: [inventoryLossesTable.inventoryItemId],
        references: [inventoryItemsTable.id],
    }),
}));
export const recipeItemsRelations = relations(recipeItemsTable, ({ one }) => ({
    product: one(productsTable, {
        fields: [recipeItemsTable.productId],
        references: [productsTable.id],
    }),
    inventoryItem: one(inventoryItemsTable, {
        fields: [recipeItemsTable.inventoryItemId],
        references: [inventoryItemsTable.id],
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
    inventoryItem: one(inventoryItemsTable, {
        fields: [stockMovementsTable.inventoryItemId],
        references: [inventoryItemsTable.id],
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
export const companyVehiclesRelations = relations(companyVehiclesTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [companyVehiclesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const cashRegisterShiftsRelations = relations(cashRegisterShiftsTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [cashRegisterShiftsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    movements: many(cashMovementsTable),
    orders: many(ordersTable),
}));
export const cashMovementsRelations = relations(cashMovementsTable, ({ one }) => ({
    shift: one(cashRegisterShiftsTable, {
        fields: [cashMovementsTable.shiftId],
        references: [cashRegisterShiftsTable.id],
    }),
    restaurant: one(restaurantsTable, {
        fields: [cashMovementsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const waitersRelations = relations(waitersTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [waitersTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    orders: many(ordersTable),
    tipClosings: many(tipClosingsTable),
}));
export const commissionRulesRelations = relations(commissionRulesTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [commissionRulesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const tipClosingsRelations = relations(tipClosingsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [tipClosingsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    waiter: one(waitersTable, {
        fields: [tipClosingsTable.waiterId],
        references: [waitersTable.id],
    }),
}));
export const tableReservationsRelations = relations(tableReservationsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [tableReservationsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    diningTable: one(diningTablesTable, {
        fields: [tableReservationsTable.diningTableId],
        references: [diningTablesTable.id],
    }),
}));
export const waitingQueueRelations = relations(waitingQueueTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [waitingQueueTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    diningTable: one(diningTablesTable, {
        fields: [waitingQueueTable.diningTableId],
        references: [diningTablesTable.id],
    }),
}));
export const comandasAvulsasRelations = relations(comandasAvulsasTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [comandasAvulsasTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    order: one(ordersTable, {
        fields: [comandasAvulsasTable.orderId],
        references: [ordersTable.id],
    }),
}));
export const productSizePricesRelations = relations(productSizePricesTable, ({ one }) => ({
    product: one(productsTable, {
        fields: [productSizePricesTable.productId],
        references: [productsTable.id],
    }),
}));
export const deliveryFeeRulesRelations = relations(deliveryFeeRulesTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [deliveryFeeRulesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const marketplaceIntegrationsRelations = relations(marketplaceIntegrationsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [marketplaceIntegrationsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const courierTripsRelations = relations(courierTripsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [courierTripsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    courier: one(couriersTable, {
        fields: [courierTripsTable.courierId],
        references: [couriersTable.id],
    }),
}));
export const bankAccountsRelations = relations(bankAccountsTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [bankAccountsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    transactions: many(financialTransactionsTable),
    ledgerEntries: many(customerLedgerEntriesTable),
    statements: many(bankStatementsTable),
}));
export const fiscalSettingsRelations = relations(fiscalSettingsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [fiscalSettingsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const customerLedgersRelations = relations(customerLedgersTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [customerLedgersTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    entries: many(customerLedgerEntriesTable),
    orders: many(ordersTable),
}));
export const customerLedgerEntriesRelations = relations(customerLedgerEntriesTable, ({ one }) => ({
    ledger: one(customerLedgersTable, {
        fields: [customerLedgerEntriesTable.ledgerId],
        references: [customerLedgersTable.id],
    }),
    restaurant: one(restaurantsTable, {
        fields: [customerLedgerEntriesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    order: one(ordersTable, {
        fields: [customerLedgerEntriesTable.orderId],
        references: [ordersTable.id],
    }),
    bankAccount: one(bankAccountsTable, {
        fields: [customerLedgerEntriesTable.bankAccountId],
        references: [bankAccountsTable.id],
    }),
}));
export const bankStatementsRelations = relations(bankStatementsTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [bankStatementsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    bankAccount: one(bankAccountsTable, {
        fields: [bankStatementsTable.bankAccountId],
        references: [bankAccountsTable.id],
    }),
    entries: many(bankStatementEntriesTable),
}));
export const bankStatementEntriesRelations = relations(bankStatementEntriesTable, ({ one }) => ({
    statement: one(bankStatementsTable, {
        fields: [bankStatementEntriesTable.statementId],
        references: [bankStatementsTable.id],
    }),
    restaurant: one(restaurantsTable, {
        fields: [bankStatementEntriesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    matchedTransaction: one(financialTransactionsTable, {
        fields: [bankStatementEntriesTable.matchedTransactionId],
        references: [financialTransactionsTable.id],
    }),
}));
// ─── CRM / Marketing ──────────────────────────────────────────────────────────
export const customerSegmentEnum = pgEnum("CustomerSegment", [
    "NEW",
    "VIP",
    "INACTIVE",
    "AT_RISK",
    "RECOVERED",
]);
export const interactionTypeEnum = pgEnum("CustomerInteractionType", [
    "CART_RECOVERY",
    "CAMPAIGN",
    "BIRTHDAY",
    "MANUAL",
]);
export const customersTable = pgTable("Customer", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone").notNull(),
    cpf: text("cpf"),
    birthDate: date("birthDate"),
    firstOrderAt: timestamp("firstOrderAt"),
    lastOrderAt: timestamp("lastOrderAt"),
    avgTicket: money("avgTicket").default(0).notNull(),
    totalOrders: integer("totalOrders").default(0).notNull(),
    totalSpent: money("totalSpent").default(0).notNull(),
    segment: customerSegmentEnum("segment").default("NEW").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
    restaurantPhoneUniqueIndex: uniqueIndex("customer_restaurant_phone_unique").on(table.restaurantId, table.phone),
}));
export const customerInteractionsTable = pgTable("CustomerInteraction", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    customerId: uuid("customerId")
        .notNull()
        .references(() => customersTable.id, { onDelete: "cascade" }),
    type: interactionTypeEnum("type").notNull(),
    channel: text("channel").default("WHATSAPP").notNull(),
    message: text("message").notNull(),
    sentAt: timestamp("sentAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const marketingSettingsTable = pgTable("MarketingSettings", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .unique()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    metaPixelId: text("metaPixelId"),
    metaCapiToken: text("metaCapiToken"),
    ga4MeasurementId: text("ga4MeasurementId"),
    gtmContainerId: text("gtmContainerId"),
    abandonedCartEnabled: boolean("abandonedCartEnabled").default(true).notNull(),
    abandonedCartDelayMinutes: integer("abandonedCartDelayMinutes").default(120).notNull(),
    abandonedCartCouponPercent: doublePrecision("abandonedCartCouponPercent").default(5).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const loyaltyPrizesTable = pgTable("LoyaltyPrize", {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurantId")
        .notNull()
        .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    pointsRequired: integer("pointsRequired").notNull(),
    stock: integer("stock"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
// ─── CRM relations ────────────────────────────────────────────────────────────
export const customersRelations = relations(customersTable, ({ one, many }) => ({
    restaurant: one(restaurantsTable, {
        fields: [customersTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    interactions: many(customerInteractionsTable),
}));
export const customerInteractionsRelations = relations(customerInteractionsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [customerInteractionsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
    customer: one(customersTable, {
        fields: [customerInteractionsTable.customerId],
        references: [customersTable.id],
    }),
}));
export const marketingSettingsRelations = relations(marketingSettingsTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [marketingSettingsTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const loyaltyPrizesRelations = relations(loyaltyPrizesTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [loyaltyPrizesTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const marketingSpendRelations = relations(marketingSpendTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [marketingSpendTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
export const usersRelations = relations(usersTable, ({ one }) => ({
    restaurant: one(restaurantsTable, {
        fields: [usersTable.restaurantId],
        references: [restaurantsTable.id],
    }),
}));
