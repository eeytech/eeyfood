"use server";

import { abrirComandaMesa, adicionarItensComanda, buscarPedidoRecebimentoPorId, buscarRestaurantePorSlug, criarTransacaoFinanceira, fecharComanda, transferirItensComanda, unirMesas, diningTablesTable, financialTransactionsTable, ordersTable, tableReservationsTable, waitingQueueTable, comandasAvulsasTable, db, and, eq, ne, sql } from "@fsw/db";
import type { PaymentMethod, ReservationStatus, QueueStatus } from "@fsw/db";
import { revalidatePath } from "next/cache";

import { notificarAtualizacaoPedido } from "@/lib/notificar-atualizacao-pedido";

interface AbrirMesaActionInput {
  slug: string;
  diningTableId: string;
  customerName?: string;
}

interface AdicionarItensComandaActionInput {
  slug: string;
  orderId: number;
  products: Array<{
    id: string;
    quantity: number;
  }>;
}

interface FecharComandaActionInput {
  slug: string;
  orderId: number;
  paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">;
}

interface TransferirMesaActionInput {
  slug: string;
  orderId: number;
  novoTableId: string;
}

interface RegistrarPagamentoParcialInput {
  slug: string;
  orderId: number;
  amount: number;
  paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">;
}

const revalidarRotasComanda = (slug: string) => {
  revalidatePath(`/${slug}/comandas`);
  revalidatePath(`/${slug}/pedidos`);
  revalidatePath(`/${slug}/estoque`);
  revalidatePath(`/${slug}/relatorios`);
};

export const abrirMesaAction = async ({
  slug,
  diningTableId,
  customerName,
}: AbrirMesaActionInput) => {
  const order = await abrirComandaMesa({
    slug,
    diningTableId,
    customerName,
  });

  revalidarRotasComanda(slug);
  return order;
};

export const adicionarItensComandaAction = async ({
  slug,
  orderId,
  products,
}: AdicionarItensComandaActionInput) => {
  const orderBeforeUpdate = await buscarPedidoRecebimentoPorId(orderId);
  const order = await adicionarItensComanda({
    orderId,
    products,
  });

  revalidarRotasComanda(slug);

  await notificarAtualizacaoPedido({
    orderId: order.id,
    restaurantSlug: slug,
    status:
      orderBeforeUpdate?.orderProducts.length === 0
        ? "PENDING"
        : order.status,
    paymentStatus: order.paymentStatus,
  });

  return order;
};

export const fecharComandaAction = async ({
  slug,
  orderId,
  paymentMethod,
}: FecharComandaActionInput) => {
  const order = await fecharComanda({
    orderId,
    paymentMethod,
  });

  revalidarRotasComanda(slug);

  await notificarAtualizacaoPedido({
    orderId: order.id,
    restaurantSlug: slug,
    status: order.status,
    paymentStatus: order.paymentStatus,
  });

  return order;
};

export const transferirMesaAction = async ({
  slug,
  orderId,
  novoTableId,
}: TransferirMesaActionInput) => {
  const [order] = await db
    .select({
      id: ordersTable.id,
      diningTableId: ordersTable.diningTableId,
      consumptionMethod: ordersTable.consumptionMethod,
      status: ordersTable.status,
      restaurantId: ordersTable.restaurantId,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) {
    throw new Error("Comanda nao encontrada.");
  }

  if (order.consumptionMethod !== "DINE_IN") {
    throw new Error("Esta comanda nao pertence a uma mesa.");
  }

  if (order.status === "FINISHED" || order.status === "CANCELLED") {
    throw new Error("Nao e possivel transferir uma comanda encerrada.");
  }

  // Validate destination table belongs to this restaurant and is active
  const [destinationTable] = await db
    .select({ id: diningTablesTable.id, name: diningTablesTable.name })
    .from(diningTablesTable)
    .where(
      and(
        eq(diningTablesTable.id, novoTableId),
        eq(diningTablesTable.restaurantId, order.restaurantId),
        eq(diningTablesTable.isActive, true),
      ),
    )
    .limit(1);

  if (!destinationTable) {
    throw new Error("Mesa de destino nao encontrada ou inativa.");
  }

  // Ensure destination table has no active DINE_IN order
  const [existingActiveOrder] = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.diningTableId, novoTableId),
        eq(ordersTable.consumptionMethod, "DINE_IN"),
        ne(ordersTable.status, "FINISHED"),
        ne(ordersTable.status, "CANCELLED"),
      ),
    )
    .limit(1);

  if (existingActiveOrder) {
    throw new Error("Mesa de destino ja esta ocupada com outra comanda ativa.");
  }

  await db
    .update(ordersTable)
    .set({ diningTableId: novoTableId, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));

  const updatedOrder = await buscarPedidoRecebimentoPorId(orderId);

  if (!updatedOrder) {
    throw new Error("Erro ao carregar comanda apos a transferencia.");
  }

  revalidarRotasComanda(slug);

  await notificarAtualizacaoPedido({
    orderId,
    restaurantSlug: slug,
    status: updatedOrder.status,
    paymentStatus: updatedOrder.paymentStatus,
  });

  return updatedOrder;
};

export const registrarPagamentoParcialAction = async ({
  slug,
  orderId,
  amount,
  paymentMethod,
}: RegistrarPagamentoParcialInput): Promise<{ amountPaid: number }> => {
  if (amount <= 0) {
    throw new Error("Valor de pagamento invalido.");
  }

  const [order] = await db
    .select({ restaurantId: ordersTable.restaurantId })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) {
    throw new Error("Comanda nao encontrada.");
  }

  const formaLabel =
    paymentMethod === "DINHEIRO" ? "Dinheiro" : "Cartao presencial";

  await criarTransacaoFinanceira({
    description: `Pagamento parcial (${formaLabel}) — Comanda #${orderId}`,
    amount,
    type: "REVENUE",
    status: "PAID",
    dueDate: new Date(),
    paidAt: new Date(),
    categoryId: null,
    orderId,
    restaurantId: order.restaurantId,
    bankAccountId: null,
  });

  revalidarRotasComanda(slug);

  return { amountPaid: amount };
};

export const buscarPagamentosParciaisAction = async (
  orderId: number,
): Promise<{ totalPago: number }> => {
  const [result] = await db
    .select({
      totalPago:
        sql<number>`COALESCE(SUM(${financialTransactionsTable.amount}), 0)`,
    })
    .from(financialTransactionsTable)
    .where(
      and(
        eq(financialTransactionsTable.orderId, orderId),
        eq(financialTransactionsTable.type, "REVENUE"),
        eq(financialTransactionsTable.status, "PAID"),
      ),
    );

  return { totalPago: Number(result?.totalPago ?? 0) };
};

// ── Item transfer ───────────────────────────────────────────────────────────

interface TransferirItensComandaActionInput {
  slug: string;
  sourceOrderId: number;
  destinationOrderId: number;
  orderProductIds: string[];
}

export const transferirItensComandaAction = async ({
  slug,
  sourceOrderId,
  destinationOrderId,
  orderProductIds,
}: TransferirItensComandaActionInput) => {
  if (orderProductIds.length === 0) {
    throw new Error("Selecione ao menos um item para transferir.");
  }

  await transferirItensComanda({ sourceOrderId, destinationOrderId, orderProductIds });

  revalidarRotasComanda(slug);

  const [src, dst] = await Promise.all([
    buscarPedidoRecebimentoPorId(sourceOrderId),
    buscarPedidoRecebimentoPorId(destinationOrderId),
  ]);

  return { sourceOrder: src, destinationOrder: dst };
};

// ── Table merge ─────────────────────────────────────────────────────────────

interface UnirMesasActionInput {
  slug: string;
  mainOrderId: number;
  secondaryOrderId: number;
}

export const unirMesasAction = async ({
  slug,
  mainOrderId,
  secondaryOrderId,
}: UnirMesasActionInput) => {
  await unirMesas({ mainOrderId, secondaryOrderId });

  revalidarRotasComanda(slug);

  const updatedMain = await buscarPedidoRecebimentoPorId(mainOrderId);
  return updatedMain;
};

// ── Reservations ────────────────────────────────────────────────────────────

interface CriarReservaActionInput {
  slug: string;
  customerName: string;
  customerPhone?: string;
  partySize: number;
  scheduledFor: string;
  diningTableId?: string;
  notes?: string;
}

export const criarReservaAction = async ({
  slug,
  customerName,
  customerPhone,
  partySize,
  scheduledFor,
  diningTableId,
  notes,
}: CriarReservaActionInput) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante nao encontrado.");

  const [reserva] = await db
    .insert(tableReservationsTable)
    .values({
      restaurantId: restaurant.id,
      customerName,
      customerPhone: customerPhone ?? null,
      partySize,
      scheduledFor: new Date(scheduledFor),
      diningTableId: diningTableId ?? null,
      notes: notes ?? null,
      status: "PENDING",
    })
    .returning();

  revalidatePath(`/${slug}/comandas`);
  return reserva;
};

export const atualizarStatusReservaAction = async ({
  slug,
  reservaId,
  status,
}: {
  slug: string;
  reservaId: string;
  status: ReservationStatus;
}) => {
  await db
    .update(tableReservationsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(tableReservationsTable.id, reservaId));

  revalidatePath(`/${slug}/comandas`);
};

// ── Waiting queue ───────────────────────────────────────────────────────────

interface AdicionarClienteFilaActionInput {
  slug: string;
  customerName: string;
  partySize: number;
}

export const adicionarClienteFilaAction = async ({
  slug,
  customerName,
  partySize,
}: AdicionarClienteFilaActionInput) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante nao encontrado.");

  const [lastEntry] = await db
    .select({ position: waitingQueueTable.position })
    .from(waitingQueueTable)
    .where(
      and(
        eq(waitingQueueTable.restaurantId, restaurant.id),
        eq(waitingQueueTable.status, "WAITING"),
      ),
    )
    .orderBy(sql`${waitingQueueTable.position} DESC`)
    .limit(1);

  const nextPosition = (lastEntry?.position ?? 0) + 1;

  const [entry] = await db
    .insert(waitingQueueTable)
    .values({
      restaurantId: restaurant.id,
      position: nextPosition,
      customerName,
      partySize,
      status: "WAITING",
    })
    .returning();

  revalidatePath(`/${slug}/comandas`);
  return entry;
};

export const atualizarStatusFilaAction = async ({
  slug,
  entryId,
  status,
  diningTableId,
}: {
  slug: string;
  entryId: string;
  status: QueueStatus;
  diningTableId?: string;
}) => {
  await db
    .update(waitingQueueTable)
    .set({
      status,
      diningTableId: diningTableId ?? null,
      seatedAt: status === "SEATED" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(waitingQueueTable.id, entryId));

  revalidatePath(`/${slug}/comandas`);
};

// ── Comandas Avulsas ────────────────────────────────────────────────────────

interface AbrirComandaAvulsaActionInput {
  slug: string;
  customerName?: string;
  barcode?: string;
}

export const abrirComandaAvulsaAction = async ({
  slug,
  customerName,
  barcode,
}: AbrirComandaAvulsaActionInput) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante nao encontrado.");

  const [lastComanda] = await db
    .select({ numero: comandasAvulsasTable.numero })
    .from(comandasAvulsasTable)
    .where(eq(comandasAvulsasTable.restaurantId, restaurant.id))
    .orderBy(sql`${comandasAvulsasTable.numero} DESC`)
    .limit(1);

  const nextNumero = (lastComanda?.numero ?? 0) + 1;
  const nomeCliente = customerName ?? `Comanda ${nextNumero}`;

  const [newOrder] = await db
    .insert(ordersTable)
    .values({
      restaurantId: restaurant.id,
      diningTableId: null,
      status: "PENDING",
      paymentStatus: "PENDING",
      consumptionMethod: "DINE_IN",
      paymentMethod: "DINHEIRO",
      customerName: nomeCliente,
      customerPhone: "",
      subtotal: 0,
      total: 0,
      deliveryFee: 0,
      discountAmount: 0,
      couponDiscountAmount: 0,
      cashbackRedeemedAmount: 0,
      cashbackEarnedAmount: 0,
      estimatedCost: 0,
      estimatedProfit: 0,
      serviceFeeAmount: 0,
    })
    .returning();

  if (!newOrder) throw new Error("Erro ao criar ordem para comanda avulsa.");

  const [comanda] = await db
    .insert(comandasAvulsasTable)
    .values({
      restaurantId: restaurant.id,
      numero: nextNumero,
      customerName: customerName ?? null,
      barcode: barcode ?? null,
      orderId: newOrder.id,
      status: "ACTIVE",
    })
    .returning();

  const order = await buscarPedidoRecebimentoPorId(newOrder.id);

  revalidarRotasComanda(slug);
  return { comanda, order };
};

export const fecharComandaAvulsaAction = async ({
  slug,
  comandaId,
  orderId,
  paymentMethod,
}: {
  slug: string;
  comandaId: string;
  orderId: number;
  paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">;
}) => {
  const order = await fecharComanda({ orderId, paymentMethod });

  await db
    .update(comandasAvulsasTable)
    .set({ status: "CLOSED", updatedAt: new Date() })
    .where(eq(comandasAvulsasTable.id, comandaId));

  revalidarRotasComanda(slug);
  return order;
};
