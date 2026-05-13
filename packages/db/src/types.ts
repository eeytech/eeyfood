import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import {
  financialClosingsTable,
  consumptionMethodEnum,
  menuCategoriesTable,
  orderProductsTable,
  ordersTable,
  orderStatusEnum,
  paymentStatusEnum,
  paymentMethodEnum,
  productsTable,
  restaurantsTable,
  stockMovementsTable,
  stockMovementTypeEnum,
} from "./schema.js";

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

export type StockMovement = InferSelectModel<typeof stockMovementsTable>;
export type NewStockMovement = InferInsertModel<typeof stockMovementsTable>;

export type FinancialClosing = InferSelectModel<typeof financialClosingsTable>;
export type NewFinancialClosing = InferInsertModel<typeof financialClosingsTable>;

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type ConsumptionMethod =
  (typeof consumptionMethodEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type StockMovementType =
  (typeof stockMovementTypeEnum.enumValues)[number];

export interface RestaurantComCategoriasEProdutos extends Restaurant {
  menuCategories: Array<MenuCategory & { products: Product[] }>;
}

export interface ProductComRestaurante extends Product {
  restaurant: Pick<Restaurant, "name" | "avatarImageUrl" | "slug">;
}

export interface OrderComItens extends Order {
  restaurant: Pick<Restaurant, "name" | "avatarImageUrl" | "slug">;
  orderProducts: Array<
    OrderProduct & {
      product: Product;
    }
  >;
}

export interface PedidoRecebimento extends Order {
  restaurant: Pick<Restaurant, "id" | "name" | "slug">;
  orderProducts: Array<
    OrderProduct & {
      product: Pick<Product, "id" | "name" | "imageUrl">;
    }
  >;
}
