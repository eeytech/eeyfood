import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { abandonedCartsTable, abandonedCartStatusEnum, couponDiscountTypeEnum, couponsTable, diningTablesTable, financialClosingsTable, consumptionMethodEnum, menuCategoriesTable, orderProductsTable, ordersTable, orderStatusEnum, paymentStatusEnum, paymentMethodEnum, productsTable, restaurantsTable, stockMovementsTable, stockMovementTypeEnum, walletsTable } from "./schema.js";
export type Restaurant = InferSelectModel<typeof restaurantsTable>;
export type NewRestaurant = InferInsertModel<typeof restaurantsTable>;
export type MenuCategory = InferSelectModel<typeof menuCategoriesTable>;
export type NewMenuCategory = InferInsertModel<typeof menuCategoriesTable>;
export type DiningTable = InferSelectModel<typeof diningTablesTable>;
export type NewDiningTable = InferInsertModel<typeof diningTablesTable>;
export type Product = InferSelectModel<typeof productsTable>;
export type NewProduct = InferInsertModel<typeof productsTable>;
export type Coupon = InferSelectModel<typeof couponsTable>;
export type NewCoupon = InferInsertModel<typeof couponsTable>;
export type Wallet = InferSelectModel<typeof walletsTable>;
export type NewWallet = InferInsertModel<typeof walletsTable>;
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
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type ConsumptionMethod = (typeof consumptionMethodEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type StockMovementType = (typeof stockMovementTypeEnum.enumValues)[number];
export type CouponDiscountType = (typeof couponDiscountTypeEnum.enumValues)[number];
export type AbandonedCartStatus = (typeof abandonedCartStatusEnum.enumValues)[number];
export interface RestaurantComCategoriasEProdutos extends Restaurant {
    menuCategories: Array<MenuCategory & {
        products: Product[];
    }>;
}
export interface MesaComanda {
    table: DiningTable;
    currentOrder: PedidoRecebimento | null;
}
export interface ProductComRestaurante extends Product {
    restaurant: Pick<Restaurant, "name" | "avatarImageUrl" | "slug">;
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
}
export interface OrderComItens extends Order {
    restaurant: Pick<Restaurant, "name" | "avatarImageUrl" | "slug">;
    diningTable?: Pick<DiningTable, "id" | "name" | "seats"> | null;
    orderProducts: Array<OrderProduct & {
        product: Product;
    }>;
}
export interface PedidoRecebimento extends Order {
    restaurant: Pick<Restaurant, "id" | "name" | "slug">;
    diningTable?: Pick<DiningTable, "id" | "name" | "seats"> | null;
    orderProducts: Array<OrderProduct & {
        product: Pick<Product, "id" | "name" | "imageUrl">;
    }>;
}
