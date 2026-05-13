import { relations } from "drizzle-orm";
import {
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("OrderStatus", [
  "PENDING",
  "IN_PREPARATION",
  "PAYMENT_CONFIRMED",
  "PAYMENT_FAILED",
  "FINISHED",
]);

export const consumptionMethodEnum = pgEnum("ConsumptionMethod", [
  "TAKEAWAY",
  "DINE_IN",
]);

export const paymentMethodEnum = pgEnum("PaymentMethod", [
  "MERCADO_PAGO",
  "DINHEIRO",
  "CARTAO_PRESENCIAL",
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
  imageUrl: text("imageUrl").notNull(),
  ingredients: text("ingredients").array().notNull(),
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
  total: doublePrecision("total").notNull(),
  status: orderStatusEnum("status").notNull(),
  consumptionMethod: consumptionMethodEnum("consumptionMethod").notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod").notNull(),
  changeFor: doublePrecision("changeFor"),
  restaurantId: uuid("restaurantId")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  customerName: text("customerName").notNull(),
  customerCpf: text("customerCpf").notNull(),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const restaurantsRelations = relations(restaurantsTable, ({ many }) => ({
  menuCategories: many(menuCategoriesTable),
  products: many(productsTable),
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
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  restaurant: one(restaurantsTable, {
    fields: [ordersTable.restaurantId],
    references: [restaurantsTable.id],
  }),
  orderProducts: many(orderProductsTable),
}));

export const orderProductsRelations = relations(
  orderProductsTable,
  ({ one }) => ({
    product: one(productsTable, {
      fields: [orderProductsTable.productId],
      references: [productsTable.id],
    }),
    order: one(ordersTable, {
      fields: [orderProductsTable.orderId],
      references: [ordersTable.id],
    }),
  }),
);
