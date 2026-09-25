"use server";

import { revalidatePath } from "next/cache";
import {
  and,
  db,
  desc,
  eq,
  financialClosingsTable,
  financialTransactionsTable,
  gte,
  lte,
  ne,
  ordersTable,
  restaurantsTable,
} from "@fsw/db";

const round2 = (v: number) => Number(v.toFixed(2));

export interface FechamentoResumoItem {
  id: string;
  referenceDate: string;
  ano: number;
  mes: number;
  grossRevenue: number;
  estimatedCost: number;
  estimatedProfit: number;
  profitMargin: number;
  totalOrders: number;
  closedAt: Date | null;
  createdAt: Date;
}

export interface PreviaDREData {
  ano: number;
  mes: number;
  refDateString: string;
  isClosed: boolean;
  closedAt: Date | null;
  totalOrders: number;
  faturamentoPedidos: number;
  outrasReceitas: number;
  receitaBruta: number;
  custoTotal: number;
  lucroLiquido: number;
  margemLiquida: number;
  existingClosingId: string | null;
}

export async function listarFechamentosAction(slug: string): Promise<{
  success: boolean;
  closings: FechamentoResumoItem[];
  kpis: {
    totalFechamentos: number;
    faturamentoTotalAuditado: number;
    custoTotalAuditado: number;
    lucroTotalAuditado: number;
    margemMediaAuditada: number;
  };
  error?: string;
}> {
  try {
    const restaurant = await db.query.restaurantsTable.findFirst({
      where: eq(restaurantsTable.slug, slug),
    });

    if (!restaurant) {
      return {
        success: false,
        closings: [],
        kpis: {
          totalFechamentos: 0,
          faturamentoTotalAuditado: 0,
          custoTotalAuditado: 0,
          lucroTotalAuditado: 0,
          margemMediaAuditada: 0,
        },
        error: "Restaurante não encontrado",
      };
    }

    const rows = await db
      .select()
      .from(financialClosingsTable)
      .where(eq(financialClosingsTable.restaurantId, restaurant.id))
      .orderBy(desc(financialClosingsTable.referenceDate));

    const closings: FechamentoResumoItem[] = rows.map((r) => {
      const parts = r.referenceDate.split("-");
      const ano = parseInt(parts[0] || "2026", 10);
      const mes = parseInt(parts[1] || "1", 10);
      const rev = Number(r.grossRevenue);
      const cost = Number(r.estimatedCost);
      const profit = Number(r.estimatedProfit);
      const margin = rev > 0 ? round2((profit / rev) * 100) : 0;

      return {
        id: r.id,
        referenceDate: r.referenceDate,
        ano,
        mes,
        grossRevenue: rev,
        estimatedCost: cost,
        estimatedProfit: profit,
        profitMargin: margin,
        totalOrders: r.totalOrders,
        closedAt: r.closedAt,
        createdAt: r.createdAt,
      };
    });

    const totalFechamentos = closings.length;
    const faturamentoTotalAuditado = round2(
      closings.reduce((acc, c) => acc + c.grossRevenue, 0),
    );
    const custoTotalAuditado = round2(
      closings.reduce((acc, c) => acc + c.estimatedCost, 0),
    );
    const lucroTotalAuditado = round2(
      closings.reduce((acc, c) => acc + c.estimatedProfit, 0),
    );
    const margemMediaAuditada =
      faturamentoTotalAuditado > 0
        ? round2((lucroTotalAuditado / faturamentoTotalAuditado) * 100)
        : 0;

    return {
      success: true,
      closings,
      kpis: {
        totalFechamentos,
        faturamentoTotalAuditado,
        custoTotalAuditado,
        lucroTotalAuditado,
        margemMediaAuditada,
      },
    };
  } catch (error) {
    console.error("[listarFechamentosAction]", error);
    return {
      success: false,
      closings: [],
      kpis: {
        totalFechamentos: 0,
        faturamentoTotalAuditado: 0,
        custoTotalAuditado: 0,
        lucroTotalAuditado: 0,
        margemMediaAuditada: 0,
      },
      error: "Erro ao buscar fechamentos contábeis.",
    };
  }
}

export async function calcularPreviaDREAction(
  slug: string,
  ano: number,
  mes: number,
): Promise<{
  success: boolean;
  previa?: PreviaDREData;
  error?: string;
}> {
  try {
    const restaurant = await db.query.restaurantsTable.findFirst({
      where: eq(restaurantsTable.slug, slug),
    });

    if (!restaurant) {
      return { success: false, error: "Restaurante não encontrado" };
    }

    // Intervalo do mês
    const startDate = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
    const refDateString = `${ano}-${String(mes).padStart(2, "0")}-01`;

    // Buscar se já tem fechamento existente
    const existing = await db.query.financialClosingsTable.findFirst({
      where: and(
        eq(financialClosingsTable.restaurantId, restaurant.id),
        eq(financialClosingsTable.referenceDate, refDateString),
      ),
    });

    // 1. Pedidos do período (não cancelados)
    const orders = await db
      .select({
        id: ordersTable.id,
        total: ordersTable.total,
        status: ordersTable.status,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.restaurantId, restaurant.id),
          gte(ordersTable.createdAt, startDate),
          lte(ordersTable.createdAt, endDate),
          ne(ordersTable.status, "CANCELLED"),
        ),
      );

    const totalOrders = orders.length;
    const faturamentoPedidos = round2(
      orders.reduce((acc: number, o: { total: number }) => acc + Number(o.total || 0), 0),
    );

    // 2. Transações financeiras pagas (REVENUE e EXPENSE)
    const transactions = await db
      .select({
        id: financialTransactionsTable.id,
        type: financialTransactionsTable.type,
        amount: financialTransactionsTable.amount,
        orderId: financialTransactionsTable.orderId,
      })
      .from(financialTransactionsTable)
      .where(
        and(
          eq(financialTransactionsTable.restaurantId, restaurant.id),
          gte(financialTransactionsTable.paidAt, startDate),
          lte(financialTransactionsTable.paidAt, endDate),
          eq(financialTransactionsTable.status, "PAID"),
        ),
      );

    // Filtrar para evitar duplicidade com pedidos se orderId preenchido
    let outrasReceitas = 0;
    let despesasPagas = 0;

    for (const t of transactions) {
      const valor = Number(t.amount || 0);
      if (t.type === "REVENUE") {
        if (!t.orderId) {
          outrasReceitas += valor;
        }
      } else if (t.type === "EXPENSE") {
        despesasPagas += valor;
      }
    }

    outrasReceitas = round2(outrasReceitas);
    despesasPagas = round2(despesasPagas);

    const receitaBruta = round2(faturamentoPedidos + outrasReceitas);
    const custoTotal = round2(despesasPagas);
    const lucroLiquido = round2(receitaBruta - custoTotal);
    const margemLiquida =
      receitaBruta > 0 ? round2((lucroLiquido / receitaBruta) * 100) : 0;

    return {
      success: true,
      previa: {
        ano,
        mes,
        refDateString,
        isClosed: Boolean(existing?.closedAt),
        closedAt: existing?.closedAt ?? null,
        totalOrders,
        faturamentoPedidos,
        outrasReceitas,
        receitaBruta,
        custoTotal,
        lucroLiquido,
        margemLiquida,
        existingClosingId: existing?.id ?? null,
      },
    };
  } catch (error) {
    console.error("[calcularPreviaDREAction]", error);
    return { success: false, error: "Erro ao calcular prévia contábil DRE." };
  }
}

export async function executarFechamentoCompetenciaAction(
  slug: string,
  ano: number,
  mes: number,
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const restaurant = await db.query.restaurantsTable.findFirst({
      where: eq(restaurantsTable.slug, slug),
    });

    if (!restaurant) {
      return { success: false, error: "Restaurante não encontrado" };
    }

    const previaRes = await calcularPreviaDREAction(slug, ano, mes);
    if (!previaRes.success || !previaRes.previa) {
      return { success: false, error: previaRes.error || "Erro ao calcular DRE." };
    }

    const {
      refDateString,
      receitaBruta,
      custoTotal,
      lucroLiquido,
      totalOrders,
      existingClosingId,
    } = previaRes.previa;

    if (existingClosingId) {
      await db
        .update(financialClosingsTable)
        .set({
          grossRevenue: receitaBruta,
          estimatedCost: custoTotal,
          estimatedProfit: lucroLiquido,
          totalOrders,
          closedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(financialClosingsTable.id, existingClosingId));
    } else {
      await db.insert(financialClosingsTable).values({
        restaurantId: restaurant.id,
        referenceDate: refDateString,
        grossRevenue: receitaBruta,
        estimatedCost: custoTotal,
        estimatedProfit: lucroLiquido,
        totalOrders,
        closedAt: new Date(),
      });
    }

    revalidatePath("/financeiro/fechamentos");
    revalidatePath("/financeiro");

    return {
      success: true,
      message: `Competência ${String(mes).padStart(2, "0")}/${ano} auditada e fechada com sucesso!`,
    };
  } catch (error) {
    console.error("[executarFechamentoCompetenciaAction]", error);
    return { success: false, error: "Falha ao executar fechamento da competência." };
  }
}

export async function reabrirFechamentoCompetenciaAction(
  slug: string,
  closingId: string,
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const restaurant = await db.query.restaurantsTable.findFirst({
      where: eq(restaurantsTable.slug, slug),
    });

    if (!restaurant) {
      return { success: false, error: "Restaurante não encontrado" };
    }

    await db
      .delete(financialClosingsTable)
      .where(
        and(
          eq(financialClosingsTable.id, closingId),
          eq(financialClosingsTable.restaurantId, restaurant.id),
        ),
      );

    revalidatePath("/financeiro/fechamentos");
    revalidatePath("/financeiro");

    return {
      success: true,
      message: "Competência reaberta com sucesso. Lançamentos liberados para auditoria.",
    };
  } catch (error) {
    console.error("[reabrirFechamentoCompetenciaAction]", error);
    return { success: false, error: "Falha ao reabrir competência contábil." };
  }
}
