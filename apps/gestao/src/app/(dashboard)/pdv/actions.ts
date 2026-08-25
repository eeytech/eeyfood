"use server";

import { atualizarStatusPagamentoPedido, atualizarStatusPedido, buscarPedidoRecebimentoPorId, buscarRestaurantePorSlug, criarPedido, cashRegisterShiftsTable, cashMovementsTable, couponsTable, walletsTable, ordersTable, db, and, eq, sql, desc } from "@fsw/db";
import type { CashRegisterShift, PaymentMethod, PedidoRecebimento } from "@fsw/db";
import { revalidatePath } from "next/cache";

import { notificarAtualizacaoPedido } from "@/lib/notificar-atualizacao-pedido";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizarTelefonePdv = (customerPhone?: string) => {
  const normalizedPhone = customerPhone?.replace(/\D/g, "") ?? "";
  return normalizedPhone.length === 11
    ? normalizedPhone
    : `PDV-${Date.now().toString()}`;
};

const revalidarRotasDoRestaurante = (slug: string) => {
  revalidatePath(`/${slug}/pdv`);
  revalidatePath(`/${slug}/pedidos`);
  revalidatePath(`/${slug}/estoque`);
  revalidatePath(`/${slug}/relatorios`);
  revalidatePath(`/${slug}/menu`, "page");
};

// ─── Turno de Caixa ───────────────────────────────────────────────────────────

export const buscarTurnoAtivoPdv = async (
  slug: string,
): Promise<CashRegisterShift | null> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  const [shift] = await db
    .select()
    .from(cashRegisterShiftsTable)
    .where(
      and(
        eq(cashRegisterShiftsTable.restaurantId, restaurant.id),
        eq(cashRegisterShiftsTable.status, "OPEN"),
      ),
    )
    .orderBy(desc(cashRegisterShiftsTable.openedAt))
    .limit(1);

  return shift ?? null;
};

interface AbrirTurnoCaixaInput {
  slug: string;
  openedByUser: string;
  openingAmount: number;
}

interface AbrirTurnoCaixaResult {
  success: boolean;
  message: string;
  shift?: CashRegisterShift;
}

export const abrirTurnoCaixa = async ({
  slug,
  openedByUser,
  openingAmount,
}: AbrirTurnoCaixaInput): Promise<AbrirTurnoCaixaResult> => {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) {
      return { success: false, message: "Restaurante não encontrado." };
    }

    const existingShift = await buscarTurnoAtivoPdv(slug);
    if (existingShift) {
      return {
        success: true,
        message: "Turno já estava aberto.",
        shift: existingShift,
      };
    }

    const [shift] = await db
      .insert(cashRegisterShiftsTable)
      .values({
        restaurantId: restaurant.id,
        openedByUser: openedByUser.trim() || "Operador",
        openingAmount,
        status: "OPEN",
      })
      .returning();

    if (!shift) {
      return { success: false, message: "Falha ao abrir turno de caixa." };
    }

    revalidatePath(`/${slug}/pdv`);

    return { success: true, message: "Turno de caixa aberto com sucesso.", shift };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao abrir turno.",
    };
  }
};

interface FecharTurnoCaixaInput {
  shiftId: string;
  slug: string;
  actualClosingAmount: number;
  notes?: string;
}

interface TurnoSummary {
  totalVendas: number;
  totalDinheiro: number;
  totalCartao: number;
  totalPix: number;
  totalVale: number;
  totalSuprimento: number;
  totalSangria: number;
  dinheiroEsperado: number;
  diferenca: number;
  totalOrders: number;
}

interface FecharTurnoCaixaResult {
  success: boolean;
  message: string;
  summary?: TurnoSummary;
}

export const fecharTurnoCaixa = async ({
  shiftId,
  slug,
  actualClosingAmount,
  notes,
}: FecharTurnoCaixaInput): Promise<FecharTurnoCaixaResult> => {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) {
      return { success: false, message: "Restaurante não encontrado." };
    }

    const [shift] = await db
      .select()
      .from(cashRegisterShiftsTable)
      .where(
        and(
          eq(cashRegisterShiftsTable.id, shiftId),
          eq(cashRegisterShiftsTable.restaurantId, restaurant.id),
          eq(cashRegisterShiftsTable.status, "OPEN"),
        ),
      )
      .limit(1);

    if (!shift) {
      return { success: false, message: "Turno não encontrado ou já fechado." };
    }

    // Calcular totais de vendas do turno por método de pagamento
    const ordersInShift = await db
      .select({
        paymentMethod: ordersTable.paymentMethod,
        total: ordersTable.total,
        serviceFeeAmount: ordersTable.serviceFeeAmount,
        paymentSplits: ordersTable.paymentSplits,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.cashRegisterShiftId, shiftId),
          eq(ordersTable.restaurantId, restaurant.id),
        ),
      );

    let totalDinheiro = 0;
    let totalCartao = 0;
    let totalPix = 0;
    let totalVale = 0;
    let totalVendas = 0;

    for (const order of ordersInShift) {
      const orderTotal = order.total + (order.serviceFeeAmount ?? 0);
      totalVendas += orderTotal;

      if (order.paymentSplits && order.paymentSplits.length > 0) {
        for (const split of order.paymentSplits) {
          if (split.method === "DINHEIRO") totalDinheiro += split.amount;
          else if (split.method === "CARTAO_PRESENCIAL") totalCartao += split.amount;
          else if (split.method === "PIX") totalPix += split.amount;
          else if (
            split.method === "VALE_ALIMENTACAO" ||
            split.method === "VALE_REFEICAO"
          )
            totalVale += split.amount;
        }
      } else {
        if (order.paymentMethod === "DINHEIRO") totalDinheiro += orderTotal;
        else if (order.paymentMethod === "CARTAO_PRESENCIAL")
          totalCartao += orderTotal;
        else if (order.paymentMethod === "PIX") totalPix += orderTotal;
        else if (
          order.paymentMethod === "VALE_ALIMENTACAO" ||
          order.paymentMethod === "VALE_REFEICAO"
        )
          totalVale += orderTotal;
      }
    }

    // Calcular movimentações do turno
    const movements = await db
      .select()
      .from(cashMovementsTable)
      .where(eq(cashMovementsTable.shiftId, shiftId));

    const totalSuprimento = movements
      .filter((m) => m.type === "SUPRIMENTO")
      .reduce((acc, m) => acc + m.amount, 0);

    const totalSangria = movements
      .filter((m) => m.type === "SANGRIA")
      .reduce((acc, m) => acc + m.amount, 0);

    // Dinheiro esperado no caixa = fundo inicial + vendas em dinheiro + suprimentos - sangrias
    const dinheiroEsperado = Number(
      (shift.openingAmount + totalDinheiro + totalSuprimento - totalSangria).toFixed(2),
    );
    const diferenca = Number((actualClosingAmount - dinheiroEsperado).toFixed(2));

    await db
      .update(cashRegisterShiftsTable)
      .set({
        status: "CLOSED",
        closedAt: new Date(),
        expectedClosingAmount: dinheiroEsperado,
        actualClosingAmount,
        closingDifference: diferenca,
        notes: notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(cashRegisterShiftsTable.id, shiftId));

    revalidatePath(`/${slug}/pdv`);

    return {
      success: true,
      message: "Turno de caixa fechado com sucesso.",
      summary: {
        totalVendas: Number(totalVendas.toFixed(2)),
        totalDinheiro: Number(totalDinheiro.toFixed(2)),
        totalCartao: Number(totalCartao.toFixed(2)),
        totalPix: Number(totalPix.toFixed(2)),
        totalVale: Number(totalVale.toFixed(2)),
        totalSuprimento: Number(totalSuprimento.toFixed(2)),
        totalSangria: Number(totalSangria.toFixed(2)),
        dinheiroEsperado,
        diferenca,
        totalOrders: ordersInShift.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao fechar turno de caixa.",
    };
  }
};

interface RegistrarMovimentacaoInput {
  shiftId: string;
  slug: string;
  type: "SANGRIA" | "SUPRIMENTO";
  amount: number;
  reason: string;
}

interface RegistrarMovimentacaoResult {
  success: boolean;
  message: string;
}

export const registrarMovimentacaoCaixa = async ({
  shiftId,
  slug,
  type,
  amount,
  reason,
}: RegistrarMovimentacaoInput): Promise<RegistrarMovimentacaoResult> => {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) {
      return { success: false, message: "Restaurante não encontrado." };
    }

    if (amount <= 0) {
      return { success: false, message: "O valor deve ser maior que zero." };
    }

    if (!reason.trim()) {
      return { success: false, message: "O motivo é obrigatório." };
    }

    const [shift] = await db
      .select({ id: cashRegisterShiftsTable.id })
      .from(cashRegisterShiftsTable)
      .where(
        and(
          eq(cashRegisterShiftsTable.id, shiftId),
          eq(cashRegisterShiftsTable.restaurantId, restaurant.id),
          eq(cashRegisterShiftsTable.status, "OPEN"),
        ),
      )
      .limit(1);

    if (!shift) {
      return { success: false, message: "Turno não encontrado ou já fechado." };
    }

    await db.insert(cashMovementsTable).values({
      shiftId,
      restaurantId: restaurant.id,
      type,
      amount,
      reason: reason.trim(),
    });

    revalidatePath(`/${slug}/pdv`);

    const typeLabel = type === "SANGRIA" ? "Sangria" : "Suprimento";
    return {
      success: true,
      message: `${typeLabel} de R$ ${amount.toFixed(2).replace(".", ",")} registrado com sucesso.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao registrar movimentação.",
    };
  }
};

// ─── Finalizar Venda ──────────────────────────────────────────────────────────

type PdvPaymentMethod = Extract<
  PaymentMethod,
  "DINHEIRO" | "CARTAO_PRESENCIAL" | "PIX" | "VALE_ALIMENTACAO" | "VALE_REFEICAO"
>;

export interface FinalizarVendaPdvInput {
  slug: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: PdvPaymentMethod;
  paymentSplits?: Array<{ method: string; amount: number }>;
  products: Array<{ id: string; quantity: number }>;
  couponCode?: string;
  useWalletBalance?: boolean;
  changeFor?: number;
  shiftId?: string;
  serviceFeePercent?: number;
}

interface FinalizarVendaPdvResult {
  success: boolean;
  message: string;
  orderId?: number;
  total?: number;
}

export const finalizarVendaPdv = async ({
  slug,
  customerName,
  customerPhone,
  paymentMethod,
  paymentSplits,
  products,
  couponCode,
  useWalletBalance,
  changeFor,
  shiftId,
  serviceFeePercent,
}: FinalizarVendaPdvInput): Promise<FinalizarVendaPdvResult> => {
  if (products.length === 0) {
    return {
      success: false,
      message: "Adicione pelo menos um item antes de fechar a venda.",
    };
  }

  // Validar turno ativo quando shiftId é informado
  if (shiftId) {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (restaurant) {
      const [shift] = await db
        .select({ id: cashRegisterShiftsTable.id, status: cashRegisterShiftsTable.status })
        .from(cashRegisterShiftsTable)
        .where(
          and(
            eq(cashRegisterShiftsTable.id, shiftId),
            eq(cashRegisterShiftsTable.restaurantId, restaurant.id),
          ),
        )
        .limit(1);

      if (!shift || shift.status !== "OPEN") {
        return {
          success: false,
          message: "O turno de caixa está fechado. Abra um novo turno para continuar vendendo.",
        };
      }
    }
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

    // Calcular e aplicar taxa de serviço e dados do turno
    const serviceFeeAmount =
      serviceFeePercent && serviceFeePercent > 0
        ? Number((order.total * (serviceFeePercent / 100)).toFixed(2))
        : 0;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (shiftId) updateData.cashRegisterShiftId = shiftId;
    if (serviceFeeAmount > 0) {
      updateData.serviceFeePercent = serviceFeePercent;
      updateData.serviceFeeAmount = serviceFeeAmount;
      updateData.total = Number((order.total + serviceFeeAmount).toFixed(2));
    }
    if (paymentSplits && paymentSplits.length > 1) {
      updateData.paymentSplits = paymentSplits;
    }

    if (Object.keys(updateData).length > 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.update(ordersTable).set(updateData as any).where(eq(ordersTable.id, order.id));
    }

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
      total: order.total + serviceFeeAmount,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a venda no PDV.",
    };
  }
};

// ─── Cashback & Cupom ─────────────────────────────────────────────────────────

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
      return { success: false, error: "Restaurante não encontrado." };
    }

    const normalizedCode = couponCode.trim().toUpperCase();
    if (!normalizedCode) {
      return { success: false, error: "Código do cupom inválido." };
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

    if (!coupon) return { success: false, error: "Cupom inválido ou não encontrado." };
    if (!coupon.isActive) return { success: false, error: "Este cupom está inativo." };

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now)
      return { success: false, error: "Este cupom ainda não está disponível." };
    if (coupon.endsAt && coupon.endsAt < now)
      return { success: false, error: "Este cupom expirou." };
    if (subtotal < coupon.minimumOrderValue)
      return {
        success: false,
        error: `Pedido mínimo de R$ ${coupon.minimumOrderValue.toFixed(2).replace(".", ",")} para este cupom.`,
      };
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit)
      return { success: false, error: "Cupom atingiu o limite total de uso." };

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
        return { success: false, error: "Cupom já utilizado o máximo para este celular." };
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

    const discountAmount = Number(Math.min(discountWithCap, subtotal).toFixed(2));

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
