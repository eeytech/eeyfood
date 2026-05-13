"use server";

import {
  and,
  buscarRestaurantePorSlug,
  db,
  eq,
  menuCategoriesTable,
  productsTable,
  stockMovementsTable,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  convertImageFileToDataUrl,
  getBooleanValue,
  getFileValue,
  getNumberValue,
  getOptionalStringValue,
  getStringValue,
} from "@/lib/admin-form-utils";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe um nome de categoria válido."),
  displayOrder: z.number().int().min(0),
  isActive: z.boolean(),
  imageUrl: z.string().trim().optional(),
});

const productSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome de produto válido."),
  description: z
    .string()
    .trim()
    .min(10, "A descrição precisa ter pelo menos 10 caracteres."),
  price: z.number().min(0.01, "Informe um preço de venda válido."),
  costPrice: z.number().min(0, "Informe um custo válido."),
  menuCategoryId: z.string().uuid("Selecione uma categoria válida."),
  sku: z.string().trim().optional(),
  ingredients: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  trackInventory: z.boolean(),
  stockQuantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  isActive: z.boolean(),
});

const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  stockQuantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  reason: z.string().trim().min(3, "Informe o motivo do ajuste."),
});

const resolveCategoryImageUrl = async (formData: FormData) => {
  const uploadedFile = getFileValue(formData.get("imageFile"));

  if (uploadedFile) {
    return convertImageFileToDataUrl(uploadedFile);
  }

  return getOptionalStringValue(formData.get("imageUrl"));
};

const resolveProductImageUrl = async (formData: FormData) => {
  const uploadedFile = getFileValue(formData.get("imageFile"));

  if (uploadedFile) {
    return convertImageFileToDataUrl(uploadedFile);
  }

  return getOptionalStringValue(formData.get("imageUrl"));
};

const revalidateRestaurantPaths = (slug: string) => {
  revalidatePath(`/${slug}/pedidos`);
  revalidatePath(`/${slug}/cardapio`);
  revalidatePath(`/${slug}/estoque`);
  revalidatePath(`/${slug}/relatorios`);
  revalidatePath(`/${slug}/menu`, "page");
};

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    throw new Error("Restaurante não encontrado.");
  }

  return restaurant;
};

export const createCategoryAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const imageUrl = await resolveCategoryImageUrl(formData);

  const parsedData = categorySchema.safeParse({
    name: getStringValue(formData.get("name")),
    displayOrder: getNumberValue(formData.get("displayOrder")),
    isActive: getBooleanValue(formData.get("isActive")),
    imageUrl,
  });

  if (!parsedData.success) {
    console.error("Falha ao validar categoria.", parsedData.error.flatten());
    return;
  }

  await db.insert(menuCategoriesTable).values({
    name: parsedData.data.name,
    displayOrder: parsedData.data.displayOrder,
    isActive: parsedData.data.isActive,
    imageUrl: parsedData.data.imageUrl,
    restaurantId: restaurant.id,
  });

  revalidateRestaurantPaths(slug);
};

export const updateCategoryAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const categoryId = getStringValue(formData.get("categoryId"));
  const imageUrl = await resolveCategoryImageUrl(formData);

  const parsedData = categorySchema.safeParse({
    name: getStringValue(formData.get("name")),
    displayOrder: getNumberValue(formData.get("displayOrder")),
    isActive: getBooleanValue(formData.get("isActive")),
    imageUrl,
  });

  if (!parsedData.success) {
    console.error("Falha ao validar atualização de categoria.", parsedData.error.flatten());
    return;
  }

  await db
    .update(menuCategoriesTable)
    .set({
      name: parsedData.data.name,
      displayOrder: parsedData.data.displayOrder,
      isActive: parsedData.data.isActive,
      imageUrl: parsedData.data.imageUrl,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(menuCategoriesTable.id, categoryId),
        eq(menuCategoriesTable.restaurantId, restaurant.id),
      ),
    );

  revalidateRestaurantPaths(slug);
};

export const deleteCategoryAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const categoryId = getStringValue(formData.get("categoryId"));

  await db
    .delete(menuCategoriesTable)
    .where(
      and(
        eq(menuCategoriesTable.id, categoryId),
        eq(menuCategoriesTable.restaurantId, restaurant.id),
      ),
    );

  revalidateRestaurantPaths(slug);
};

export const createProductAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const imageUrl = await resolveProductImageUrl(formData);

  const parsedData = productSchema.safeParse({
    name: getStringValue(formData.get("name")),
    description: getStringValue(formData.get("description")),
    price: getNumberValue(formData.get("price")),
    costPrice: getNumberValue(formData.get("costPrice")),
    menuCategoryId: getStringValue(formData.get("menuCategoryId")),
    sku: getOptionalStringValue(formData.get("sku")),
    ingredients: getOptionalStringValue(formData.get("ingredients")),
    imageUrl,
    trackInventory: getBooleanValue(formData.get("trackInventory")),
    stockQuantity: getNumberValue(formData.get("stockQuantity")),
    lowStockThreshold: getNumberValue(formData.get("lowStockThreshold")),
    isActive: getBooleanValue(formData.get("isActive")),
  });

  if (!parsedData.success) {
    console.error("Falha ao validar produto.", parsedData.error.flatten());
    return;
  }

  if (!parsedData.data.imageUrl) {
    console.error("Falha ao validar produto.", "Imagem obrigatória.");
    return;
  }

  await db.insert(productsTable).values({
    name: parsedData.data.name,
    description: parsedData.data.description,
    price: parsedData.data.price,
    costPrice: parsedData.data.costPrice,
    menuCategoryId: parsedData.data.menuCategoryId,
    sku: parsedData.data.sku,
    ingredients: parsedData.data.ingredients
      ? parsedData.data.ingredients.split(",").map((item) => item.trim()).filter(Boolean)
      : [],
    imageUrl: parsedData.data.imageUrl,
    trackInventory: parsedData.data.trackInventory,
    stockQuantity: parsedData.data.stockQuantity,
    lowStockThreshold: parsedData.data.lowStockThreshold,
    isActive: parsedData.data.isActive,
    restaurantId: restaurant.id,
  });

  revalidateRestaurantPaths(slug);
};

export const updateProductAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const productId = getStringValue(formData.get("productId"));
  const currentImageUrl = getOptionalStringValue(formData.get("currentImageUrl"));
  const resolvedImageUrl = (await resolveProductImageUrl(formData)) ?? currentImageUrl;

  const parsedData = productSchema.safeParse({
    name: getStringValue(formData.get("name")),
    description: getStringValue(formData.get("description")),
    price: getNumberValue(formData.get("price")),
    costPrice: getNumberValue(formData.get("costPrice")),
    menuCategoryId: getStringValue(formData.get("menuCategoryId")),
    sku: getOptionalStringValue(formData.get("sku")),
    ingredients: getOptionalStringValue(formData.get("ingredients")),
    imageUrl: resolvedImageUrl,
    trackInventory: getBooleanValue(formData.get("trackInventory")),
    stockQuantity: getNumberValue(formData.get("stockQuantity")),
    lowStockThreshold: getNumberValue(formData.get("lowStockThreshold")),
    isActive: getBooleanValue(formData.get("isActive")),
  });

  if (!parsedData.success) {
    console.error("Falha ao validar atualização de produto.", parsedData.error.flatten());
    return;
  }

  if (!parsedData.data.imageUrl) {
    console.error("Falha ao validar atualização de produto.", "Imagem obrigatória.");
    return;
  }

  await db
    .update(productsTable)
    .set({
      name: parsedData.data.name,
      description: parsedData.data.description,
      price: parsedData.data.price,
      costPrice: parsedData.data.costPrice,
      menuCategoryId: parsedData.data.menuCategoryId,
      sku: parsedData.data.sku,
      ingredients: parsedData.data.ingredients
        ? parsedData.data.ingredients
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      imageUrl: parsedData.data.imageUrl,
      trackInventory: parsedData.data.trackInventory,
      stockQuantity: parsedData.data.stockQuantity,
      lowStockThreshold: parsedData.data.lowStockThreshold,
      isActive: parsedData.data.isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productsTable.id, productId),
        eq(productsTable.restaurantId, restaurant.id),
      ),
    );

  revalidateRestaurantPaths(slug);
};

export const deleteProductAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const productId = getStringValue(formData.get("productId"));

  await db
    .delete(productsTable)
    .where(
      and(
        eq(productsTable.id, productId),
        eq(productsTable.restaurantId, restaurant.id),
      ),
    );

  revalidateRestaurantPaths(slug);
};

export const updateStockAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const parsedData = stockAdjustmentSchema.safeParse({
    productId: getStringValue(formData.get("productId")),
    stockQuantity: getNumberValue(formData.get("stockQuantity")),
    lowStockThreshold: getNumberValue(formData.get("lowStockThreshold")),
    reason: getStringValue(formData.get("reason")),
  });

  if (!parsedData.success) {
    console.error("Falha ao validar ajuste de estoque.", parsedData.error.flatten());
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, parsedData.data.productId),
        eq(productsTable.restaurantId, restaurant.id),
      ),
    )
    .limit(1);

  if (!product) {
    console.error("Produto não encontrado para ajuste de estoque.");
    return;
  }

  const quantityDelta = parsedData.data.stockQuantity - product.stockQuantity;

  await db
    .update(productsTable)
    .set({
      stockQuantity: parsedData.data.stockQuantity,
      lowStockThreshold: parsedData.data.lowStockThreshold,
      trackInventory: true,
      updatedAt: new Date(),
    })
    .where(eq(productsTable.id, product.id));

  if (quantityDelta !== 0) {
    await db.insert(stockMovementsTable).values({
      restaurantId: restaurant.id,
      productId: product.id,
      type: quantityDelta > 0 ? "IN" : "OUT",
      quantityDelta,
      previousQuantity: product.stockQuantity,
      currentQuantity: parsedData.data.stockQuantity,
      reason: parsedData.data.reason,
    });
  }

  revalidateRestaurantPaths(slug);
};
