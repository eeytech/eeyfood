"use server";

import {
  buscarRestaurantePorSlug,
  companyVehiclesTable,
  couriersTable,
  db,
  despacharPedido,
  eq,
  listarCouriersPorSlug,
  restaurantsTable,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getBooleanValue,
  getOptionalStringValue,
  getStringValue,
} from "@/lib/admin-form-utils";

const courierSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome válido."),
  phone: z.string().trim().min(10, "Informe um telefone válido."),
  vehicleType: z.string().trim().optional(),
  licensePlate: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
  rg: z.string().trim().optional(),
  cep: z.string().trim().optional(),
  logradouro: z.string().trim().optional(),
  numero: z.string().trim().optional(),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  estado: z.string().trim().optional(),
  cnhNumero: z.string().trim().optional(),
  cnhCategoria: z.string().trim().optional(),
  cnhVencimento: z.string().trim().optional().nullable(),
  usesOwnVehicle: z.boolean().default(true),
  workDays: z.array(z.string()).optional().default([]),
  shiftStart: z.string().trim().optional(),
  shiftEnd: z.string().trim().optional(),
  isAvailable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const vehicleSchema = z.object({
  brand: z.string().trim().min(1, "Informe a marca do veículo."),
  model: z.string().trim().min(1, "Informe o modelo do veículo."),
  year: z.number().int().optional().nullable(),
  color: z.string().trim().optional(),
  licensePlate: z.string().trim().min(1, "Informe a placa do veículo."),
  renavam: z.string().trim().optional(),
  chassi: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]).default("ACTIVE"),
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

  const workDays = formData.getAll("workDays") as string[];

  const parsedData = courierSchema.safeParse({
    name: getStringValue(formData.get("name")),
    phone: getStringValue(formData.get("phone")),
    vehicleType: getOptionalStringValue(formData.get("vehicleType")),
    licensePlate: getOptionalStringValue(formData.get("licensePlate")),
    cpf: getOptionalStringValue(formData.get("cpf")),
    rg: getOptionalStringValue(formData.get("rg")),
    cep: getOptionalStringValue(formData.get("cep")),
    logradouro: getOptionalStringValue(formData.get("logradouro")),
    numero: getOptionalStringValue(formData.get("numero")),
    complemento: getOptionalStringValue(formData.get("complemento")),
    bairro: getOptionalStringValue(formData.get("bairro")),
    cidade: getOptionalStringValue(formData.get("cidade")),
    estado: getOptionalStringValue(formData.get("estado")),
    cnhNumero: getOptionalStringValue(formData.get("cnhNumero")),
    cnhCategoria: getOptionalStringValue(formData.get("cnhCategoria")),
    cnhVencimento: getOptionalStringValue(formData.get("cnhVencimento")) ?? null,
    usesOwnVehicle: getBooleanValue(formData.get("usesOwnVehicle")),
    workDays,
    shiftStart: getOptionalStringValue(formData.get("shiftStart")),
    shiftEnd: getOptionalStringValue(formData.get("shiftEnd")),
    isAvailable: getBooleanValue(formData.get("isAvailable")),
    isActive: getBooleanValue(formData.get("isActive")),
  });

  if (!parsedData.success) {
    throw new Error("Dados inválidos: " + JSON.stringify(parsedData.error.flatten()));
  }

  await db.insert(couriersTable).values({
    ...parsedData.data,
    workDays: parsedData.data.workDays.length > 0 ? parsedData.data.workDays : null,
    cnhVencimento: parsedData.data.cnhVencimento ?? null,
    restaurantId: restaurant.id,
  });

  revalidatePath(`/${slug}/logistica`);
};

export const updateCourierAction = async (slug: string, formData: FormData) => {
  await getRestaurantOrThrow(slug);
  const courierId = getStringValue(formData.get("courierId"));

  const workDays = formData.getAll("workDays") as string[];

  const parsedData = courierSchema.safeParse({
    name: getStringValue(formData.get("name")),
    phone: getStringValue(formData.get("phone")),
    vehicleType: getOptionalStringValue(formData.get("vehicleType")),
    licensePlate: getOptionalStringValue(formData.get("licensePlate")),
    cpf: getOptionalStringValue(formData.get("cpf")),
    rg: getOptionalStringValue(formData.get("rg")),
    cep: getOptionalStringValue(formData.get("cep")),
    logradouro: getOptionalStringValue(formData.get("logradouro")),
    numero: getOptionalStringValue(formData.get("numero")),
    complemento: getOptionalStringValue(formData.get("complemento")),
    bairro: getOptionalStringValue(formData.get("bairro")),
    cidade: getOptionalStringValue(formData.get("cidade")),
    estado: getOptionalStringValue(formData.get("estado")),
    cnhNumero: getOptionalStringValue(formData.get("cnhNumero")),
    cnhCategoria: getOptionalStringValue(formData.get("cnhCategoria")),
    cnhVencimento: getOptionalStringValue(formData.get("cnhVencimento")) ?? null,
    usesOwnVehicle: getBooleanValue(formData.get("usesOwnVehicle")),
    workDays,
    shiftStart: getOptionalStringValue(formData.get("shiftStart")),
    shiftEnd: getOptionalStringValue(formData.get("shiftEnd")),
    isAvailable: getBooleanValue(formData.get("isAvailable")),
    isActive: getBooleanValue(formData.get("isActive")),
  });

  if (!parsedData.success) {
    throw new Error("Dados inválidos.");
  }

  await db
    .update(couriersTable)
    .set({
      ...parsedData.data,
      workDays: parsedData.data.workDays.length > 0 ? parsedData.data.workDays : null,
      cnhVencimento: parsedData.data.cnhVencimento ?? null,
      updatedAt: new Date(),
    })
    .where(eq(couriersTable.id, courierId));

  revalidatePath(`/${slug}/logistica`);
};

export const deleteCourierAction = async (slug: string, formData: FormData) => {
  const courierId = getStringValue(formData.get("courierId"));

  await db.delete(couriersTable).where(eq(couriersTable.id, courierId));

  revalidatePath(`/${slug}/logistica`);
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

export const createVehicleAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const yearRaw = getStringValue(formData.get("year"));
  const parsedData = vehicleSchema.safeParse({
    brand: getStringValue(formData.get("brand")),
    model: getStringValue(formData.get("model")),
    year: yearRaw ? parseInt(yearRaw, 10) : null,
    color: getOptionalStringValue(formData.get("color")),
    licensePlate: getStringValue(formData.get("licensePlate")),
    renavam: getOptionalStringValue(formData.get("renavam")),
    chassi: getOptionalStringValue(formData.get("chassi")),
    status: getStringValue(formData.get("status")) || "ACTIVE",
  });

  if (!parsedData.success) {
    throw new Error("Dados inválidos: " + JSON.stringify(parsedData.error.flatten()));
  }

  await db.insert(companyVehiclesTable).values({
    ...parsedData.data,
    restaurantId: restaurant.id,
  });

  revalidatePath(`/${slug}/logistica`);
};

export const updateVehicleAction = async (slug: string, formData: FormData) => {
  await getRestaurantOrThrow(slug);
  const vehicleId = getStringValue(formData.get("vehicleId"));

  const yearRaw = getStringValue(formData.get("year"));
  const parsedData = vehicleSchema.safeParse({
    brand: getStringValue(formData.get("brand")),
    model: getStringValue(formData.get("model")),
    year: yearRaw ? parseInt(yearRaw, 10) : null,
    color: getOptionalStringValue(formData.get("color")),
    licensePlate: getStringValue(formData.get("licensePlate")),
    renavam: getOptionalStringValue(formData.get("renavam")),
    chassi: getOptionalStringValue(formData.get("chassi")),
    status: getStringValue(formData.get("status")) || "ACTIVE",
  });

  if (!parsedData.success) {
    throw new Error("Dados inválidos.");
  }

  await db
    .update(companyVehiclesTable)
    .set({ ...parsedData.data, updatedAt: new Date() })
    .where(eq(companyVehiclesTable.id, vehicleId));

  revalidatePath(`/${slug}/logistica`);
};

export const deleteVehicleAction = async (slug: string, formData: FormData) => {
  const vehicleId = getStringValue(formData.get("vehicleId"));

  await db.delete(companyVehiclesTable).where(eq(companyVehiclesTable.id, vehicleId));

  revalidatePath(`/${slug}/logistica`);
};

const deliveryParamsSchema = z.object({
  deliveryFee: z.number().min(0, "Taxa de entrega não pode ser negativa."),
  minimumOrderValue: z.number().min(0, "Valor mínimo não pode ser negativo."),
  freeDeliveryThreshold: z.number().min(0).nullable(),
  estimatedDeliveryTime: z.string().trim().optional(),
});

export const updateDeliveryParamsAction = async (
  slug: string,
  formData: FormData,
) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const freeThresholdRaw = getStringValue(formData.get("freeDeliveryThreshold"));

  const parsedData = deliveryParamsSchema.safeParse({
    deliveryFee: parseFloat(getStringValue(formData.get("deliveryFee"))) || 0,
    minimumOrderValue:
      parseFloat(getStringValue(formData.get("minimumOrderValue"))) || 0,
    freeDeliveryThreshold:
      freeThresholdRaw !== "" ? parseFloat(freeThresholdRaw) || 0 : null,
    estimatedDeliveryTime:
      getOptionalStringValue(formData.get("estimatedDeliveryTime")),
  });

  if (!parsedData.success) {
    throw new Error("Dados inválidos: " + JSON.stringify(parsedData.error.flatten()));
  }

  await db
    .update(restaurantsTable)
    .set({ ...parsedData.data, updatedAt: new Date() })
    .where(eq(restaurantsTable.id, restaurant.id));

  revalidatePath(`/${slug}/logistica`);
};
