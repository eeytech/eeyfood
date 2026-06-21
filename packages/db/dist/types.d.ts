import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { customersTable, customerSegmentEnum, customerInteractionsTable, interactionTypeEnum, marketingSettingsTable, marketingSpendTable, marketingChannelEnum, loyaltyPrizesTable, abandonedCartsTable, abandonedCartStatusEnum, bankAccountsTable, bankAccountTypeEnum, bankStatementsTable, bankStatementEntriesTable, bankStatementEntryStatusEnum, cashMovementsTable, cashMovementTypeEnum, cashRegisterShiftsTable, cashRegisterShiftStatusEnum, companyVehiclesTable, consumptionMethodEnum, couponDiscountTypeEnum, couponsTable, couriersTable, customerLedgersTable, customerLedgerEntriesTable, deliveryFeeRulesTable, deliveryFeeRuleTypeEnum, fiscalDocumentStatusEnum, fiscalSettingsTable, ledgerEntryTypeEnum, marketplaceIntegrationsTable, marketplaceTypeEnum, courierTripsTable, courierTripStatusEnum, diningTablesTable, financialCategoriesTable, financialClosingsTable, financialTransactionsTable, inventoryItemsTable, inventoryItemTypeEnum, inventoryBatchesTable, inventoryLossesTable, inventoryLossReasonEnum, suppliersTable, purchaseInvoicesTable, menuCategoriesTable, orderProductsTable, ordersTable, orderStatusEnum, orderProductItemStatusEnum, paymentMethodEnum, paymentStatusEnum, productsTable, productionSectorsTable, recipeItemsTable, restaurantsTable, restaurantStatusEnum, operatingHoursTable, productOptionGroupsTable, productOptionsTable, productToOptionGroupsTable, orderProductOptionsTable, orderRatingsTable, stockMovementsTable, stockMovementTypeEnum, transactionStatusEnum, transactionTypeEnum, unitOfMeasureEnum, vehicleStatusEnum, walletsTable, loyaltyRulesTable, aiSettingsTable, waitersTable, waiterStatusEnum, commissionRulesTable, tipClosingsTable, tableReservationsTable, reservationStatusEnum, waitingQueueTable, queueStatusEnum, comandasAvulsasTable, comandaAvulsaStatusEnum, productSizePricesTable, pizzaPricingRuleEnum } from "./schema.js";
export type ProductOptionGroup = InferSelectModel<typeof productOptionGroupsTable>;
export type NewProductOptionGroup = InferInsertModel<typeof productOptionGroupsTable>;
export type ProductOption = InferSelectModel<typeof productOptionsTable>;
export type NewProductOption = InferInsertModel<typeof productOptionsTable>;
export type ProductToOptionGroup = InferSelectModel<typeof productToOptionGroupsTable>;
export type NewProductToOptionGroup = InferInsertModel<typeof productToOptionGroupsTable>;
export type OrderProductOption = InferSelectModel<typeof orderProductOptionsTable>;
export type NewOrderProductOption = InferInsertModel<typeof orderProductOptionsTable>;
export type OrderRating = InferSelectModel<typeof orderRatingsTable>;
export type NewOrderRating = InferInsertModel<typeof orderRatingsTable>;
export type AiSettings = InferSelectModel<typeof aiSettingsTable>;
export type NewAiSettings = InferInsertModel<typeof aiSettingsTable>;
export type FinancialCategory = InferSelectModel<typeof financialCategoriesTable>;
export type NewFinancialCategory = InferInsertModel<typeof financialCategoriesTable>;
export type FinancialTransaction = InferSelectModel<typeof financialTransactionsTable>;
export type NewFinancialTransaction = InferInsertModel<typeof financialTransactionsTable>;
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type TransactionStatus = (typeof transactionStatusEnum.enumValues)[number];
export type Restaurant = InferSelectModel<typeof restaurantsTable>;
export type NewRestaurant = InferInsertModel<typeof restaurantsTable>;
export type MenuCategory = InferSelectModel<typeof menuCategoriesTable>;
export type NewMenuCategory = InferInsertModel<typeof menuCategoriesTable>;
export type DiningTable = InferSelectModel<typeof diningTablesTable>;
export type NewDiningTable = InferInsertModel<typeof diningTablesTable>;
export type Product = InferSelectModel<typeof productsTable>;
export type NewProduct = InferInsertModel<typeof productsTable>;
export type Courier = InferSelectModel<typeof couriersTable>;
export type NewCourier = InferInsertModel<typeof couriersTable>;
export type CompanyVehicle = InferSelectModel<typeof companyVehiclesTable>;
export type NewCompanyVehicle = InferInsertModel<typeof companyVehiclesTable>;
export type VehicleStatus = (typeof vehicleStatusEnum.enumValues)[number];
export type Coupon = InferSelectModel<typeof couponsTable>;
export type NewCoupon = InferInsertModel<typeof couponsTable>;
export type Wallet = InferSelectModel<typeof walletsTable>;
export type NewWallet = InferInsertModel<typeof walletsTable>;
export type LoyaltyRule = InferSelectModel<typeof loyaltyRulesTable>;
export type NewLoyaltyRule = InferInsertModel<typeof loyaltyRulesTable>;
export type AbandonedCart = InferSelectModel<typeof abandonedCartsTable>;
export type NewAbandonedCart = InferInsertModel<typeof abandonedCartsTable>;
export type Order = InferSelectModel<typeof ordersTable>;
export type NewOrder = InferInsertModel<typeof ordersTable>;
export type OrderProduct = InferSelectModel<typeof orderProductsTable>;
export type NewOrderProduct = InferInsertModel<typeof orderProductsTable>;
export type StockMovement = InferSelectModel<typeof stockMovementsTable>;
export type NewStockMovement = InferInsertModel<typeof stockMovementsTable>;
export type InventoryItem = InferSelectModel<typeof inventoryItemsTable>;
export type NewInventoryItem = InferInsertModel<typeof inventoryItemsTable>;
export type InventoryItemType = (typeof inventoryItemTypeEnum.enumValues)[number];
export type UnitOfMeasure = (typeof unitOfMeasureEnum.enumValues)[number];
export type FinancialClosing = InferSelectModel<typeof financialClosingsTable>;
export type NewFinancialClosing = InferInsertModel<typeof financialClosingsTable>;
export type RecipeItem = InferSelectModel<typeof recipeItemsTable>;
export type NewRecipeItem = InferInsertModel<typeof recipeItemsTable>;
export type CashRegisterShift = InferSelectModel<typeof cashRegisterShiftsTable>;
export type NewCashRegisterShift = InferInsertModel<typeof cashRegisterShiftsTable>;
export type CashRegisterShiftStatus = (typeof cashRegisterShiftStatusEnum.enumValues)[number];
export type CashMovement = InferSelectModel<typeof cashMovementsTable>;
export type NewCashMovement = InferInsertModel<typeof cashMovementsTable>;
export type CashMovementType = (typeof cashMovementTypeEnum.enumValues)[number];
export type OperatingHours = InferSelectModel<typeof operatingHoursTable>;
export type NewOperatingHours = InferInsertModel<typeof operatingHoursTable>;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type OrderProductItemStatus = (typeof orderProductItemStatusEnum.enumValues)[number];
export type ProductionSector = InferSelectModel<typeof productionSectorsTable>;
export type NewProductionSector = InferInsertModel<typeof productionSectorsTable>;
export type RestaurantStatus = (typeof restaurantStatusEnum.enumValues)[number];
export type ConsumptionMethod = (typeof consumptionMethodEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type StockMovementType = (typeof stockMovementTypeEnum.enumValues)[number];
export type CouponDiscountType = (typeof couponDiscountTypeEnum.enumValues)[number];
export type AbandonedCartStatus = (typeof abandonedCartStatusEnum.enumValues)[number];
export interface RestaurantComCategoriasEProdutos extends Restaurant {
    menuCategories: Array<MenuCategory & {
        products: Product[];
    }>;
    operatingHours: OperatingHours[];
}
export interface MesaComanda {
    table: DiningTable;
    currentOrder: PedidoRecebimento | null;
}
export interface ProductComRestaurante extends Product {
    restaurant: Pick<Restaurant, "name" | "avatarImageUrl" | "slug" | "status" | "showOptionImages"> & {
        operatingHours: OperatingHours[];
    };
}
export interface PedidoBeneficiosValidado {
    subtotal: number;
    deliveryFee: number;
    discountAmount: number;
    couponDiscountAmount: number;
    cashbackRedeemedAmount: number;
    total: number;
    cashbackEarnedAmount: number;
    appliedCoupon: Pick<Coupon, "id" | "code" | "description" | "discountType" | "discountValue"> | null;
    wallet: {
        id: Wallet["id"];
        currentBalance: number;
        remainingBalance: number;
        availableToRedeem: number;
    } | null;
    nextLoyaltyRule?: {
        minOrderValue: number;
        cashbackPercent: number;
        remainingAmount: number;
    } | null;
}
export interface OrderComItens extends Order {
    restaurant: Pick<Restaurant, "name" | "avatarImageUrl" | "slug">;
    diningTable?: Pick<DiningTable, "id" | "name" | "seats"> | null;
    courier?: Pick<Courier, "id" | "name" | "phone"> | null;
    orderProducts: Array<OrderProduct & {
        product: Product;
        orderProductOptions: OrderProductOption[];
    }>;
}
export interface PedidoRecebimento extends Order {
    restaurant: Pick<Restaurant, "id" | "name" | "slug">;
    diningTable?: Pick<DiningTable, "id" | "name" | "seats"> | null;
    courier?: Pick<Courier, "id" | "name" | "phone"> | null;
    waiter?: Pick<Waiter, "id" | "name"> | null;
    orderProducts: Array<OrderProduct & {
        product: Pick<Product, "id" | "name" | "imageUrl">;
        orderProductOptions: OrderProductOption[];
        productionSector: Pick<ProductionSector, "id" | "name" | "color"> | null;
    }>;
}
export type Waiter = InferSelectModel<typeof waitersTable>;
export type NewWaiter = InferInsertModel<typeof waitersTable>;
export type WaiterStatus = (typeof waiterStatusEnum.enumValues)[number];
export type CommissionRule = InferSelectModel<typeof commissionRulesTable>;
export type NewCommissionRule = InferInsertModel<typeof commissionRulesTable>;
export type TipClosing = InferSelectModel<typeof tipClosingsTable>;
export type NewTipClosing = InferInsertModel<typeof tipClosingsTable>;
export type TableReservation = InferSelectModel<typeof tableReservationsTable>;
export type NewTableReservation = InferInsertModel<typeof tableReservationsTable>;
export type ReservationStatus = (typeof reservationStatusEnum.enumValues)[number];
export type WaitingQueueEntry = InferSelectModel<typeof waitingQueueTable>;
export type NewWaitingQueueEntry = InferInsertModel<typeof waitingQueueTable>;
export type QueueStatus = (typeof queueStatusEnum.enumValues)[number];
export type ComandaAvulsa = InferSelectModel<typeof comandasAvulsasTable>;
export type NewComandaAvulsa = InferInsertModel<typeof comandasAvulsasTable>;
export type ComandaAvulsaStatus = (typeof comandaAvulsaStatusEnum.enumValues)[number];
export interface ComandaAvulsaComPedido extends ComandaAvulsa {
    order: PedidoRecebimento | null;
}
export type ProductSizePrice = InferSelectModel<typeof productSizePricesTable>;
export type NewProductSizePrice = InferInsertModel<typeof productSizePricesTable>;
export type PizzaPricingRule = (typeof pizzaPricingRuleEnum.enumValues)[number];
export type DeliveryFeeRule = InferSelectModel<typeof deliveryFeeRulesTable>;
export type NewDeliveryFeeRule = InferInsertModel<typeof deliveryFeeRulesTable>;
export type DeliveryFeeRuleType = (typeof deliveryFeeRuleTypeEnum.enumValues)[number];
export type MarketplaceIntegration = InferSelectModel<typeof marketplaceIntegrationsTable>;
export type NewMarketplaceIntegration = InferInsertModel<typeof marketplaceIntegrationsTable>;
export type MarketplaceType = (typeof marketplaceTypeEnum.enumValues)[number];
export type CourierTrip = InferSelectModel<typeof courierTripsTable>;
export type NewCourierTrip = InferInsertModel<typeof courierTripsTable>;
export type CourierTripStatus = (typeof courierTripStatusEnum.enumValues)[number];
export type Supplier = InferSelectModel<typeof suppliersTable>;
export type NewSupplier = InferInsertModel<typeof suppliersTable>;
export type PurchaseInvoice = InferSelectModel<typeof purchaseInvoicesTable>;
export type NewPurchaseInvoice = InferInsertModel<typeof purchaseInvoicesTable>;
export type InventoryBatch = InferSelectModel<typeof inventoryBatchesTable>;
export type NewInventoryBatch = InferInsertModel<typeof inventoryBatchesTable>;
export type InventoryLoss = InferSelectModel<typeof inventoryLossesTable>;
export type NewInventoryLoss = InferInsertModel<typeof inventoryLossesTable>;
export type InventoryLossReason = (typeof inventoryLossReasonEnum.enumValues)[number];
export type BankAccount = InferSelectModel<typeof bankAccountsTable>;
export type NewBankAccount = InferInsertModel<typeof bankAccountsTable>;
export type BankAccountType = (typeof bankAccountTypeEnum.enumValues)[number];
export type FiscalSettings = InferSelectModel<typeof fiscalSettingsTable>;
export type NewFiscalSettings = InferInsertModel<typeof fiscalSettingsTable>;
export type FiscalDocumentStatus = (typeof fiscalDocumentStatusEnum.enumValues)[number];
export type CustomerLedger = InferSelectModel<typeof customerLedgersTable>;
export type NewCustomerLedger = InferInsertModel<typeof customerLedgersTable>;
export type CustomerLedgerEntry = InferSelectModel<typeof customerLedgerEntriesTable>;
export type NewCustomerLedgerEntry = InferInsertModel<typeof customerLedgerEntriesTable>;
export type LedgerEntryType = (typeof ledgerEntryTypeEnum.enumValues)[number];
export type BankStatement = InferSelectModel<typeof bankStatementsTable>;
export type NewBankStatement = InferInsertModel<typeof bankStatementsTable>;
export type BankStatementEntry = InferSelectModel<typeof bankStatementEntriesTable>;
export type NewBankStatementEntry = InferInsertModel<typeof bankStatementEntriesTable>;
export type BankStatementEntryStatus = (typeof bankStatementEntryStatusEnum.enumValues)[number];
export type Customer = InferSelectModel<typeof customersTable>;
export type NewCustomer = InferInsertModel<typeof customersTable>;
export type CustomerSegment = (typeof customerSegmentEnum.enumValues)[number];
export type CustomerInteraction = InferSelectModel<typeof customerInteractionsTable>;
export type NewCustomerInteraction = InferInsertModel<typeof customerInteractionsTable>;
export type CustomerInteractionType = (typeof interactionTypeEnum.enumValues)[number];
export type MarketingSettings = InferSelectModel<typeof marketingSettingsTable>;
export type NewMarketingSettings = InferInsertModel<typeof marketingSettingsTable>;
export type LoyaltyPrize = InferSelectModel<typeof loyaltyPrizesTable>;
export type NewLoyaltyPrize = InferInsertModel<typeof loyaltyPrizesTable>;
export type MarketingSpend = InferSelectModel<typeof marketingSpendTable>;
export type NewMarketingSpend = InferInsertModel<typeof marketingSpendTable>;
export type MarketingChannel = (typeof marketingChannelEnum.enumValues)[number];
