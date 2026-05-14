"use server";

import {
  atualizarStatusPagamentoPedido,
  atualizarStatusPedido,
  criarPedido,
  type PaymentMethod,
} from "@fsw/db";
import { revalidatePath } from "next/cache";

import { notificarAtualizacaoPedido } from "@/lib/notificar-atualizacao-pedido";

interface FinalizarVendaPdvInput {
  slug: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">;
  products: Array<{
    id: string;
    quantity: number;
  }>;
}

interface FinalizarVendaPdvResult {
  success: boolean;
  message: string;
  orderId?: number;
  total?: number;
}

const normalizarTelefonePdv = (customerPhone?: string) => {
  const normalizedPhone = customerPhone?.replace(/\D/g, "") ?? "";

  if (normalizedPhone.length === 11) {
    return normalizedPhone;
  }

  return `PDV-${Date.now().toString()}`;
};

const revalidarRotasDoRestaurante = (slug: string) => {
  revalidatePath(`/${slug}/pdv`);
  revalidatePath(`/${slug}/pedidos`);
  revalidatePath(`/${slug}/estoque`);
  revalidatePath(`/${slug}/relatorios`);
  revalidatePath(`/${slug}/menu`, "page");
};

export const finalizarVendaPdv = async ({
  slug,
  customerName,
  customerPhone,
  paymentMethod,
  products,
}: FinalizarVendaPdvInput): Promise<FinalizarVendaPdvResult> => {
  if (products.length === 0) {
    return {
      success: false,
      message: "Adicione pelo menos um item antes de fechar a venda.",
    };
  }

  try {
    const order = await criarPedido({
      slug,
      customerName: customerName?.trim() || "Cliente do balcao",
      customerPhone: normalizarTelefonePdv(customerPhone),
      consumptionMethod: "TAKEAWAY",
      paymentMethod,
      products,
    });

    await atualizarStatusPagamentoPedido({
      orderId: order.id,
      paymentStatus: "PAID",
    });

    const updatedOrder = await atualizarStatusPedido({
      orderId: order.id,
      status: "FINISHED",
    });

    revalidarRotasDoRestaurante(slug);

    if (updatedOrder) {
      await notificarAtualizacaoPedido({
        orderId: order.id,
        restaurantSlug: slug,
        status: updatedOrder.status,
        paymentStatus: "PAID",
      });
    }

    return {
      success: true,
      message: "Venda registrada com sucesso no PDV.",
      orderId: order.id,
      total: order.total,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar a venda no PDV.",
    };
  }
};
