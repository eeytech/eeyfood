"use server";

import {
  and,
  buscarRestaurantePorSlug,
  customerAddressesTable,
  customerInteractionsTable,
  customersTable,
  db,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  ne,
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

  const phoneList = customers.map((c) => c.phone).filter(Boolean);
  const addressMap: Record<string, string> = {};

  if (phoneList.length > 0) {
    // 1. Endereços salvos na tabela de endereços de clientes
    const savedAddresses = await db
      .select({
        phone: customerAddressesTable.customerPhone,
        street: customerAddressesTable.street,
        number: customerAddressesTable.number,
        complement: customerAddressesTable.complement,
        neighborhood: customerAddressesTable.neighborhood,
        city: customerAddressesTable.city,
        state: customerAddressesTable.state,
      })
      .from(customerAddressesTable)
      .where(inArray(customerAddressesTable.customerPhone, phoneList))
      .orderBy(desc(customerAddressesTable.lastUsedAt));

    for (const addr of savedAddresses) {
      if (!addressMap[addr.phone]) {
        const parts = [
          `${addr.street}, ${addr.number}`,
          addr.complement ? `(${addr.complement})` : null,
          addr.neighborhood,
          addr.city ? `${addr.city}${addr.state ? `/${addr.state}` : ""}` : null,
        ].filter(Boolean);
        addressMap[addr.phone] = parts.join(" - ");
      }
    }

    // 2. Endereços registrados diretamente nos pedidos de entrega
    const missingPhones = phoneList.filter((p) => !addressMap[p]);
    if (missingPhones.length > 0) {
      const orderAddresses = await db
        .select({
          phone: ordersTable.customerPhone,
          deliveryAddress: ordersTable.deliveryAddress,
        })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.restaurantId, restaurant.id),
            inArray(ordersTable.customerPhone, missingPhones),
            isNotNull(ordersTable.deliveryAddress),
            ne(ordersTable.deliveryAddress, ""),
          ),
        )
        .orderBy(desc(ordersTable.createdAt));

      for (const order of orderAddresses) {
        if (order.deliveryAddress && !addressMap[order.phone]) {
          addressMap[order.phone] = order.deliveryAddress;
        }
      }
    }
  }

  const customersWithAddress = customers.map((c) => ({
    ...c,
    deliveryAddress: addressMap[c.phone] ?? null,
  }));

  return {
    customers: customersWithAddress,
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

  const savedAddresses = await db
    .select()
    .from(customerAddressesTable)
    .where(eq(customerAddressesTable.customerPhone, customer.phone))
    .orderBy(desc(customerAddressesTable.lastUsedAt));

  return { customer, orders, addresses: savedAddresses };
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
