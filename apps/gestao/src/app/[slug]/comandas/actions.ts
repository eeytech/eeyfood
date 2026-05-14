"use server";

import {
  abrirComandaMesa,
  adicionarItensComanda,
  buscarPedidoRecebimentoPorId,
  fecharComanda,
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
