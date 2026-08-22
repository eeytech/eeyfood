"use server";

import {
  and,
  buscarRestaurantePorSlug,
  customersTable,
  customerInteractionsTable,
  db,
  desc,
  eq,
  ilike,
  or,
  ordersTable,
  sql,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getStringValue } from "@/lib/admin-form-utils";

export async function upsertCustomerOnOrderAction(
  restaurantId: string,
  order: {
    customerName: string;
    customerPhone: string;
    total: number;
    createdAt: Date;
  },
) {
  const existing = await db.query.customersTable.findFirst({
    where: and(
      eq(customersTable.restaurantId, restaurantId),
      eq(customersTable.phone, order.customerPhone),
    ),
  });

  if (!existing) {
    await db.insert(customersTable).values({
      restaurantId,
      name: order.customerName,
      phone: order.customerPhone,
      totalOrders: 1,
      totalSpent: order.total,
      avgTicket: order.total,
      firstOrderAt: order.createdAt,
      lastOrderAt: order.createdAt,
      segment: "NEW",
    });
    return;
  }

  const newTotalOrders = existing.totalOrders + 1;
  const newTotalSpent = existing.totalSpent + order.total;

  await db
    .update(customersTable)
    .set({
      name: order.customerName,
      totalOrders: newTotalOrders,
      totalSpent: newTotalSpent,
      avgTicket: newTotalSpent / newTotalOrders,
      lastOrderAt: order.createdAt,
      updatedAt: new Date(),
    })
    .where(eq(customersTable.id, existing.id));
}

export async function classificarClientesRFMAction(slug: string) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const now = new Date();
  const d15 = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const d45 = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
  const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const avgResult = await db
    .select({
      avgTicket: sql<number>`avg(${customersTable.avgTicket})`,
      avgOrders: sql<number>`avg(${customersTable.totalOrders})`,
    })
    .from(customersTable)
    .where(eq(customersTable.restaurantId, restaurant.id));

  const globalAvgTicket = avgResult[0]?.avgTicket ?? 0;
  const globalAvgOrders = avgResult[0]?.avgOrders ?? 0;

  const customers = await db.query.customersTable.findMany({
    where: eq(customersTable.restaurantId, restaurant.id),
  });

  for (const customer of customers) {
    const lastOrder = customer.lastOrderAt;
    let segment: "NEW" | "VIP" | "INACTIVE" | "AT_RISK" | "RECOVERED" = customer.segment as "NEW" | "VIP" | "INACTIVE" | "AT_RISK" | "RECOVERED";

    if (!lastOrder) {
      segment = "NEW";
    } else if (lastOrder >= d15 && customer.totalOrders === 1) {
      segment = "NEW";
    } else if (
      customer.avgTicket >= globalAvgTicket * 1.5 ||
      customer.totalOrders >= globalAvgOrders * 2
    ) {
      segment = "VIP";
    } else if (lastOrder < d90) {
      segment = "AT_RISK";
    } else if (lastOrder < d45) {
      segment = "INACTIVE";
    } else if (
      (segment === "INACTIVE" || segment === "AT_RISK") &&
      lastOrder >= d45
    ) {
      segment = "RECOVERED";
    } else {
      segment = "NEW";
    }

    await db
      .update(customersTable)
      .set({ segment, updatedAt: new Date() })
      .where(eq(customersTable.id, customer.id));
  }

  revalidatePath(`/${slug}/crm`);
  return { classified: customers.length };
}

export async function listarClientesCRMAction(
  slug: string,
  params: { segment?: string; search?: string; page?: number },
) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const PAGE_SIZE = 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [eq(customersTable.restaurantId, restaurant.id)];

  if (params.segment && params.segment !== "ALL") {
    conditions.push(
      eq(
        customersTable.segment,
        params.segment as "NEW" | "VIP" | "INACTIVE" | "AT_RISK" | "RECOVERED",
      ),
    );
  }

  if (params.search) {
    conditions.push(
      or(
        ilike(customersTable.name, `%${params.search}%`),
        ilike(customersTable.phone, `%${params.search}%`),
      )!,
    );
  }

  const customers = await db.query.customersTable.findMany({
    where: and(...conditions),
    orderBy: [desc(customersTable.lastOrderAt)],
    limit: PAGE_SIZE,
    offset,
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(customersTable)
    .where(and(...conditions));

  return {
    customers,
    total: Number(countResult[0]?.count ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function buscarClienteDetalheAction(slug: string, customerId: string) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const customer = await db.query.customersTable.findFirst({
    where: and(
      eq(customersTable.id, customerId),
      eq(customersTable.restaurantId, restaurant.id),
    ),
    with: { interactions: { orderBy: [desc(customerInteractionsTable.sentAt)], limit: 20 } },
  });

  if (!customer) throw new Error("Cliente não encontrado.");

  const orders = await db.query.ordersTable.findMany({
    where: and(
      eq(ordersTable.restaurantId, restaurant.id),
      eq(ordersTable.customerPhone, customer.phone),
    ),
    orderBy: [desc(ordersTable.createdAt)],
    limit: 30,
    with: { orderProducts: { with: { product: true } } },
  });

  return { customer, orders };
}

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email().optional().or(z.literal("")),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
});

export async function atualizarClienteAction(slug: string, customerId: string, formData: FormData) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const parsed = updateCustomerSchema.safeParse({
    name: getStringValue(formData.get("name")),
    email: getStringValue(formData.get("email")) || undefined,
    cpf: getStringValue(formData.get("cpf")) || undefined,
    birthDate: getStringValue(formData.get("birthDate")) || undefined,
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  await db
    .update(customersTable)
    .set({
      ...parsed.data,
      email: parsed.data.email || null,
      cpf: parsed.data.cpf || null,
      birthDate: parsed.data.birthDate || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customersTable.id, customerId),
        eq(customersTable.restaurantId, restaurant.id),
      ),
    );

  revalidatePath(`/${slug}/crm/${customerId}`);
}
