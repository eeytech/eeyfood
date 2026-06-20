"use server";

import {
  abrirComandaMesa,
  adicionarItensComanda,
  buscarPedidoRecebimentoPorId,
  criarTransacaoFinanceira,
  fecharComanda,
  diningTablesTable,
  financialTransactionsTable,
  ordersTable,
  db,
  and,
  eq,
  ne,
  sql,
  type PaymentMethod,
} from "@fsw/db";
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
