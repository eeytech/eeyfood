"use server";

import type { RestaurantStatus } from "@fsw/db";
import { buscarGruposAdicionaisDoRestaurante, buscarProdutoComOpcionaisGestao } from "@/lib/admin-queries";
import type { InventoryItemType, UnitOfMeasure } from "@fsw/db";
import {
  aiSettingsTable,
  and,
  buscarRestaurantePorSlug,
  db,
  eq,
  inventoryItemsTable,
  menuCategoriesTable,
  operatingHoursTable,
  productOptionGroupsTable,
  productOptionsTable,
  productToOptionGroupsTable,
  productsTable,
  recipeItemsTable,
  restaurantsTable,
  stockMovementsTable,
  type InventoryItem,
  type RecipeItem,
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
  ncm: z.string().trim().max(8, "NCM deve ter 8 dígitos.").optional(),
  cfop: z.string().trim().max(4, "CFOP deve ter 4 dígitos.").optional(),
  csosn: z.string().trim().max(3, "CSOSN deve ter 3 dígitos.").optional(),
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
    ncm: getOptionalStringValue(formData.get("ncm")),
    cfop: getOptionalStringValue(formData.get("cfop")),
    csosn: getOptionalStringValue(formData.get("csosn")),
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
    imageUrl: parsedData.data.imageUrl,
    trackInventory: parsedData.data.trackInventory,
    stockQuantity: parsedData.data.stockQuantity,
    lowStockThreshold: parsedData.data.lowStockThreshold,
    isActive: parsedData.data.isActive,
    ncm: parsedData.data.ncm,
    cfop: parsedData.data.cfop,
    csosn: parsedData.data.csosn,
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
      imageUrl: parsedData.data.imageUrl,
      trackInventory: parsedData.data.trackInventory,
      stockQuantity: parsedData.data.stockQuantity,
      lowStockThreshold: parsedData.data.lowStockThreshold,
      isActive: parsedData.data.isActive,
      ncm: parsedData.data.ncm,
      cfop: parsedData.data.cfop,
      csosn: parsedData.data.csosn,
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
