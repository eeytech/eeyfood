"use server";

import {
  buscarRestaurantePorSlug,
  db,
  eq,
  loyaltyRulesTable,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getBooleanValue,
  getNumberValue,
  getOptionalStringValue,
  getStringValue,
} from "@/lib/admin-form-utils";

const loyaltyRuleSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da regra."),
  cashbackPercent: z
    .number()
    .min(0, "O percentual não pode ser negativo.")
    .max(100, "O percentual não pode ser maior que 100."),
  criterionType: z.enum(["minOrderValue", "category", "product"]),
  minOrderValue: z.number().min(0).optional(),
  menuCategoryId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");
  return restaurant;
};

const parseFormData = (formData: FormData) => {
  const criterionType = getStringValue(formData.get("criterionType")) as
    | "minOrderValue"
    | "category"
    | "product";

  const categoryIdRaw = getOptionalStringValue(formData.get("menuCategoryId"));
  const productIdRaw = getOptionalStringValue(formData.get("productId"));

  return loyaltyRuleSchema.safeParse({
    name: getStringValue(formData.get("name")),
    cashbackPercent: getNumberValue(formData.get("cashbackPercent")),
    criterionType,
    minOrderValue:
      criterionType === "minOrderValue"
        ? getNumberValue(formData.get("minOrderValue"))
        : undefined,
    menuCategoryId: criterionType === "category" ? categoryIdRaw : undefined,
    productId: criterionType === "product" ? productIdRaw : undefined,
    isActive: getBooleanValue(formData.get("isActive")),
  });
};

export const createLoyaltyRuleAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const parsedData = parseFormData(formData);

  if (!parsedData.success) {
    throw new Error(parsedData.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const { criterionType, minOrderValue, menuCategoryId, productId, ...rest } = parsedData.data;

  await db.insert(loyaltyRulesTable).values({
    ...rest,
    restaurantId: restaurant.id,
    minOrderValue: criterionType === "minOrderValue" ? (minOrderValue ?? 0) : 0,
    menuCategoryId: criterionType === "category" ? menuCategoryId : undefined,
    productId: criterionType === "product" ? productId : undefined,
  });

  revalidatePath(`/${slug}/cashback`);
};

export const updateLoyaltyRuleAction = async (slug: string, formData: FormData) => {
  await getRestaurantOrThrow(slug);
  const ruleId = getStringValue(formData.get("ruleId"));

  if (!ruleId) throw new Error("ID da regra não informado.");

  const parsedData = parseFormData(formData);

  if (!parsedData.success) {
    throw new Error(parsedData.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const { criterionType, minOrderValue, menuCategoryId, productId, ...rest } = parsedData.data;

  await db
    .update(loyaltyRulesTable)
    .set({
      ...rest,
      minOrderValue: criterionType === "minOrderValue" ? (minOrderValue ?? 0) : 0,
      menuCategoryId: criterionType === "category" ? menuCategoryId : null,
      productId: criterionType === "product" ? productId : null,
      updatedAt: new Date(),
    })
    .where(eq(loyaltyRulesTable.id, ruleId));

  revalidatePath(`/${slug}/cashback`);
};

export const deleteLoyaltyRuleAction = async (slug: string, formData: FormData) => {
  const ruleId = getStringValue(formData.get("ruleId"));

  if (!ruleId) throw new Error("ID da regra não informado.");

  await db.delete(loyaltyRulesTable).where(eq(loyaltyRulesTable.id, ruleId));

  revalidatePath(`/${slug}/cashback`);
};
