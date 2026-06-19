import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { abandonedCartsTable, abandonedCartStatusEnum, companyVehiclesTable, consumptionMethodEnum, couponDiscountTypeEnum, couponsTable, couriersTable, diningTablesTable, financialCategoriesTable, financialClosingsTable, financialTransactionsTable, menuCategoriesTable, orderProductsTable, ordersTable, orderStatusEnum, paymentMethodEnum, paymentStatusEnum, productsTable, restaurantsTable, restaurantStatusEnum, operatingHoursTable, productOptionGroupsTable, productOptionsTable, orderProductOptionsTable, orderRatingsTable, stockMovementsTable, stockMovementTypeEnum, transactionStatusEnum, transactionTypeEnum, vehicleStatusEnum, walletsTable, loyaltyRulesTable, aiSettingsTable } from "./schema.js";
export type ProductOptionGroup = InferSelectModel<typeof productOptionGroupsTable>;
export type NewProductOptionGroup = InferInsertModel<typeof productOptionGroupsTable>;
export type ProductOption = InferSelectModel<typeof productOptionsTable>;
export type NewProductOption = InferInsertModel<typeof productOptionsTable>;
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
export type FinancialClosing = InferSelectModel<typeof financialClosingsTable>;
export type NewFinancialClosing = InferInsertModel<typeof financialClosingsTable>;
export type OperatingHours = InferSelectModel<typeof operatingHoursTable>;
export type NewOperatingHours = InferInsertModel<typeof operatingHoursTable>;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
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
    orderProducts: Array<OrderProduct & {
        product: Pick<Product, "id" | "name" | "imageUrl">;
        orderProductOptions: OrderProductOption[];
    }>;
}
