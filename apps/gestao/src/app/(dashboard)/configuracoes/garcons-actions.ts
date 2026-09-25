"use server";

import {
  and,
  asc,
  buscarRestaurantePorSlug,
  commissionRulesTable,
  criarTransacaoFinanceira,
  db,
  desc,
  eq,
  ordersTable,
  sql,
  tipClosingsTable,
  waitersTable,
} from "@fsw/db";
import type { Waiter } from "@fsw/db";
import { revalidatePath } from "next/cache";

export interface GarcomMetricas {
  waiter: Waiter;
  totalOrders: number;
  totalSales: number;
  totalServiceFee: number;
  totalTipsPaid: number;
  pendingBalance: number;
}

export interface CommissionRuleData {
  id?: string;
  name: string;
  serviceFeePercent: number;
  waiterSharePercent: number;
  isActive: boolean;
}

export interface TipClosingItem {
  id: string;
  waiterId: string;
  waiterName: string;
  amount: number;
  referenceDate: string;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");
  return restaurant;
};

export async function listarGarconsComMetricasAction(
  slug: string,
): Promise<{
  garcons: GarcomMetricas[];
  regraComissao: CommissionRuleData | null;
  fechamentos: TipClosingItem[];
}> {
  const restaurant = await getRestaurantOrThrow(slug);

  // 1. Buscar todos os garçons
  const garconsList = await db
    .select()
    .from(waitersTable)
    .where(eq(waitersTable.restaurantId, restaurant.id))
    .orderBy(asc(waitersTable.name));

  // 2. Buscar regra de comissão ativa
  const [activeRule] = await db
    .select()
    .from(commissionRulesTable)
    .where(
      and(
        eq(commissionRulesTable.restaurantId, restaurant.id),
        eq(commissionRulesTable.isActive, true),
      ),
    )
    .limit(1);

  // 3. Buscar fechamentos de gorjeta
  const closings = await db
    .select({
      id: tipClosingsTable.id,
      waiterId: tipClosingsTable.waiterId,
      amount: tipClosingsTable.amount,
      referenceDate: tipClosingsTable.referenceDate,
      paidAt: tipClosingsTable.paidAt,
      notes: tipClosingsTable.notes,
      createdAt: tipClosingsTable.createdAt,
      waiterName: waitersTable.name,
    })
    .from(tipClosingsTable)
    .innerJoin(waitersTable, eq(tipClosingsTable.waiterId, waitersTable.id))
    .where(eq(tipClosingsTable.restaurantId, restaurant.id))
    .orderBy(desc(tipClosingsTable.createdAt));

  // 4. Buscar totais de pedidos finalizados agrupados por garçom
  const ordersSummary = await db
    .select({
      waiterId: ordersTable.waiterId,
      totalOrders: sql<number>`count(*)::int`,
      totalSales: sql<number>`coalesce(sum(${ordersTable.total}), 0)::float`,
      totalServiceFee: sql<number>`coalesce(sum(${ordersTable.serviceFeeAmount}), 0)::float`,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.restaurantId, restaurant.id),
        eq(ordersTable.status, "FINISHED"),
        sql`${ordersTable.waiterId} is not null`,
      ),
    )
    .groupBy(ordersTable.waiterId);

  const ordersMap = new Map(
    ordersSummary.map((item) => [item.waiterId!, item]),
  );

  // Somar fechamentos pagos por garçom
  const closingsSumMap = new Map<string, number>();
  for (const c of closings) {
    const cur = closingsSumMap.get(c.waiterId) || 0;
    closingsSumMap.set(c.waiterId, cur + Number(c.amount));
  }

  const garconsComMetricas: GarcomMetricas[] = garconsList.map((w) => {
    const o = ordersMap.get(w.id);
    const totalOrders = o?.totalOrders || 0;
    const totalSales = Number(o?.totalSales?.toFixed(2) || 0);
    const totalServiceFee = Number(o?.totalServiceFee?.toFixed(2) || 0);
    const totalTipsPaid = Number(
      (closingsSumMap.get(w.id) || 0).toFixed(2),
    );

    // Se o garçom tiver comissão customizada (ex: 5% ou 10%), usa dela, senão usa a taxa de serviço
    const commissionDue =
      w.commissionPercent > 0
        ? (totalSales * w.commissionPercent) / 100
        : totalServiceFee;

    const pendingBalance = Math.max(
      0,
      Number((commissionDue - totalTipsPaid).toFixed(2)),
    );

    return {
      waiter: w,
      totalOrders,
      totalSales,
      totalServiceFee,
      totalTipsPaid,
      pendingBalance,
    };
  });

  return {
    garcons: garconsComMetricas,
    regraComissao: activeRule
      ? {
          id: activeRule.id,
          name: activeRule.name,
          serviceFeePercent: activeRule.serviceFeePercent,
          waiterSharePercent: activeRule.waiterSharePercent,
          isActive: activeRule.isActive,
        }
      : null,
    fechamentos: closings.map((c) => ({
      id: c.id,
      waiterId: c.waiterId,
      waiterName: c.waiterName,
      amount: Number(c.amount),
      referenceDate: c.referenceDate,
      paidAt: c.paidAt ? c.paidAt.toISOString() : null,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export async function criarOuEditarGarcomAction(
  slug: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const restaurant = await getRestaurantOrThrow(slug);

    const id = formData.get("id")?.toString()?.trim();
    const name = formData.get("name")?.toString()?.trim();
    const phone = formData.get("phone")?.toString()?.trim() || null;
    const cpf = formData.get("cpf")?.toString()?.trim() || null;
    const commissionPercent = Number(
      formData.get("commissionPercent")?.toString() || 0,
    );
    const status = (formData.get("status")?.toString() || "ACTIVE") as
      | "ACTIVE"
      | "INACTIVE";

    if (!name) {
      return { success: false, error: "Nome do garçom é obrigatório." };
    }

    if (id) {
      // Atualizar existente
      await db
        .update(waitersTable)
        .set({
          name,
          phone,
          cpf,
          commissionPercent: isNaN(commissionPercent) ? 0 : commissionPercent,
          status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(waitersTable.id, id),
            eq(waitersTable.restaurantId, restaurant.id),
          ),
        );
    } else {
      // Criar novo
      await db.insert(waitersTable).values({
        restaurantId: restaurant.id,
        name,
        phone,
        cpf,
        commissionPercent: isNaN(commissionPercent) ? 0 : commissionPercent,
        status,
      });
    }

    revalidatePath(`/${slug}/configuracoes/usuarios`);
    revalidatePath(`/${slug}/garcom`);
    revalidatePath(`/${slug}/comandas`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar garçom.",
    };
  }
}

export async function alternarStatusGarcomAction(
  slug: string,
  waiterId: string,
  status: "ACTIVE" | "INACTIVE",
): Promise<{ success: boolean; error?: string }> {
  try {
    const restaurant = await getRestaurantOrThrow(slug);

    await db
      .update(waitersTable)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(waitersTable.id, waiterId),
          eq(waitersTable.restaurantId, restaurant.id),
        ),
      );

    revalidatePath(`/${slug}/configuracoes/usuarios`);
    revalidatePath(`/${slug}/garcom`);
    revalidatePath(`/${slug}/comandas`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao alterar status.",
    };
  }
}

export async function excluirGarcomAction(
  slug: string,
  waiterId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const restaurant = await getRestaurantOrThrow(slug);

    await db
      .delete(waitersTable)
      .where(
        and(
          eq(waitersTable.id, waiterId),
          eq(waitersTable.restaurantId, restaurant.id),
        ),
      );

    revalidatePath(`/${slug}/configuracoes/usuarios`);
    revalidatePath(`/${slug}/garcom`);
    revalidatePath(`/${slug}/comandas`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir garçom.",
    };
  }
}

export async function salvarRegraComissaoAction(
  slug: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const restaurant = await getRestaurantOrThrow(slug);

    const name =
      formData.get("name")?.toString()?.trim() || "Taxa de Serviço Padrão (10%)";
    const serviceFeePercent = Number(
      formData.get("serviceFeePercent")?.toString() || 10,
    );
    const waiterSharePercent = Number(
      formData.get("waiterSharePercent")?.toString() || 100,
    );
    const isActive = formData.get("isActive") !== "false";

    const [existing] = await db
      .select({ id: commissionRulesTable.id })
      .from(commissionRulesTable)
      .where(eq(commissionRulesTable.restaurantId, restaurant.id))
      .limit(1);

    if (existing) {
      await db
        .update(commissionRulesTable)
        .set({
          name,
          serviceFeePercent,
          waiterSharePercent,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(commissionRulesTable.id, existing.id));
    } else {
      await db.insert(commissionRulesTable).values({
        restaurantId: restaurant.id,
        name,
        serviceFeePercent,
        waiterSharePercent,
        isActive,
      });
    }

    revalidatePath(`/${slug}/configuracoes/usuarios`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao salvar regra de comissão.",
    };
  }
}

export async function fecharGorjetaGarcomAction(
  slug: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const restaurant = await getRestaurantOrThrow(slug);

    const waiterId = formData.get("waiterId")?.toString()?.trim();
    const amount = Number(formData.get("amount")?.toString());
    const referenceDate =
      formData.get("referenceDate")?.toString()?.trim() ||
      new Date().toISOString().split("T")[0];
    const notes = formData.get("notes")?.toString()?.trim() || null;
    const createFinancialExpense =
      formData.get("createFinancialExpense") === "true";

    if (!waiterId) {
      return { success: false, error: "Selecione o garçom para fechamento." };
    }

    if (!amount || amount <= 0) {
      return { success: false, error: "Informe um valor válido maior que zero." };
    }

    const [waiter] = await db
      .select()
      .from(waitersTable)
      .where(
        and(
          eq(waitersTable.id, waiterId),
          eq(waitersTable.restaurantId, restaurant.id),
        ),
      )
      .limit(1);

    if (!waiter) {
      return { success: false, error: "Garçom não encontrado." };
    }

    const now = new Date();

    // 1. Inserir fechamento em tipClosingsTable
    await db.insert(tipClosingsTable).values({
      restaurantId: restaurant.id,
      waiterId: waiter.id,
      amount,
      referenceDate,
      paidAt: now,
      notes: notes || `Repasse de comissão/gorjetas - ${waiter.name}`,
    });

    // 2. Se marcado, lançar despesa no financeiro do restaurante
    if (createFinancialExpense) {
      try {
        await criarTransacaoFinanceira({
          restaurantId: restaurant.id,
          description: `Repasse Gorjetas/Comissão: ${waiter.name}`,
          amount,
          type: "EXPENSE",
          status: "PAID",
          dueDate: now,
          paidAt: now,
          categoryId: null,
          orderId: null,
          bankAccountId: null,
        });
      } catch (finErr) {
        console.warn("Aviso ao criar despesa financeira do fechamento:", finErr);
      }
    }

    revalidatePath(`/${slug}/configuracoes/usuarios`);
    revalidatePath(`/${slug}/financeiro`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao registrar fechamento de gorjetas.",
    };
  }
}
