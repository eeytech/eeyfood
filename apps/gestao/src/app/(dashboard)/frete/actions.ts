"use server";

import {
  and,
  asc,
  buscarRestaurantePorSlug,
  db,
  eq,
  freeDeliveryRulesTable,
  restaurantsTable,
} from "@fsw/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { ensureFreeDeliveryTable } from "@/lib/admin-queries";

const freeDeliveryRuleSchema = z.object({
  name: z.string().min(1, "A descrição da regra é obrigatória."),
  criterion: z.enum(["MIN_ORDER_VALUE", "FIRST_PURCHASE", "CATEGORY", "PRODUCT"]),
  minOrderValue: z.number().min(0, "O valor não pode ser negativo.").default(0),
  menuCategoryId: z.string().uuid("Categoria inválida.").optional().nullable(),
  productId: z.string().uuid("Produto inválido.").optional().nullable(),
  isActive: z.boolean().default(true),
  startsAt: z.date().optional().nullable(),
  endsAt: z.date().optional().nullable(),
});

function getOptionalString(val: FormDataEntryValue | null): string | null {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseMoney(val: FormDataEntryValue | null): number {
  if (!val) return 0;
  const str = String(val).replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.max(num, 0);
}

function parseDate(val: FormDataEntryValue | null): Date | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

async function sincronizarThresholdRestaurante(restaurantId: string, slug: string) {
  try {
    const activeMinRules = await db
      .select({ minOrderValue: freeDeliveryRulesTable.minOrderValue })
      .from(freeDeliveryRulesTable)
      .where(
        and(
          eq(freeDeliveryRulesTable.restaurantId, restaurantId),
          eq(freeDeliveryRulesTable.isActive, true),
          eq(freeDeliveryRulesTable.criterion, "MIN_ORDER_VALUE"),
        ),
      )
      .orderBy(asc(freeDeliveryRulesTable.minOrderValue));

    const lowestThreshold =
      activeMinRules.length > 0 ? Number(activeMinRules[0].minOrderValue) : null;

    await db
      .update(restaurantsTable)
      .set({
        freeDeliveryThreshold: lowestThreshold,
        updatedAt: new Date(),
      })
      .where(eq(restaurantsTable.id, restaurantId));
  } catch (err) {
    console.warn("⚠️ [sincronizarThresholdRestaurante] Notice:", err);
  }
}

function revalidateAll(slug: string) {
  revalidatePath(`/${slug}/frete`);
  revalidatePath(`/${slug}/logistica`);
  revalidatePath("/menu");
  revalidateTag(`restaurant-menu:${slug}`);
  revalidateTag("restaurant-menu:default");
}

export async function criarRegraFreteGratisAction(slug: string, formData: FormData) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    return { success: false, error: "Restaurante não encontrado." };
  }

  await ensureFreeDeliveryTable();

  const rawCriterion = String(formData.get("criterion") || "MIN_ORDER_VALUE");
  const criterion = ["MIN_ORDER_VALUE", "FIRST_PURCHASE", "CATEGORY", "PRODUCT"].includes(rawCriterion)
    ? (rawCriterion as "MIN_ORDER_VALUE" | "FIRST_PURCHASE" | "CATEGORY" | "PRODUCT")
    : "MIN_ORDER_VALUE";

  const rawName = String(formData.get("name") || "").trim();
  const minOrderValue = parseMoney(formData.get("minOrderValue"));
  const menuCategoryId = criterion === "CATEGORY" ? getOptionalString(formData.get("menuCategoryId")) : null;
  const productId = criterion === "PRODUCT" ? getOptionalString(formData.get("productId")) : null;
  const isActive = formData.get("isActive") === "true";
  const startsAt = parseDate(formData.get("startsAt"));
  const endsAt = parseDate(formData.get("endsAt"));

  const parsed = freeDeliveryRuleSchema.safeParse({
    name: rawName,
    criterion,
    minOrderValue,
    menuCategoryId,
    productId,
    isActive,
    startsAt,
    endsAt,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  if (criterion === "CATEGORY" && !menuCategoryId) {
    return { success: false, error: "Selecione uma categoria do cardápio." };
  }

  if (criterion === "PRODUCT" && !productId) {
    return { success: false, error: "Selecione um produto específico." };
  }

  if (startsAt && endsAt && startsAt > endsAt) {
    return { success: false, error: "A data inicial não pode ser posterior à data final." };
  }

  try {
    await db.insert(freeDeliveryRulesTable).values({
      restaurantId: restaurant.id,
      name: parsed.data.name,
      criterion: parsed.data.criterion,
      minOrderValue: parsed.data.minOrderValue,
      menuCategoryId: parsed.data.menuCategoryId ?? undefined,
      productId: parsed.data.productId ?? undefined,
      isActive: parsed.data.isActive,
      startsAt: parsed.data.startsAt ?? null,
      endsAt: parsed.data.endsAt ?? null,
    });

    await sincronizarThresholdRestaurante(restaurant.id, slug);
    revalidateAll(slug);

    return { success: true };
  } catch (error) {
    console.error("Erro ao criar regra de frete grátis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar regra.",
    };
  }
}

export async function atualizarRegraFreteGratisAction(
  slug: string,
  ruleId: string,
  formData: FormData,
) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    return { success: false, error: "Restaurante não encontrado." };
  }

  await ensureFreeDeliveryTable();

  const rawCriterion = String(formData.get("criterion") || "MIN_ORDER_VALUE");
  const criterion = ["MIN_ORDER_VALUE", "FIRST_PURCHASE", "CATEGORY", "PRODUCT"].includes(rawCriterion)
    ? (rawCriterion as "MIN_ORDER_VALUE" | "FIRST_PURCHASE" | "CATEGORY" | "PRODUCT")
    : "MIN_ORDER_VALUE";

  const rawName = String(formData.get("name") || "").trim();
  const minOrderValue = parseMoney(formData.get("minOrderValue"));
  const menuCategoryId = criterion === "CATEGORY" ? getOptionalString(formData.get("menuCategoryId")) : null;
  const productId = criterion === "PRODUCT" ? getOptionalString(formData.get("productId")) : null;
  const isActive = formData.get("isActive") === "true";
  const startsAt = parseDate(formData.get("startsAt"));
  const endsAt = parseDate(formData.get("endsAt"));

  const parsed = freeDeliveryRuleSchema.safeParse({
    name: rawName,
    criterion,
    minOrderValue,
    menuCategoryId,
    productId,
    isActive,
    startsAt,
    endsAt,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  if (criterion === "CATEGORY" && !menuCategoryId) {
    return { success: false, error: "Selecione uma categoria do cardápio." };
  }

  if (criterion === "PRODUCT" && !productId) {
    return { success: false, error: "Selecione um produto específico." };
  }

  if (startsAt && endsAt && startsAt > endsAt) {
    return { success: false, error: "A data inicial não pode ser posterior à data final." };
  }

  try {
    await db
      .update(freeDeliveryRulesTable)
      .set({
        name: parsed.data.name,
        criterion: parsed.data.criterion,
        minOrderValue: parsed.data.minOrderValue,
        menuCategoryId: parsed.data.menuCategoryId ?? null,
        productId: parsed.data.productId ?? null,
        isActive: parsed.data.isActive,
        startsAt: parsed.data.startsAt ?? null,
        endsAt: parsed.data.endsAt ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(freeDeliveryRulesTable.id, ruleId),
          eq(freeDeliveryRulesTable.restaurantId, restaurant.id),
        ),
      );

    await sincronizarThresholdRestaurante(restaurant.id, slug);
    revalidateAll(slug);

    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar regra de frete grátis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar regra.",
    };
  }
}

export async function alternarStatusRegraFreteGratisAction(
  slug: string,
  ruleId: string,
  isActive: boolean,
) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    return { success: false, error: "Restaurante não encontrado." };
  }

  await ensureFreeDeliveryTable();

  try {
    await db
      .update(freeDeliveryRulesTable)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(freeDeliveryRulesTable.id, ruleId),
          eq(freeDeliveryRulesTable.restaurantId, restaurant.id),
        ),
      );

    await sincronizarThresholdRestaurante(restaurant.id, slug);
    revalidateAll(slug);

    return { success: true };
  } catch (error) {
    console.error("Erro ao alternar status da regra:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar status.",
    };
  }
}

export async function excluirRegraFreteGratisAction(slug: string, ruleId: string) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    return { success: false, error: "Restaurante não encontrado." };
  }

  await ensureFreeDeliveryTable();

  try {
    await db
      .delete(freeDeliveryRulesTable)
      .where(
        and(
          eq(freeDeliveryRulesTable.id, ruleId),
          eq(freeDeliveryRulesTable.restaurantId, restaurant.id),
        ),
      );

    await sincronizarThresholdRestaurante(restaurant.id, slug);
    revalidateAll(slug);

    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir regra de frete grátis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir regra.",
    };
  }
}

export async function salvarFreteGratisAction(slug: string, formData: FormData) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    return { success: false, error: "Restaurante não encontrado." };
  }

  const enabled = formData.get("enabled") === "true";
  const rawThreshold = formData.get("threshold");
  const parsedThreshold =
    rawThreshold !== null && rawThreshold !== ""
      ? parseFloat(String(rawThreshold).replace(",", "."))
      : null;

  const threshold =
    enabled && parsedThreshold !== null && !isNaN(parsedThreshold) && parsedThreshold > 0
      ? parsedThreshold
      : null;

  try {
    await db
      .update(restaurantsTable)
      .set({
        freeDeliveryThreshold: threshold,
        updatedAt: new Date(),
      })
      .where(eq(restaurantsTable.id, restaurant.id));

    revalidateAll(slug);
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar configurações de frete grátis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar as configurações.",
    };
  }
}
