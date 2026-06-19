"use server";

import {
  buscarRestaurantePorSlug,
  couponsTable,
  db,
  eq,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getBooleanValue,
  getNumberValue,
  getOptionalStringValue,
  getStringValue,
} from "@/lib/admin-form-utils";

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Informe o código do cupom.")
      .regex(/^\S+$/, "O código não pode conter espaços."),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
    discountType: z.enum(["PERCENTAGE", "FIXED"], "Selecione o tipo de desconto."),
    discountValue: z.number().positive("O valor do desconto deve ser positivo."),
    minimumOrderValue: z.number().min(0, "O valor mínimo não pode ser negativo."),
    maxDiscountAmount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    perCustomerLimit: z.number().int().min(1).default(1),
    startsAt: z.date().optional(),
    endsAt: z.date().optional(),
  })
  .refine(
    (data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt,
    { message: "A data final deve ser posterior à data inicial.", path: ["endsAt"] },
  );

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");
  return restaurant;
};

const parseFormData = (formData: FormData) => {
  const startsAtRaw = getOptionalStringValue(formData.get("startsAt"));
  const endsAtRaw = getOptionalStringValue(formData.get("endsAt"));
  const maxDiscountRaw = getOptionalStringValue(formData.get("maxDiscountAmount"));
  const usageLimitRaw = getOptionalStringValue(formData.get("usageLimit"));

  return couponSchema.safeParse({
    code: getStringValue(formData.get("code")).toUpperCase().replace(/\s/g, ""),
    description: getOptionalStringValue(formData.get("description")),
    isActive: getBooleanValue(formData.get("isActive")),
    discountType: getStringValue(formData.get("discountType")),
    discountValue: getNumberValue(formData.get("discountValue")),
    minimumOrderValue: getNumberValue(formData.get("minimumOrderValue")),
    maxDiscountAmount: maxDiscountRaw ? getNumberValue(formData.get("maxDiscountAmount")) : undefined,
    usageLimit: usageLimitRaw ? parseInt(usageLimitRaw, 10) : undefined,
    perCustomerLimit: getNumberValue(formData.get("perCustomerLimit")) || 1,
    startsAt: startsAtRaw ? new Date(startsAtRaw) : undefined,
    endsAt: endsAtRaw ? new Date(endsAtRaw) : undefined,
  });
};

export const createCouponAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const parsedData = parseFormData(formData);

  if (!parsedData.success) {
    throw new Error(parsedData.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await db.insert(couponsTable).values({
    ...parsedData.data,
    restaurantId: restaurant.id,
  });

  revalidatePath(`/${slug}/cupons`);
};

export const updateCouponAction = async (slug: string, formData: FormData) => {
  await getRestaurantOrThrow(slug);
  const couponId = getStringValue(formData.get("couponId"));

  if (!couponId) throw new Error("ID do cupom não informado.");

  const parsedData = parseFormData(formData);

  if (!parsedData.success) {
    throw new Error(parsedData.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await db
    .update(couponsTable)
    .set({ ...parsedData.data, updatedAt: new Date() })
    .where(eq(couponsTable.id, couponId));

  revalidatePath(`/${slug}/cupons`);
};

export const deleteCouponAction = async (slug: string, formData: FormData) => {
  const couponId = getStringValue(formData.get("couponId"));

  if (!couponId) throw new Error("ID do cupom não informado.");

  await db.delete(couponsTable).where(eq(couponsTable.id, couponId));

  revalidatePath(`/${slug}/cupons`);
};
