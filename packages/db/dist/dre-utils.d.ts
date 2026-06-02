/**
 * Função para atualizar a DRE automática baseada nos pedidos finalizados e transações pagas.
 * Pode ser chamada via CRON ou após fechamento de caixa.
 */
export declare const processarDREDiaria: (restaurantId: string, referenceDate: Date) => Promise<{
    referenceDate: Date;
    receitaBruta: number;
    cmv: number;
    lucroBruto: number;
    despesasOperacionais: number;
    lucroLiquido: number;
}>;
