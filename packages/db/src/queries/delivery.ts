import { and, asc, eq } from "drizzle-orm";

import { db } from "../client.js";
import { couriersTable, courierTripsTable, deliveryFeeRulesTable, ordersTable } from "../schema.js";
import type { CourierTrip, DeliveryFeeRule } from "../types.js";

export interface CriarRegraFreteInput {
  restaurantId: string;
  name: string;
  type: "RADIUS_KM" | "NEIGHBORHOOD" | "CEP_RANGE";
  fee: number;
  minimumOrderValue?: number;
  freeDeliveryThreshold?: number | null;
  maxDistanceKm?: number | null;
  neighborhood?: string | null;
  cepFrom?: string | null;
  cepTo?: string | null;
  displayOrder?: number;
}

export const buscarRegrasFreteAtivas = async (restaurantId: string): Promise<DeliveryFeeRule[]> => {
  return db
    .select()
    .from(deliveryFeeRulesTable)
    .where(eq(deliveryFeeRulesTable.restaurantId, restaurantId))
    .orderBy(asc(deliveryFeeRulesTable.displayOrder));
};

export const criarRegraFrete = async (input: CriarRegraFreteInput): Promise<DeliveryFeeRule> => {
  const [rule] = await db.insert(deliveryFeeRulesTable).values(input).returning();
  if (!rule) throw new Error("Falha ao criar regra de frete.");
  return rule;
};

export const atualizarRegraFrete = async (
  id: string,
  data: Partial<CriarRegraFreteInput>,
): Promise<DeliveryFeeRule> => {
  const [rule] = await db
    .update(deliveryFeeRulesTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(deliveryFeeRulesTable.id, id))
    .returning();
  if (!rule) throw new Error("Regra de frete não encontrada.");
  return rule;
};

export const excluirRegraFrete = async (id: string): Promise<void> => {
  await db.delete(deliveryFeeRulesTable).where(eq(deliveryFeeRulesTable.id, id));
};

export const buscarPedidosParaEntregador = async (courierId: string) => {
  const courier = await db.select().from(couriersTable).where(eq(couriersTable.id, courierId)).limit(1);
  if (!courier[0]) return [];

  return db
    .select({
      id: ordersTable.id,
      customerName: ordersTable.customerName,
      deliveryAddress: ordersTable.deliveryAddress,
      deliveryLatitude: ordersTable.deliveryLatitude,
      deliveryLongitude: ordersTable.deliveryLongitude,
      total: ordersTable.total,
      status: ordersTable.status,
      courierId: ordersTable.courierId,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.restaurantId, courier[0].restaurantId),
        eq(ordersTable.consumptionMethod, "DELIVERY"),
        eq(ordersTable.status, "READY_FOR_PICKUP"),
      ),
    )
    .orderBy(asc(ordersTable.createdAt));
};

export const atualizarLocalizacaoEntregador = async (
  courierId: string,
  latitude: number,
  longitude: number,
): Promise<void> => {
  await db
    .update(couriersTable)
    .set({ latitude, longitude, updatedAt: new Date() })
    .where(eq(couriersTable.id, courierId));
};

export const registrarComprovanteEntrega = async (
  orderId: number,
  proofUrl: string,
  latitude?: number,
  longitude?: number,
): Promise<void> => {
  await db
    .update(ordersTable)
    .set({
      deliveryProofUrl: proofUrl,
      deliveryConfirmationLatitude: latitude,
      deliveryConfirmationLongitude: longitude,
      status: "FINISHED",
      deliveredAt: new Date(),
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, orderId));
};

export interface CriarViagemMotoboyInput {
  restaurantId: string;
  courierId: string;
  orderIds: number[];
  commissionAmount?: number;
}

export const criarViagemMotoboy = async (input: CriarViagemMotoboyInput): Promise<CourierTrip> => {
  const [trip] = await db
    .insert(courierTripsTable)
    .values({
      restaurantId: input.restaurantId,
      courierId: input.courierId,
      orderIds: input.orderIds,
      commissionAmount: input.commissionAmount ?? 0,
      status: "IN_TRANSIT",
    })
    .returning();
  if (!trip) throw new Error("Falha ao criar viagem.");
  return trip;
};

export const concluirViagemMotoboy = async (tripId: string): Promise<void> => {
  await db
    .update(courierTripsTable)
    .set({ status: "COMPLETED", returnedAt: new Date(), updatedAt: new Date() })
    .where(eq(courierTripsTable.id, tripId));
};
