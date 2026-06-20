"use server";

import {
  atualizarStatusPagamentoPedido,
  atualizarStatusPedido,
  buscarPedidoRecebimentoPorId,
  buscarRestaurantePorSlug,
  criarPedido,
  couponsTable,
  walletsTable,
  ordersTable,
  db,
  and,
  eq,
  sql,
  type PaymentMethod,
  type PedidoRecebimento,
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
  couponCode?: string;
  useWalletBalance?: boolean;
  changeFor?: number;
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
  couponCode,
  useWalletBalance,
  changeFor,
}: FinalizarVendaPdvInput): Promise<FinalizarVendaPdvResult> => {
  if (products.length === 0) {
    return {
      success: false,
      message: "Adicione pelo menos um item antes de fechar a venda.",
    };
  }

  const normalizedPhone = normalizarTelefonePdv(customerPhone);

  try {
    const order = await criarPedido({
      slug,
      customerName: customerName?.trim() || "Cliente do balcao",
      customerPhone: normalizedPhone,
      consumptionMethod: "TAKEAWAY",
      paymentMethod,
      products,
      couponCode,
      useWalletBalance,
      changeFor,
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

export const buscarSaldoCashbackPdv = async (
  slug: string,
  customerPhone: string,
): Promise<{ balance: number } | null> => {
  const normalizedPhone = customerPhone.replace(/\D/g, "");
  if (normalizedPhone.length !== 11) return null;

  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  const [wallet] = await db
    .select({ balance: walletsTable.balance })
    .from(walletsTable)
    .where(
      and(
        eq(walletsTable.restaurantId, restaurant.id),
        eq(walletsTable.customerPhone, normalizedPhone),
      ),
    )
    .limit(1);

  return wallet ?? null;
};

interface ValidarCupomPdvInput {
  slug: string;
  couponCode: string;
  customerPhone: string;
  subtotal: number;
}

interface ValidarCupomPdvResult {
  success: boolean;
  discountAmount?: number;
  code?: string;
  error?: string;
}

export const validarCupomPdv = async ({
  slug,
  couponCode,
  customerPhone,
  subtotal,
}: ValidarCupomPdvInput): Promise<ValidarCupomPdvResult> => {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) {
      return { success: false, error: "Restaurante nao encontrado." };
    }

    const normalizedCode = couponCode.trim().toUpperCase();
    if (!normalizedCode) {
      return { success: false, error: "Codigo do cupom invalido." };
    }

    const [coupon] = await db
      .select()
      .from(couponsTable)
      .where(
        and(
          eq(couponsTable.restaurantId, restaurant.id),
          eq(couponsTable.code, normalizedCode),
        ),
      )
      .limit(1);

    if (!coupon) {
      return { success: false, error: "Cupom invalido ou nao encontrado." };
    }

    if (!coupon.isActive) {
      return { success: false, error: "Este cupom esta inativo no momento." };
    }

    const now = new Date();

    if (coupon.startsAt && coupon.startsAt > now) {
      return { success: false, error: "Este cupom ainda nao esta disponivel." };
    }

    if (coupon.endsAt && coupon.endsAt < now) {
      return { success: false, error: "Este cupom expirou." };
    }

    if (subtotal < coupon.minimumOrderValue) {
      return {
        success: false,
        error: `Pedido minimo de R$ ${coupon.minimumOrderValue.toFixed(2).replace(".", ",")} para este cupom.`,
      };
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return { success: false, error: "Cupom atingiu o limite total de uso." };
    }

    const normalizedPhone = customerPhone.replace(/\D/g, "");

    if (normalizedPhone.length === 11) {
      const [usageByCustomer] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.restaurantId, restaurant.id),
            eq(ordersTable.customerPhone, normalizedPhone),
            eq(ordersTable.couponId, coupon.id),
          ),
        );

      if (Number(usageByCustomer?.count ?? 0) >= coupon.perCustomerLimit) {
        return {
          success: false,
          error: "Cupom ja utilizado o maximo para este celular.",
        };
      }
    }

    const grossDiscount =
      coupon.discountType === "PERCENTAGE"
        ? subtotal * (coupon.discountValue / 100)
        : coupon.discountValue;

    const discountWithCap =
      coupon.maxDiscountAmount !== null
        ? Math.min(grossDiscount, coupon.maxDiscountAmount)
        : grossDiscount;

    const discountAmount = Number(
      Math.min(discountWithCap, subtotal).toFixed(2),
    );

    return { success: true, discountAmount, code: coupon.code };
  } catch {
    return { success: false, error: "Erro ao validar cupom." };
  }
};

export const buscarPedidoPdvParaImpressao = async (
  orderId: number,
): Promise<PedidoRecebimento | null> => {
  return buscarPedidoRecebimentoPorId(orderId);
};
