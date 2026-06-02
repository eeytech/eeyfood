import { db, financialTransactionsTable, ordersTable, and, eq, sql } from "@fsw/db";
/**
 * Função para atualizar a DRE automática baseada nos pedidos finalizados e transações pagas.
 * Pode ser chamada via CRON ou após fechamento de caixa.
 */
export const processarDREDiaria = async (restaurantId, referenceDate) => {
    const startOfDay = new Date(referenceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(referenceDate);
    endOfDay.setHours(23, 59, 59, 999);
    // 1. Somar Vendas (Pedidos Finalizados e Pagos)
    const [vendas] = await db
        .select({
        total: sql `sum(${ordersTable.total})`,
        custoEstimado: sql `sum(${ordersTable.estimatedCost})`,
    })
        .from(ordersTable)
        .where(and(eq(ordersTable.restaurantId, restaurantId), eq(ordersTable.status, "FINISHED"), eq(ordersTable.paymentStatus, "PAID"), sql `${ordersTable.createdAt} BETWEEN ${startOfDay} AND ${endOfDay}`));
    // 2. Somar Outras Receitas
    const [outrasReceitas] = await db
        .select({
        total: sql `sum(${financialTransactionsTable.amount})`,
    })
        .from(financialTransactionsTable)
        .where(and(eq(financialTransactionsTable.restaurantId, restaurantId), eq(financialTransactionsTable.type, "REVENUE"), eq(financialTransactionsTable.status, "PAID"), sql `${financialTransactionsTable.paidAt} BETWEEN ${startOfDay} AND ${endOfDay}`));
    // 3. Somar Despesas (Fixas e Variáveis)
    const [despesas] = await db
        .select({
        total: sql `sum(${financialTransactionsTable.amount})`,
    })
        .from(financialTransactionsTable)
        .where(and(eq(financialTransactionsTable.restaurantId, restaurantId), eq(financialTransactionsTable.type, "EXPENSE"), eq(financialTransactionsTable.status, "PAID"), sql `${financialTransactionsTable.paidAt} BETWEEN ${startOfDay} AND ${endOfDay}`));
    const receitaBruta = (vendas?.total ?? 0) + (outrasReceitas?.total ?? 0);
    const cmv = vendas?.custoEstimado ?? 0;
    const lucroBruto = receitaBruta - cmv;
    const lucroLiquido = lucroBruto - (despesas?.total ?? 0);
    return {
        referenceDate,
        receitaBruta,
        cmv,
        lucroBruto,
        despesasOperacionais: despesas?.total ?? 0,
        lucroLiquido,
    };
};
