"use server";

import OpenAI from "openai";
import {
  aiSettingsTable,
  and,
  db,
  eq,
  gte,
  inventoryItemsTable,
  inventoryLossesTable,
  ne,
  orderProductsTable,
  ordersTable,
  productsTable,
  restaurantsTable,
  sql,
} from "@fsw/db";

export interface InsightResult {
  markdown: string;
  generatedAt: string;
}

export const gerarInsightsIA = async (slug: string): Promise<InsightResult> => {
  const [restaurantRow] = await db
    .select({
      id: restaurantsTable.id,
      name: restaurantsTable.name,
    })
    .from(restaurantsTable)
    .where(eq(restaurantsTable.slug, slug))
    .limit(1);

  if (!restaurantRow) throw new Error("Restaurante não encontrado.");

  const [aiSettingsRow] = await db
    .select({ openaiApiKey: aiSettingsTable.openaiApiKey })
    .from(aiSettingsTable)
    .where(eq(aiSettingsTable.restaurantId, restaurantRow.id))
    .limit(1);

  if (!aiSettingsRow?.openaiApiKey) {
    throw new Error(
      "Chave OpenAI não configurada. Acesse Configurações → IA e adicione sua API Key.",
    );
  }

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [salesData, inventoryData, lossData] = await Promise.all([
    // Vendas por produto (últimos 3 meses)
    db
      .select({
        productName: orderProductsTable.productNameSnapshot,
        totalQty: sql<number>`cast(sum(${orderProductsTable.quantity}) as int)`,
        totalRevenue: sql<number>`sum(${orderProductsTable.lineTotal})`,
        avgWeeklySales: sql<number>`sum(${orderProductsTable.quantity})::float / 12`,
      })
      .from(orderProductsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderProductsTable.orderId))
      .where(
        and(
          eq(ordersTable.restaurantId, restaurantRow.id),
          ne(ordersTable.status, "CANCELLED"),
          eq(ordersTable.paymentStatus, "PAID"),
          gte(ordersTable.createdAt, threeMonthsAgo),
        ),
      )
      .groupBy(orderProductsTable.productNameSnapshot)
      .orderBy(sql`sum(${orderProductsTable.quantity}) desc`)
      .limit(20),

    // Estoque atual de insumos
    db
      .select({
        name: inventoryItemsTable.name,
        currentQuantity: inventoryItemsTable.currentQuantity,
        lowStockThreshold: inventoryItemsTable.lowStockThreshold,
        unitOfMeasure: inventoryItemsTable.unitOfMeasure,
        unitCost: inventoryItemsTable.unitCost,
      })
      .from(inventoryItemsTable)
      .where(
        and(
          eq(inventoryItemsTable.restaurantId, restaurantRow.id),
          eq(inventoryItemsTable.type, "INSUMO"),
        ),
      )
      .orderBy(sql`${inventoryItemsTable.currentQuantity} / nullif(${inventoryItemsTable.lowStockThreshold}, 0) asc`)
      .limit(20),

    // Perdas recentes
    db
      .select({
        name: inventoryItemsTable.name,
        totalLoss: sql<number>`sum(${inventoryLossesTable.quantity})`,
        financialLoss: sql<number>`sum(${inventoryLossesTable.financialLoss})`,
        reason: inventoryLossesTable.reason,
      })
      .from(inventoryLossesTable)
      .innerJoin(
        inventoryItemsTable,
        eq(inventoryItemsTable.id, inventoryLossesTable.inventoryItemId),
      )
      .where(
        and(
          eq(inventoryLossesTable.restaurantId, restaurantRow.id),
          gte(inventoryLossesTable.occurredAt, threeMonthsAgo),
        ),
      )
      .groupBy(inventoryItemsTable.name, inventoryLossesTable.reason)
      .orderBy(sql`sum(${inventoryLossesTable.financialLoss}) desc`)
      .limit(10),
  ]);

  // Produtos com margem baixa (custo vs preço)
  const lowMarginProducts = await db
    .select({
      name: productsTable.name,
      price: productsTable.price,
      costPrice: productsTable.costPrice,
    })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.restaurantId, restaurantRow.id),
        eq(productsTable.isActive, true),
        sql`${productsTable.costPrice} > 0`,
        sql`${productsTable.costPrice} / nullif(${productsTable.price}, 0) > 0.6`,
      ),
    )
    .orderBy(sql`${productsTable.costPrice} / nullif(${productsTable.price}, 0) desc`)
    .limit(10);

  const prompt = `Você é um consultor de negócios especializado em restaurantes e food service. Analise os dados abaixo do restaurante "${restaurantRow.name}" e forneça um relatório executivo formatado em markdown com as seções obrigatórias:

## 📦 Previsão de Demanda
Identifique quais insumos têm risco iminente de acabar no próximo final de semana com base nos padrões de venda. Seja específico com quantidades.

## 📈 Projeção de Vendas
Projete o faturamento esperado para o próximo final de semana e para o mês seguinte com base no histórico dos últimos 3 meses. Use valores em R$.

## 💰 Sugestão de Preços
Liste os produtos com margem inadequada e recomende ajustes de preço com valores específicos.

## ⚠️ Alertas e Oportunidades
Destaque perdas recorrentes que precisam ser investigadas e oportunidades de crescimento identificadas nos dados.

---

**DADOS DOS ÚLTIMOS 3 MESES:**

### Vendas por produto (top 20):
${salesData
  .map(
    (p) =>
      `- ${p.productName}: ${p.totalQty} un. vendidas, R$ ${(p.totalRevenue ?? 0).toFixed(2)} receita, ~${(p.avgWeeklySales ?? 0).toFixed(1)} un./semana`,
  )
  .join("\n")}

### Estoque atual de insumos (críticos primeiro):
${inventoryData
  .map(
    (i) =>
      `- ${i.name}: ${i.currentQuantity} ${i.unitOfMeasure} em estoque | limite mínimo: ${i.lowStockThreshold ?? "não definido"} | custo unitário: R$ ${(i.unitCost ?? 0).toFixed(2)}`,
  )
  .join("\n")}

### Perdas recentes:
${
  lossData.length === 0
    ? "Sem perdas registradas no período."
    : lossData
        .map(
          (l) =>
            `- ${l.name}: ${l.totalLoss} un. perdidas (${l.reason}), prejuízo: R$ ${(l.financialLoss ?? 0).toFixed(2)}`,
        )
        .join("\n")
}

### Produtos com margem < 40%:
${
  lowMarginProducts.length === 0
    ? "Nenhum produto com margem crítica identificado."
    : lowMarginProducts
        .map((p) => {
          const margin = p.price > 0 ? ((p.price - (p.costPrice ?? 0)) / p.price) * 100 : 0;
          return `- ${p.name}: preço R$ ${p.price.toFixed(2)}, custo R$ ${(p.costPrice ?? 0).toFixed(2)}, margem atual ${margin.toFixed(1)}%`;
        })
        .join("\n")
}

Escreva em português brasileiro. Seja direto, use dados quantitativos e justifique cada recomendação.`;

  const openai = new OpenAI({ apiKey: aiSettingsRow.openaiApiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const markdown = completion.choices[0]?.message?.content ?? "Não foi possível gerar o relatório.";

  return {
    markdown,
    generatedAt: new Date().toISOString(),
  };
};
