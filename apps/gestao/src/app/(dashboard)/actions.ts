"use server";

import OpenAI from "openai";
import type { RestaurantStatus } from "@fsw/db";
import { buscarGruposAdicionaisDoRestaurante, buscarProdutoComOpcionaisGestao } from "@/lib/admin-queries";
import type { InventoryItemType, UnitOfMeasure } from "@fsw/db";
import { aiSettingsTable, and, buscarRestaurantePorSlug, db, eq, financialCategoriesTable, financialTransactionsTable, inventoryBatchesTable, inventoryItemsTable, inventoryLossesTable, menuCategoriesTable, operatingHoursTable, productOptionGroupsTable, productOptionsTable, productToOptionGroupsTable, productsTable, purchaseInvoicesTable, recipeItemsTable, restaurantsTable, stockMovementsTable, suppliersTable } from "@fsw/db";
import type { InventoryItem, InventoryLossReason, RecipeItem } from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  convertImageFileToDataUrl,
  getBooleanValue,
  getFileValue,
  getNumberValue,
  getOptionalNumberValue,
  getOptionalStringValue,
  getStringValue,
} from "@/lib/admin-form-utils";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe um nome de categoria válido."),
  displayOrder: z.number().int().min(0),
  isActive: z.boolean(),
  isPizzaCategory: z.boolean(),
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
  ncm: z.string().trim().max(8, "NCM deve ter 8 dígitos.").optional(),
  cfop: z.string().trim().max(4, "CFOP deve ter 4 dígitos.").optional(),
  csosn: z.string().trim().max(3, "CSOSN deve ter 3 dígitos.").optional(),
  videoUrl: z.string().trim().url().optional().or(z.literal("")),
  availableFrom: z.string().trim().optional(),
  availableTo: z.string().trim().optional(),
  isVegan: z.boolean(),
  isGlutenFree: z.boolean(),
  isLactoseFree: z.boolean(),
  isSpicy: z.boolean(),
  nutritionCalories: z.number().min(0).optional(),
  nutritionCarbs: z.number().min(0).optional(),
  nutritionProtein: z.number().min(0).optional(),
  nutritionFat: z.number().min(0).optional(),
  nutritionFiber: z.number().min(0).optional(),
  nutritionSodium: z.number().min(0).optional(),
});


const optionGroupSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome para o grupo."),
  minOptions: z.number().int().min(0),
  maxOptions: z.number().int().min(1),
  displayOrder: z.number().int().min(0),
});

const optionSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome para o adicional."),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  price: z.number().min(0),
  displayOrder: z.number().int().min(0),
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

type NutritionData = {
  nutritionCalories?: number;
  nutritionCarbs?: number;
  nutritionProtein?: number;
  nutritionFat?: number;
  nutritionFiber?: number;
  nutritionSodium?: number;
};

const buildNutritionInfo = (data: NutritionData) => {
  const info: Record<string, number> = {};
  if (data.nutritionCalories !== undefined) info.calories = data.nutritionCalories;
  if (data.nutritionCarbs !== undefined) info.carbs = data.nutritionCarbs;
  if (data.nutritionProtein !== undefined) info.protein = data.nutritionProtein;
  if (data.nutritionFat !== undefined) info.fat = data.nutritionFat;
  if (data.nutritionFiber !== undefined) info.fiber = data.nutritionFiber;
  if (data.nutritionSodium !== undefined) info.sodium = data.nutritionSodium;
  return info;
};

const revalidateRestaurantPaths = (slug: string) => {
  revalidatePath(`/${slug}/pedidos`);
  revalidatePath(`/${slug}/cardapio`);
  revalidatePath(`/${slug}/estoque`);
  revalidatePath(`/${slug}/relatorios`);
  revalidatePath(`/${slug}/configuracoes`);
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
    isPizzaCategory: getBooleanValue(formData.get("isPizzaCategory")),
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
    isPizzaCategory: parsedData.data.isPizzaCategory,
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
    isPizzaCategory: getBooleanValue(formData.get("isPizzaCategory")),
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
      isPizzaCategory: parsedData.data.isPizzaCategory,
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
    ncm: getOptionalStringValue(formData.get("ncm")),
    cfop: getOptionalStringValue(formData.get("cfop")),
    csosn: getOptionalStringValue(formData.get("csosn")),
    videoUrl: getOptionalStringValue(formData.get("videoUrl")),
    availableFrom: getOptionalStringValue(formData.get("availableFrom")),
    availableTo: getOptionalStringValue(formData.get("availableTo")),
    isVegan: getBooleanValue(formData.get("isVegan")),
    isGlutenFree: getBooleanValue(formData.get("isGlutenFree")),
    isLactoseFree: getBooleanValue(formData.get("isLactoseFree")),
    isSpicy: getBooleanValue(formData.get("isSpicy")),
    nutritionCalories: getOptionalNumberValue(formData.get("nutritionCalories")),
    nutritionCarbs: getOptionalNumberValue(formData.get("nutritionCarbs")),
    nutritionProtein: getOptionalNumberValue(formData.get("nutritionProtein")),
    nutritionFat: getOptionalNumberValue(formData.get("nutritionFat")),
    nutritionFiber: getOptionalNumberValue(formData.get("nutritionFiber")),
    nutritionSodium: getOptionalNumberValue(formData.get("nutritionSodium")),
  });

  if (!parsedData.success) {
    console.error("Falha ao validar produto.", parsedData.error.flatten());
    return;
  }

  if (!parsedData.data.imageUrl) {
    console.error("Falha ao validar produto.", "Imagem obrigatória.");
    return;
  }

  const nutritionInfo = buildNutritionInfo(parsedData.data);

  await db.insert(productsTable).values({
    name: parsedData.data.name,
    description: parsedData.data.description,
    price: parsedData.data.price,
    costPrice: parsedData.data.costPrice,
    menuCategoryId: parsedData.data.menuCategoryId,
    sku: parsedData.data.sku,
    imageUrl: parsedData.data.imageUrl,
    trackInventory: parsedData.data.trackInventory,
    stockQuantity: parsedData.data.stockQuantity,
    lowStockThreshold: parsedData.data.lowStockThreshold,
    isActive: parsedData.data.isActive,
    ncm: parsedData.data.ncm,
    cfop: parsedData.data.cfop,
    csosn: parsedData.data.csosn,
    videoUrl: parsedData.data.videoUrl || null,
    availableFrom: parsedData.data.availableFrom || null,
    availableTo: parsedData.data.availableTo || null,
    isVegan: parsedData.data.isVegan,
    isGlutenFree: parsedData.data.isGlutenFree,
    isLactoseFree: parsedData.data.isLactoseFree,
    isSpicy: parsedData.data.isSpicy,
    nutritionInfo: Object.keys(nutritionInfo).length > 0 ? nutritionInfo : null,
    ingredients: parsedData.data.ingredients
      ? parsedData.data.ingredients
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
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
    ncm: getOptionalStringValue(formData.get("ncm")),
    cfop: getOptionalStringValue(formData.get("cfop")),
    csosn: getOptionalStringValue(formData.get("csosn")),
    videoUrl: getOptionalStringValue(formData.get("videoUrl")),
    availableFrom: getOptionalStringValue(formData.get("availableFrom")),
    availableTo: getOptionalStringValue(formData.get("availableTo")),
    isVegan: getBooleanValue(formData.get("isVegan")),
    isGlutenFree: getBooleanValue(formData.get("isGlutenFree")),
    isLactoseFree: getBooleanValue(formData.get("isLactoseFree")),
    isSpicy: getBooleanValue(formData.get("isSpicy")),
    nutritionCalories: getOptionalNumberValue(formData.get("nutritionCalories")),
    nutritionCarbs: getOptionalNumberValue(formData.get("nutritionCarbs")),
    nutritionProtein: getOptionalNumberValue(formData.get("nutritionProtein")),
    nutritionFat: getOptionalNumberValue(formData.get("nutritionFat")),
    nutritionFiber: getOptionalNumberValue(formData.get("nutritionFiber")),
    nutritionSodium: getOptionalNumberValue(formData.get("nutritionSodium")),
  });

  if (!parsedData.success) {
    console.error("Falha ao validar atualização de produto.", parsedData.error.flatten());
    return;
  }

  if (!parsedData.data.imageUrl) {
    console.error("Falha ao validar atualização de produto.", "Imagem obrigatória.");
    return;
  }

  const nutritionInfo = buildNutritionInfo(parsedData.data);

  await db
    .update(productsTable)
    .set({
      name: parsedData.data.name,
      description: parsedData.data.description,
      price: parsedData.data.price,
      costPrice: parsedData.data.costPrice,
      menuCategoryId: parsedData.data.menuCategoryId,
      sku: parsedData.data.sku,
      imageUrl: parsedData.data.imageUrl,
      trackInventory: parsedData.data.trackInventory,
      stockQuantity: parsedData.data.stockQuantity,
      lowStockThreshold: parsedData.data.lowStockThreshold,
      isActive: parsedData.data.isActive,
      ncm: parsedData.data.ncm,
      cfop: parsedData.data.cfop,
      csosn: parsedData.data.csosn,
      videoUrl: parsedData.data.videoUrl || null,
      availableFrom: parsedData.data.availableFrom || null,
      availableTo: parsedData.data.availableTo || null,
      isVegan: parsedData.data.isVegan,
      isGlutenFree: parsedData.data.isGlutenFree,
      isLactoseFree: parsedData.data.isLactoseFree,
      isSpicy: parsedData.data.isSpicy,
      nutritionInfo: Object.keys(nutritionInfo).length > 0 ? nutritionInfo : null,
      ingredients: parsedData.data.ingredients
        ? parsedData.data.ingredients
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
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

export const fetchProductOptionsAction = async (slug: string, productId: string) => {
  const restaurant = await getRestaurantOrThrow(slug);
  return buscarProdutoComOpcionaisGestao(productId, restaurant.id);
};

export const createProductOptionGroupAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const productId = getOptionalStringValue(formData.get("productId"));

  const parsedData = optionGroupSchema.safeParse({
    name: getStringValue(formData.get("name")),
    minOptions: getNumberValue(formData.get("minOptions")),
    maxOptions: getNumberValue(formData.get("maxOptions")),
    displayOrder: getNumberValue(formData.get("displayOrder")),
  });

  if (!parsedData.success) {
    console.error("Falha ao validar grupo de opcionais.", parsedData.error.flatten());
    return;
  }

  const [group] = await db
    .insert(productOptionGroupsTable)
    .values({
      name: parsedData.data.name,
      minOptions: parsedData.data.minOptions,
      maxOptions: parsedData.data.maxOptions,
      displayOrder: parsedData.data.displayOrder,
      restaurantId: restaurant.id,
    })
    .returning({ id: productOptionGroupsTable.id });

  if (productId && group) {
    const [product] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.restaurantId, restaurant.id)))
      .limit(1);

    if (product) {
      await db.insert(productToOptionGroupsTable).values({
        productId: product.id,
        productOptionGroupId: group.id,
      });
    }
  }

  revalidateRestaurantPaths(slug);
};

export const updateProductOptionGroupAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const groupId = getStringValue(formData.get("groupId"));

  const parsedData = optionGroupSchema.safeParse({
    name: getStringValue(formData.get("name")),
    minOptions: getNumberValue(formData.get("minOptions")),
    maxOptions: getNumberValue(formData.get("maxOptions")),
    displayOrder: getNumberValue(formData.get("displayOrder")),
  });

  if (!parsedData.success) {
    console.error("Falha ao validar atualização de grupo.", parsedData.error.flatten());
    return;
  }

  await db
    .update(productOptionGroupsTable)
    .set({ ...parsedData.data, updatedAt: new Date() })
    .where(
      and(
        eq(productOptionGroupsTable.id, groupId),
        eq(productOptionGroupsTable.restaurantId, restaurant.id),
      ),
    );

  revalidateRestaurantPaths(slug);
};

export const deleteProductOptionGroupAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const groupId = getStringValue(formData.get("groupId"));

  await db
    .delete(productOptionGroupsTable)
    .where(
      and(
        eq(productOptionGroupsTable.id, groupId),
        eq(productOptionGroupsTable.restaurantId, restaurant.id),
      ),
    );

  revalidateRestaurantPaths(slug);
};

export const createProductOptionAction = async (slug: string, formData: FormData) => {
  await getRestaurantOrThrow(slug);
  const groupId = getStringValue(formData.get("groupId"));

  const parsedData = optionSchema.safeParse({
    name: getStringValue(formData.get("name")),
    description: getOptionalStringValue(formData.get("description")),
    imageUrl: getOptionalStringValue(formData.get("imageUrl")),
    price: getNumberValue(formData.get("price")),
    displayOrder: getNumberValue(formData.get("displayOrder")),
  });

  if (!parsedData.success) {
    console.error("Falha ao validar adicional.", parsedData.error.flatten());
    return;
  }

  await db.insert(productOptionsTable).values({
    name: parsedData.data.name,
    description: parsedData.data.description,
    imageUrl: parsedData.data.imageUrl,
    price: parsedData.data.price,
    displayOrder: parsedData.data.displayOrder,
    productOptionGroupId: groupId,
  });

  revalidateRestaurantPaths(slug);
};

export const updateProductOptionAction = async (slug: string, formData: FormData) => {
  await getRestaurantOrThrow(slug);
  const optionId = getStringValue(formData.get("optionId"));

  const parsedData = optionSchema.safeParse({
    name: getStringValue(formData.get("name")),
    description: getOptionalStringValue(formData.get("description")),
    imageUrl: getOptionalStringValue(formData.get("imageUrl")),
    price: getNumberValue(formData.get("price")),
    displayOrder: getNumberValue(formData.get("displayOrder")),
  });

  if (!parsedData.success) {
    console.error("Falha ao validar atualização de adicional.", parsedData.error.flatten());
    return;
  }

  await db
    .update(productOptionsTable)
    .set({ ...parsedData.data, updatedAt: new Date() })
    .where(eq(productOptionsTable.id, optionId));

  revalidateRestaurantPaths(slug);
};

export const deleteProductOptionAction = async (slug: string, formData: FormData) => {
  await getRestaurantOrThrow(slug);
  const optionId = getStringValue(formData.get("optionId"));

  await db
    .delete(productOptionsTable)
    .where(eq(productOptionsTable.id, optionId));

  revalidateRestaurantPaths(slug);
};

export const fetchRestaurantOptionGroupsAction = async (slug: string) => {
  const restaurant = await getRestaurantOrThrow(slug);
  return buscarGruposAdicionaisDoRestaurante(restaurant.id);
};

export const linkOptionGroupToProductAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const productId = getStringValue(formData.get("productId"));
  const groupId = getStringValue(formData.get("groupId"));

  const [product] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.restaurantId, restaurant.id)))
    .limit(1);

  const [group] = await db
    .select({ id: productOptionGroupsTable.id })
    .from(productOptionGroupsTable)
    .where(
      and(
        eq(productOptionGroupsTable.id, groupId),
        eq(productOptionGroupsTable.restaurantId, restaurant.id),
      ),
    )
    .limit(1);

  if (!product || !group) return;

  await db
    .insert(productToOptionGroupsTable)
    .values({ productId: product.id, productOptionGroupId: group.id })
    .onConflictDoNothing();

  revalidateRestaurantPaths(slug);
};

export const unlinkOptionGroupFromProductAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const productId = getStringValue(formData.get("productId"));
  const groupId = getStringValue(formData.get("groupId"));

  const [group] = await db
    .select({ id: productOptionGroupsTable.id })
    .from(productOptionGroupsTable)
    .where(
      and(
        eq(productOptionGroupsTable.id, groupId),
        eq(productOptionGroupsTable.restaurantId, restaurant.id),
      ),
    )
    .limit(1);

  if (!group) return;

  await db
    .delete(productToOptionGroupsTable)
    .where(
      and(
        eq(productToOptionGroupsTable.productId, productId),
        eq(productToOptionGroupsTable.productOptionGroupId, groupId),
      ),
    );

  revalidateRestaurantPaths(slug);
};

export const updateRestaurantDetailsAction = async (
  slug: string,
  formData: FormData,
) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const name = getStringValue(formData.get("name"));
  const description = getStringValue(formData.get("description"));
  const cnpj = getOptionalStringValue(formData.get("cnpj"));
  const phone = getOptionalStringValue(formData.get("phone"));
  const address = getOptionalStringValue(formData.get("address"));

  if (!name || !description) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  const avatarFile = getFileValue(formData.get("avatarFile"));
  const coverFile = getFileValue(formData.get("coverFile"));

  const avatarImageUrl = avatarFile
    ? await convertImageFileToDataUrl(avatarFile)
    : restaurant.avatarImageUrl;

  const coverImageUrl = coverFile
    ? await convertImageFileToDataUrl(coverFile)
    : restaurant.coverImageUrl;

  await db
    .update(restaurantsTable)
    .set({ name, description, avatarImageUrl, coverImageUrl, cnpj, phone, address, updatedAt: new Date() })
    .where(eq(restaurantsTable.id, restaurant.id));

  revalidateRestaurantPaths(slug);
};

export const updateRestaurantFeaturesAction = async (
  slug: string,
  formData: FormData,
) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const isDeliveryEnabled = getBooleanValue(formData.get("isDeliveryEnabled"));
  const isTakeawayEnabled = getBooleanValue(formData.get("isTakeawayEnabled"));
  const isDineInEnabled = getBooleanValue(formData.get("isDineInEnabled"));
  const isBotActive = getBooleanValue(formData.get("isBotActive"));

  if (!isDeliveryEnabled && !isTakeawayEnabled && !isDineInEnabled) {
    throw new Error("O estabelecimento deve manter pelo menos um método de consumo ativo.");
  }

  await db
    .update(restaurantsTable)
    .set({
      acceptMercadoPago: getBooleanValue(formData.get("acceptMercadoPago")),
      isCouponsEnabled: getBooleanValue(formData.get("isCouponsEnabled")),
      isCashbackEnabled: getBooleanValue(formData.get("isCashbackEnabled")),
      showOptionImages: getBooleanValue(formData.get("showOptionImages")),
      isDeliveryEnabled,
      isTakeawayEnabled,
      isDineInEnabled,
      updatedAt: new Date(),
    })
    .where(eq(restaurantsTable.id, restaurant.id));

  await db
    .insert(aiSettingsTable)
    .values({ restaurantId: restaurant.id, isBotActive })
    .onConflictDoUpdate({
      target: aiSettingsTable.restaurantId,
      set: { isBotActive, updatedAt: new Date() },
    });

  revalidateRestaurantPaths(slug);
};

export const updateRestaurantStatusAction = async (
  slug: string,
  formData: FormData,
) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const status = getStringValue(formData.get("status")) as RestaurantStatus;

  await db
    .update(restaurantsTable)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(restaurantsTable.id, restaurant.id));

  revalidateRestaurantPaths(slug);
};

export const updateOperatingHoursAction = async (
  slug: string,
  formData: FormData,
) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const days = [0, 1, 2, 3, 4, 5, 6];

  await db.transaction(async (tx) => {
    for (const day of days) {
      const openTime = formData.get(`openTime-${day}`) as string;
      const closeTime = formData.get(`closeTime-${day}`) as string;
      const isOpen = getBooleanValue(formData.get(`isOpen-${day}`));

      if (isOpen && openTime && closeTime) {
        await tx
          .delete(operatingHoursTable)
          .where(
            and(
              eq(operatingHoursTable.restaurantId, restaurant.id),
              eq(operatingHoursTable.dayOfWeek, day),
            ),
          );

        await tx.insert(operatingHoursTable).values({
          restaurantId: restaurant.id,
          dayOfWeek: day,
          openTime,
          closeTime,
        });
      } else {
        await tx
          .delete(operatingHoursTable)
          .where(
            and(
              eq(operatingHoursTable.restaurantId, restaurant.id),
              eq(operatingHoursTable.dayOfWeek, day),
            ),
          );
      }
    }
  });

  revalidateRestaurantPaths(slug);
};

// ─── Inventário Geral ─────────────────────────────────────────────────────────

const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "O nome do item é obrigatório."),
  description: z.string().trim().optional(),
  type: z.enum(["INSUMO", "EMBALAGEM", "EQUIPAMENTO", "LIMPEZA", "OUTROS"]),
  sku: z.string().trim().optional(),
  unitOfMeasure: z.enum(["UN", "KG", "G", "L", "ML", "CX", "PCT", "M"]),
  currentQuantity: z.number().min(0, "A quantidade não pode ser negativa."),
  lowStockThreshold: z.number().min(0, "O alerta não pode ser negativo."),
  unitCost: z.number().min(0).optional(),
});

export interface InventoryActionResult {
  success: boolean;
  error?: string;
}

export const createInventoryItemAction = async (
  slug: string,
  formData: FormData,
): Promise<InventoryActionResult> => {
  const restaurant = await getRestaurantOrThrow(slug);

  const rawUnitCost = formData.get("unitCost");
  const parsed = inventoryItemSchema.safeParse({
    name: getStringValue(formData.get("name")),
    description: getOptionalStringValue(formData.get("description")),
    type: getStringValue(formData.get("type")) as InventoryItemType,
    sku: getOptionalStringValue(formData.get("sku")),
    unitOfMeasure: getStringValue(formData.get("unitOfMeasure")) as UnitOfMeasure,
    currentQuantity: getNumberValue(formData.get("currentQuantity")),
    lowStockThreshold: getNumberValue(formData.get("lowStockThreshold")),
    unitCost: rawUnitCost && String(rawUnitCost).trim() !== "" ? getNumberValue(rawUnitCost) : undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const [item] = await db
    .insert(inventoryItemsTable)
    .values({
      restaurantId: restaurant.id,
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type,
      sku: parsed.data.sku,
      unitOfMeasure: parsed.data.unitOfMeasure,
      currentQuantity: parsed.data.currentQuantity,
      lowStockThreshold: parsed.data.lowStockThreshold,
      unitCost: parsed.data.unitCost,
    })
    .returning({ id: inventoryItemsTable.id });

  if (parsed.data.currentQuantity > 0 && item) {
    await db.insert(stockMovementsTable).values({
      restaurantId: restaurant.id,
      inventoryItemId: item.id,
      type: "IN",
      quantityDelta: parsed.data.currentQuantity,
      previousQuantity: 0,
      currentQuantity: parsed.data.currentQuantity,
      reason: "Estoque inicial no cadastro.",
    });
  }

  revalidateRestaurantPaths(slug);
  return { success: true };
};

export const updateInventoryItemAction = async (
  slug: string,
  formData: FormData,
): Promise<InventoryActionResult> => {
  const restaurant = await getRestaurantOrThrow(slug);
  const itemId = getStringValue(formData.get("itemId"));

  const rawUnitCost = formData.get("unitCost");
  const parsed = inventoryItemSchema.safeParse({
    name: getStringValue(formData.get("name")),
    description: getOptionalStringValue(formData.get("description")),
    type: getStringValue(formData.get("type")) as InventoryItemType,
    sku: getOptionalStringValue(formData.get("sku")),
    unitOfMeasure: getStringValue(formData.get("unitOfMeasure")) as UnitOfMeasure,
    currentQuantity: getNumberValue(formData.get("currentQuantity")),
    lowStockThreshold: getNumberValue(formData.get("lowStockThreshold")),
    unitCost: rawUnitCost && String(rawUnitCost).trim() !== "" ? getNumberValue(rawUnitCost) : undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const [current] = await db
    .select({ currentQuantity: inventoryItemsTable.currentQuantity })
    .from(inventoryItemsTable)
    .where(
      and(
        eq(inventoryItemsTable.id, itemId),
        eq(inventoryItemsTable.restaurantId, restaurant.id),
      ),
    )
    .limit(1);

  if (!current) return { success: false, error: "Item não encontrado." };

  const reason = getOptionalStringValue(formData.get("reason")) ?? "Edição cadastral.";
  const quantityDelta = parsed.data.currentQuantity - current.currentQuantity;

  await db
    .update(inventoryItemsTable)
    .set({
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type,
      sku: parsed.data.sku,
      unitOfMeasure: parsed.data.unitOfMeasure,
      currentQuantity: parsed.data.currentQuantity,
      lowStockThreshold: parsed.data.lowStockThreshold,
      unitCost: parsed.data.unitCost,
      updatedAt: new Date(),
    })
    .where(eq(inventoryItemsTable.id, itemId));

  if (quantityDelta !== 0) {
    await db.insert(stockMovementsTable).values({
      restaurantId: restaurant.id,
      inventoryItemId: itemId,
      type: quantityDelta > 0 ? "IN" : "OUT",
      quantityDelta,
      previousQuantity: current.currentQuantity,
      currentQuantity: parsed.data.currentQuantity,
      reason,
    });
  }

  revalidateRestaurantPaths(slug);
  return { success: true };
};

export const deleteInventoryItemAction = async (
  slug: string,
  itemId: string,
): Promise<InventoryActionResult> => {
  const restaurant = await getRestaurantOrThrow(slug);

  await db
    .delete(inventoryItemsTable)
    .where(
      and(
        eq(inventoryItemsTable.id, itemId),
        eq(inventoryItemsTable.restaurantId, restaurant.id),
      ),
    );

  revalidateRestaurantPaths(slug);
  return { success: true };
};

// ─── Ficha Técnica (RecipeItem) ───────────────────────────────────────────────

export interface RecipeItemComInsumo extends RecipeItem {
  inventoryItem: Pick<InventoryItem, "id" | "name" | "unitOfMeasure">;
}

export const fetchRecipeItemsAction = async (
  slug: string,
  productId: string,
): Promise<RecipeItemComInsumo[]> => {
  const restaurant = await getRestaurantOrThrow(slug);

  const [product] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, productId),
        eq(productsTable.restaurantId, restaurant.id),
      ),
    )
    .limit(1);

  if (!product) return [];

  const rows = await db
    .select({
      id: recipeItemsTable.id,
      productId: recipeItemsTable.productId,
      inventoryItemId: recipeItemsTable.inventoryItemId,
      quantityNeeded: recipeItemsTable.quantityNeeded,
      yieldFactor: recipeItemsTable.yieldFactor,
      preparationMethod: recipeItemsTable.preparationMethod,
      suggestedMargin: recipeItemsTable.suggestedMargin,
      createdAt: recipeItemsTable.createdAt,
      updatedAt: recipeItemsTable.updatedAt,
      inventoryItem: {
        id: inventoryItemsTable.id,
        name: inventoryItemsTable.name,
        unitOfMeasure: inventoryItemsTable.unitOfMeasure,
      },
    })
    .from(recipeItemsTable)
    .innerJoin(inventoryItemsTable, eq(inventoryItemsTable.id, recipeItemsTable.inventoryItemId))
    .where(eq(recipeItemsTable.productId, productId));

  return rows;
};

export const fetchInventoryItemsForRecipeAction = async (
  slug: string,
): Promise<Pick<InventoryItem, "id" | "name" | "unitOfMeasure" | "currentQuantity">[]> => {
  const restaurant = await getRestaurantOrThrow(slug);

  return db
    .select({
      id: inventoryItemsTable.id,
      name: inventoryItemsTable.name,
      unitOfMeasure: inventoryItemsTable.unitOfMeasure,
      currentQuantity: inventoryItemsTable.currentQuantity,
    })
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.restaurantId, restaurant.id))
    .orderBy(inventoryItemsTable.name);
};

export const addRecipeItemAction = async (
  slug: string,
  productId: string,
  inventoryItemId: string,
  quantityNeeded: number,
): Promise<InventoryActionResult> => {
  if (quantityNeeded <= 0) {
    return { success: false, error: "A quantidade deve ser maior que zero." };
  }

  const restaurant = await getRestaurantOrThrow(slug);

  const [product] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, productId),
        eq(productsTable.restaurantId, restaurant.id),
      ),
    )
    .limit(1);

  if (!product) return { success: false, error: "Produto não encontrado." };

  const [invItem] = await db
    .select({ id: inventoryItemsTable.id })
    .from(inventoryItemsTable)
    .where(
      and(
        eq(inventoryItemsTable.id, inventoryItemId),
        eq(inventoryItemsTable.restaurantId, restaurant.id),
      ),
    )
    .limit(1);

  if (!invItem) return { success: false, error: "Insumo não encontrado." };

  await db.insert(recipeItemsTable).values({
    productId,
    inventoryItemId,
    quantityNeeded,
  });

  revalidateRestaurantPaths(slug);
  return { success: true };
};

export const updateRecipeItemAction = async (
  slug: string,
  recipeItemId: string,
  quantityNeeded: number,
): Promise<InventoryActionResult> => {
  if (quantityNeeded <= 0) {
    return { success: false, error: "A quantidade deve ser maior que zero." };
  }

  const restaurant = await getRestaurantOrThrow(slug);

  const [existing] = await db
    .select({ id: recipeItemsTable.id, productId: recipeItemsTable.productId })
    .from(recipeItemsTable)
    .innerJoin(productsTable, eq(productsTable.id, recipeItemsTable.productId))
    .where(
      and(
        eq(recipeItemsTable.id, recipeItemId),
        eq(productsTable.restaurantId, restaurant.id),
      ),
    )
    .limit(1);

  if (!existing) return { success: false, error: "Item da ficha técnica não encontrado." };

  await db
    .update(recipeItemsTable)
    .set({ quantityNeeded, updatedAt: new Date() })
    .where(eq(recipeItemsTable.id, recipeItemId));

  revalidateRestaurantPaths(slug);
  return { success: true };
};

export const removeRecipeItemAction = async (
  slug: string,
  recipeItemId: string,
): Promise<InventoryActionResult> => {
  const restaurant = await getRestaurantOrThrow(slug);

  const [existing] = await db
    .select({ id: recipeItemsTable.id })
    .from(recipeItemsTable)
    .innerJoin(productsTable, eq(productsTable.id, recipeItemsTable.productId))
    .where(
      and(
        eq(recipeItemsTable.id, recipeItemId),
        eq(productsTable.restaurantId, restaurant.id),
      ),
    )
    .limit(1);

  if (!existing) return { success: false, error: "Item da ficha técnica não encontrado." };

  await db.delete(recipeItemsTable).where(eq(recipeItemsTable.id, recipeItemId));

  revalidateRestaurantPaths(slug);
  return { success: true };
};

export interface AiProductGenerationResult {
  description?: string;
  nutrition?: {
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
  };
  error?: string;
}

export const generateProductAiAction = async (
  slug: string,
  productName: string,
  categoryName: string,
): Promise<AiProductGenerationResult> => {
  const restaurant = await getRestaurantOrThrow(slug);

  const [aiSettings] = await db
    .select({ openaiApiKey: aiSettingsTable.openaiApiKey })
    .from(aiSettingsTable)
    .where(eq(aiSettingsTable.restaurantId, restaurant.id))
    .limit(1);

  if (!aiSettings?.openaiApiKey) {
    return { error: "Configure a chave da OpenAI em Inteligência Artificial para usar este recurso." };
  }

  try {
    const openai = new OpenAI({ apiKey: aiSettings.openaiApiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você é um especialista em gastronomia e copywriting para menus de restaurantes.
Responda SOMENTE em JSON com este formato exato:
{
  "description": "descrição gourmet vendedora em até 2 frases",
  "nutrition": {
    "calories": 0,
    "carbs": 0,
    "protein": 0,
    "fat": 0,
    "fiber": 0,
    "sodium": 0
  }
}
Os valores nutricionais são por porção individual e devem ser números inteiros aproximados.`,
        },
        {
          role: "user",
          content: `Produto: "${productName}" — Categoria: "${categoryName}". Gere a descrição e a tabela nutricional aproximada.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { error: "Resposta vazia da IA." };

    const parsed = JSON.parse(content) as AiProductGenerationResult;
    return parsed;
  } catch {
    return { error: "Erro ao comunicar com a IA. Verifique sua chave de API." };
  }
};

// ─── Registro de Perdas (InventoryLoss) ──────────────────────────────────────

export const registrarPerdaAction = async (
  slug: string,
  formData: FormData,
): Promise<InventoryActionResult> => {
  const restaurant = await getRestaurantOrThrow(slug);

  const inventoryItemId = getStringValue(formData.get("inventoryItemId"));
  const quantity = getNumberValue(formData.get("quantity"));
  const reason = getStringValue(formData.get("reason")) as InventoryLossReason;
  const notes = getOptionalStringValue(formData.get("notes"));

  if (!inventoryItemId || quantity <= 0) {
    return { success: false, error: "Informe o insumo e uma quantidade válida." };
  }

  const [item] = await db
    .select({ currentQuantity: inventoryItemsTable.currentQuantity, unitCost: inventoryItemsTable.unitCost, name: inventoryItemsTable.name })
    .from(inventoryItemsTable)
    .where(and(eq(inventoryItemsTable.id, inventoryItemId), eq(inventoryItemsTable.restaurantId, restaurant.id)))
    .limit(1);

  if (!item) return { success: false, error: "Insumo não encontrado." };

  const financialLoss = (item.unitCost ?? 0) * quantity;
  const prevQty = item.currentQuantity;
  const nextQty = Math.max(prevQty - quantity, 0);

  await db.transaction(async (tx) => {
    await tx.insert(inventoryLossesTable).values({
      restaurantId: restaurant.id,
      inventoryItemId,
      quantity,
      reason,
      financialLoss,
      notes,
    });

    await tx
      .update(inventoryItemsTable)
      .set({ currentQuantity: nextQty, updatedAt: new Date() })
      .where(eq(inventoryItemsTable.id, inventoryItemId));

    await tx.insert(stockMovementsTable).values({
      restaurantId: restaurant.id,
      inventoryItemId,
      type: "OUT",
      quantityDelta: -quantity,
      previousQuantity: prevQty,
      currentQuantity: nextQty,
      reason: `Perda/Desperdício — ${reason}${notes ? `: ${notes}` : ""}`,
    });

    if (financialLoss > 0) {
      // Registrar despesa financeira pela perda
      const [lossCategory] = await tx
        .select({ id: financialCategoriesTable.id })
        .from(financialCategoriesTable)
        .where(and(eq(financialCategoriesTable.restaurantId, restaurant.id), eq(financialCategoriesTable.type, "EXPENSE")))
        .limit(1);

      await tx.insert(financialTransactionsTable).values({
        restaurantId: restaurant.id,
        description: `Perda de estoque — ${item.name} (${quantity} un.) — ${reason}`,
        amount: financialLoss,
        type: "EXPENSE",
        status: "PAID",
        dueDate: new Date(),
        paidAt: new Date(),
        categoryId: lossCategory?.id ?? null,
      });
    }
  });

  revalidateRestaurantPaths(slug);
  return { success: true };
};

// ─── Lotes de Estoque (InventoryBatch) ───────────────────────────────────────

export const criarLoteAction = async (
  slug: string,
  formData: FormData,
): Promise<InventoryActionResult> => {
  const restaurant = await getRestaurantOrThrow(slug);

  const inventoryItemId = getStringValue(formData.get("inventoryItemId"));
  const quantity = getNumberValue(formData.get("quantity"));
  const batchCode = getOptionalStringValue(formData.get("batchCode"));
  const expirationDate = getOptionalStringValue(formData.get("expirationDate"));
  const manufacturingDate = getOptionalStringValue(formData.get("manufacturingDate"));
  const unitCost = getOptionalNumberValue(formData.get("unitCost"));

  if (!inventoryItemId || quantity <= 0) {
    return { success: false, error: "Informe o insumo e uma quantidade válida." };
  }

  const [item] = await db
    .select({ currentQuantity: inventoryItemsTable.currentQuantity, unitCost: inventoryItemsTable.unitCost })
    .from(inventoryItemsTable)
    .where(and(eq(inventoryItemsTable.id, inventoryItemId), eq(inventoryItemsTable.restaurantId, restaurant.id)))
    .limit(1);

  if (!item) return { success: false, error: "Insumo não encontrado." };

  const effectiveUnitCost = unitCost ?? item.unitCost ?? 0;
  const prevQty = item.currentQuantity;
  const nextQty = prevQty + quantity;

  await db.transaction(async (tx) => {
    await tx.insert(inventoryBatchesTable).values({
      restaurantId: restaurant.id,
      inventoryItemId,
      batchCode,
      quantity,
      expirationDate: expirationDate ?? null,
      manufacturingDate: manufacturingDate ?? null,
      unitCost: effectiveUnitCost,
    });

    const newAvgCost = prevQty > 0
      ? ((item.unitCost ?? 0) * prevQty + effectiveUnitCost * quantity) / nextQty
      : effectiveUnitCost;

    await tx.update(inventoryItemsTable).set({
      currentQuantity: nextQty,
      unitCost: newAvgCost,
      updatedAt: new Date(),
    }).where(eq(inventoryItemsTable.id, inventoryItemId));

    await tx.insert(stockMovementsTable).values({
      restaurantId: restaurant.id,
      inventoryItemId,
      type: "IN",
      quantityDelta: quantity,
      previousQuantity: prevQty,
      currentQuantity: nextQty,
      reason: batchCode ? `Entrada de lote ${batchCode}` : "Entrada de estoque",
    });
  });

  revalidateRestaurantPaths(slug);
  return { success: true };
};

// ─── Fornecedores (Supplier) ──────────────────────────────────────────────────

export const criarFornecedorAction = async (
  slug: string,
  formData: FormData,
): Promise<InventoryActionResult & { id?: string }> => {
  const restaurant = await getRestaurantOrThrow(slug);

  const companyName = getStringValue(formData.get("companyName"));
  if (!companyName) return { success: false, error: "Informe a Razão Social." };

  const [supplier] = await db.insert(suppliersTable).values({
    restaurantId: restaurant.id,
    companyName,
    cnpj: getOptionalStringValue(formData.get("cnpj")),
    phone: getOptionalStringValue(formData.get("phone")),
    email: getOptionalStringValue(formData.get("email")),
    address: getOptionalStringValue(formData.get("address")),
  }).returning({ id: suppliersTable.id });

  revalidateRestaurantPaths(slug);
  return { success: true, id: supplier?.id };
};

export const atualizarFornecedorAction = async (
  slug: string,
  supplierId: string,
  formData: FormData,
): Promise<InventoryActionResult> => {
  const restaurant = await getRestaurantOrThrow(slug);

  await db.update(suppliersTable).set({
    companyName: getStringValue(formData.get("companyName")),
    cnpj: getOptionalStringValue(formData.get("cnpj")),
    phone: getOptionalStringValue(formData.get("phone")),
    email: getOptionalStringValue(formData.get("email")),
    address: getOptionalStringValue(formData.get("address")),
    updatedAt: new Date(),
  }).where(and(eq(suppliersTable.id, supplierId), eq(suppliersTable.restaurantId, restaurant.id)));

  revalidateRestaurantPaths(slug);
  return { success: true };
};

export const excluirFornecedorAction = async (
  slug: string,
  supplierId: string,
): Promise<InventoryActionResult> => {
  const restaurant = await getRestaurantOrThrow(slug);
  await db.delete(suppliersTable).where(and(eq(suppliersTable.id, supplierId), eq(suppliersTable.restaurantId, restaurant.id)));
  revalidateRestaurantPaths(slug);
  return { success: true };
};

// ─── Importação de XML NF-e ───────────────────────────────────────────────────

interface NFeItem {
  nfeCode: string;
  nfeName: string;
  quantity: number;
  unitCost: number;
  unitOfMeasure: string;
}

interface NFeParseResult {
  supplierCnpj: string;
  supplierName: string;
  invoiceNumber: string;
  accessKey: string;
  totalAmount: number;
  issuedAt: Date | null;
  items: NFeItem[];
}

const extractTag = (xml: string, tag: string): string => {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i"));
  return m ? m[1].trim() : "";
};

const extractAllTags = (xml: string, tag: string): string[] => {
  const matches: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) matches.push(m[1]);
  return matches;
};

const parseNFeXml = (xml: string): NFeParseResult => {
  const supplierCnpj = extractTag(xml, "CNPJ");
  const supplierName = extractTag(xml, "xNome") || extractTag(xml, "xFant");
  const invoiceNumber = extractTag(xml, "nNF");
  const dhEmi = extractTag(xml, "dhEmi") || extractTag(xml, "dEmi");
  const issuedAt = dhEmi ? new Date(dhEmi) : null;

  const idAttr = xml.match(/infNFe\s+Id\s*=\s*["']([^"']+)["']/i);
  const accessKey = idAttr ? idAttr[1].replace(/^NFe/, "") : extractTag(xml, "chNFe");

  const vNFMatch = xml.match(/<ICMSTot>[\s\S]*?<vNF>([^<]+)<\/vNF>/i);
  const totalAmount = vNFMatch ? parseFloat(vNFMatch[1]) : 0;

  const detBlocks = extractAllTags(xml, "det");
  const items: NFeItem[] = detBlocks.map((det) => ({
    nfeCode: extractTag(det, "cProd"),
    nfeName: extractTag(det, "xProd"),
    quantity: parseFloat(extractTag(det, "qCom")) || 0,
    unitCost: parseFloat(extractTag(det, "vUnCom")) || 0,
    unitOfMeasure: extractTag(det, "uCom"),
  })).filter((i) => i.nfeName && i.quantity > 0);

  return { supplierCnpj, supplierName, invoiceNumber, accessKey, totalAmount, issuedAt, items };
};

export interface ImportarXmlResult {
  success: boolean;
  error?: string;
  invoiceId?: string;
  parsed?: NFeParseResult;
  supplierId?: string;
}

export const parseXmlNFeAction = async (
  slug: string,
  xmlContent: string,
): Promise<ImportarXmlResult> => {
  await getRestaurantOrThrow(slug);

  try {
    const parsed = parseNFeXml(xmlContent);
    if (!parsed.supplierName && !parsed.invoiceNumber) {
      return { success: false, error: "XML inválido ou não reconhecido como NF-e." };
    }
    return { success: true, parsed };
  } catch {
    return { success: false, error: "Falha ao processar o XML da NF-e." };
  }
};

export interface MapeamentoItem {
  nfeCode: string;
  nfeName: string;
  quantity: number;
  unitCost: number;
  unitOfMeasure: string;
  inventoryItemId: string | null;
  conversionFactor: number;
}

export const confirmarImportacaoNFeAction = async (
  slug: string,
  xmlContent: string,
  mapeamentos: MapeamentoItem[],
): Promise<ImportarXmlResult> => {
  const restaurant = await getRestaurantOrThrow(slug);

  try {
    const parsed = parseNFeXml(xmlContent);

    // Upsert fornecedor pelo CNPJ
    let supplierId: string | null = null;
    if (parsed.supplierCnpj) {
      const [existing] = await db
        .select({ id: suppliersTable.id })
        .from(suppliersTable)
        .where(and(eq(suppliersTable.restaurantId, restaurant.id), eq(suppliersTable.cnpj, parsed.supplierCnpj)))
        .limit(1);

      if (existing) {
        supplierId = existing.id;
      } else {
        const [newSupplier] = await db.insert(suppliersTable).values({
          restaurantId: restaurant.id,
          companyName: parsed.supplierName || parsed.supplierCnpj,
          cnpj: parsed.supplierCnpj,
        }).returning({ id: suppliersTable.id });
        supplierId = newSupplier?.id ?? null;
      }
    }

    // Criar nota de compra
    const [invoice] = await db.insert(purchaseInvoicesTable).values({
      restaurantId: restaurant.id,
      supplierId,
      accessKey: parsed.accessKey || null,
      invoiceNumber: parsed.invoiceNumber || null,
      totalAmount: parsed.totalAmount,
      xmlContent,
      issuedAt: parsed.issuedAt,
      items: mapeamentos,
    }).returning({ id: purchaseInvoicesTable.id });

    const invoiceId = invoice?.id ?? null;

    // Dar entrada nos insumos mapeados
    for (const map of mapeamentos) {
      if (!map.inventoryItemId) continue;

      const effectiveQty = map.quantity * map.conversionFactor;
      const [item] = await db
        .select({ currentQuantity: inventoryItemsTable.currentQuantity, unitCost: inventoryItemsTable.unitCost })
        .from(inventoryItemsTable)
        .where(and(eq(inventoryItemsTable.id, map.inventoryItemId), eq(inventoryItemsTable.restaurantId, restaurant.id)))
        .limit(1);

      if (!item) continue;

      const prevQty = item.currentQuantity;
      const nextQty = prevQty + effectiveQty;
      const newAvgCost = prevQty > 0
        ? ((item.unitCost ?? 0) * prevQty + map.unitCost * effectiveQty) / nextQty
        : map.unitCost;

      await db.update(inventoryItemsTable).set({
        currentQuantity: nextQty,
        unitCost: newAvgCost,
        updatedAt: new Date(),
      }).where(eq(inventoryItemsTable.id, map.inventoryItemId));

      await db.insert(stockMovementsTable).values({
        restaurantId: restaurant.id,
        inventoryItemId: map.inventoryItemId,
        type: "IN",
        quantityDelta: effectiveQty,
        previousQuantity: prevQty,
        currentQuantity: nextQty,
        reason: `Entrada via NF-e ${parsed.invoiceNumber || "s/n"} — ${map.nfeName}`,
      });

      if (invoiceId) {
        await db.insert(inventoryBatchesTable).values({
          restaurantId: restaurant.id,
          inventoryItemId: map.inventoryItemId,
          purchaseInvoiceId: invoiceId,
          quantity: effectiveQty,
          unitCost: map.unitCost,
        });
      }
    }

    revalidateRestaurantPaths(slug);
    return { success: true, invoiceId: invoiceId ?? undefined, supplierId: supplierId ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido.";
    return { success: false, error: msg };
  }
};
