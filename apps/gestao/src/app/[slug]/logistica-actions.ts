"use server";

import {
  buscarRestaurantePorSlug,
  couriersTable,
  db,
  despacharPedido,
  eq,
  listarCouriersPorSlug,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getBooleanValue,
  getStringValue,
} from "@/lib/admin-form-utils";

const courierSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome válido."),
  phone: z.string().trim().min(10, "Informe um telefone válido."),
  vehicleType: z.string().trim().optional(),
  licensePlate: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    throw new Error("Restaurante não encontrado.");
  }

  return restaurant;
};

export const createCourierAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const parsedData = courierSchema.safeParse({
    name: getStringValue(formData.get("name")),
    phone: getStringValue(formData.get("phone")),
    vehicleType: getStringValue(formData.get("vehicleType")),
    licensePlate: getStringValue(formData.get("licensePlate")),
    isActive: getBooleanValue(formData.get("isActive")),
  });

  if (!parsedData.success) {
    throw new Error("Dados inválidos: " + JSON.stringify(parsedData.error.flatten()));
  }

  await db.insert(couriersTable).values({
    ...parsedData.data,
    restaurantId: restaurant.id,
  });

  revalidatePath(`/${slug}/couriers`);
};

export const updateCourierAction = async (slug: string, formData: FormData) => {
  await getRestaurantOrThrow(slug);
  const courierId = getStringValue(formData.get("courierId"));

  const parsedData = courierSchema.safeParse({
    name: getStringValue(formData.get("name")),
    phone: getStringValue(formData.get("phone")),
    vehicleType: getStringValue(formData.get("vehicleType")),
    licensePlate: getStringValue(formData.get("licensePlate")),
    isActive: getBooleanValue(formData.get("isActive")),
  });

  if (!parsedData.success) {
    throw new Error("Dados inválidos.");
  }

  await db
    .update(couriersTable)
    .set({
      ...parsedData.data,
      updatedAt: new Date(),
    })
    .where(eq(couriersTable.id, courierId));

  revalidatePath(`/${slug}/couriers`);
};

export const deleteCourierAction = async (slug: string, formData: FormData) => {
  const courierId = getStringValue(formData.get("courierId"));

  await db.delete(couriersTable).where(eq(couriersTable.id, courierId));

  revalidatePath(`/${slug}/couriers`);
};

export const dispatchOrderAction = async (orderId: number, courierId: string) => {
  const result = await despacharPedido({ orderId, courierId });
  
  if (result) {
    revalidatePath(`/${result.restaurantSlug}/pedidos`);
  }

  return result;
};

export const getCouriersAction = async (slug: string) => {
  return listarCouriersPorSlug(slug);
};
