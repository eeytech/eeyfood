import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { consumptionMethodEnum, menuCategoriesTable, orderProductsTable, ordersTable, orderStatusEnum, paymentMethodEnum, productsTable, restaurantsTable } from "./schema.js";
export type Restaurant = InferSelectModel<typeof restaurantsTable>;
export type NewRestaurant = InferInsertModel<typeof restaurantsTable>;
export type MenuCategory = InferSelectModel<typeof menuCategoriesTable>;
export type NewMenuCategory = InferInsertModel<typeof menuCategoriesTable>;
export type Product = InferSelectModel<typeof productsTable>;
export type NewProduct = InferInsertModel<typeof productsTable>;
export type Order = InferSelectModel<typeof ordersTable>;
export type NewOrder = InferInsertModel<typeof ordersTable>;
export type OrderProduct = InferSelectModel<typeof orderProductsTable>;
export type NewOrderProduct = InferInsertModel<typeof orderProductsTable>;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type ConsumptionMethod = (typeof consumptionMethodEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export interface RestaurantComCategoriasEProdutos extends Restaurant {
    menuCategories: Array<MenuCategory & {
        products: Product[];
    }>;
}
export interface ProductComRestaurante extends Product {
    restaurant: Pick<Restaurant, "name" | "avatarImageUrl" | "slug">;
}
export interface OrderComItens extends Order {
    restaurant: Pick<Restaurant, "name" | "avatarImageUrl" | "slug">;
    orderProducts: Array<OrderProduct & {
        product: Product;
    }>;
}
export interface PedidoRecebimento extends Order {
    restaurant: Pick<Restaurant, "id" | "name" | "slug">;
    orderProducts: Array<OrderProduct & {
        product: Pick<Product, "id" | "name" | "imageUrl">;
    }>;
}
