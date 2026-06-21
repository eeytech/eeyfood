import { bankAccountsTable, bankStatementEntriesTable, customerLedgersTable, fiscalSettingsTable } from "./schema.js";
import type { AbandonedCart, CourierTrip, DeliveryFeeRule, MarketplaceIntegration, MarketplaceType, Waiter, TableReservation, WaitingQueueEntry, ComandaAvulsaComPedido, ConsumptionMethod, Courier, FinancialCategory, FinancialTransaction, MesaComanda, Order, OrderComItens, OrderProduct, OrderProductItemStatus, OrderStatus, PaymentMethod, PaymentStatus, PedidoBeneficiosValidado, PedidoRecebimento, Product, ProductComRestaurante, ProductionSector, ProductOption, ProductOptionGroup, Restaurant, RestaurantComCategoriasEProdutos, TransactionStatus } from "./types.js";
export declare const listarCategoriasFinanceirasPorSlug: (slug: string) => Promise<FinancialCategory[]>;
export declare const criarTransacaoFinanceira: (input: Omit<FinancialTransaction, "id" | "createdAt" | "updatedAt"> & {
    bankAccountId?: string | null;
}) => Promise<FinancialTransaction>;
export declare const atualizarStatusTransacao: (transactionId: string, status: TransactionStatus, paidAt?: Date | null) => Promise<FinancialTransaction | null>;
export declare const buscarDREBasico: (slug: string, startDate: Date, endDate: Date) => Promise<{
    revenue: number;
    expenses: number;
    netProfit: number;
} | null>;
export interface CriarPedidoInput {
    customerName: string;
    customerPhone: string;
    slug: string;
    consumptionMethod: ConsumptionMethod;
    paymentMethod: PaymentMethod;
    changeFor?: number;
    notes?: string;
    scheduledFor?: Date;
    abandonedCartSessionId?: string;
    couponCode?: string;
    useWalletBalance?: boolean;
    deliveryAddress?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    marketplaceOrderId?: string;
    marketplaceType?: MarketplaceType;
    products: Array<{
        id: string;
        quantity: number;
        selectedOptions?: string[];
        notes?: string;
    }>;
    diningTableId?: string;
}
export interface ValidarBeneficiosPedidoInput {
    customerPhone: string;
    slug: string;
    consumptionMethod?: ConsumptionMethod;
    couponCode?: string;
    useWalletBalance?: boolean;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    products: Array<{
        id: string;
        quantity: number;
        selectedOptions?: string[];
        notes?: string;
    }>;
}
export interface SalvarCarrinhoAbandonadoInput {
    sessionId: string;
    slug: string;
    customerName?: string;
    customerPhone?: string;
    consumptionMethod: ConsumptionMethod;
    paymentMethod?: PaymentMethod;
    couponCode?: string;
    useWalletBalance?: boolean;
    scheduledFor?: Date;
    products: Array<{
        id: string;
        name: string;
        quantity: number;
        price: number;
    }>;
}
export interface AbrirComandaMesaInput {
    slug: string;
    diningTableId: string;
    customerName?: string;
}
export interface AdicionarItensComandaInput {
    orderId: number;
    products: Array<{
        id: string;
        quantity: number;
    }>;
}
export interface FecharComandaInput {
    orderId: number;
    paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">;
}
interface AtualizacaoPedidoBase {
    id: number;
    restaurantSlug: string;
}
export interface AtualizarStatusPedidoInput {
    orderId: number;
    status: OrderStatus;
}
export interface AtualizarStatusPagamentoPedidoInput {
    orderId: number;
    paymentStatus: PaymentStatus;
}
export interface DespacharPedidoInput {
    orderId: number;
    courierId: string;
}
export declare const buscarRestaurantePorSlug: (slug: string) => Promise<Restaurant | null>;
export declare const salvarCarrinhoAbandonado: (input: SalvarCarrinhoAbandonadoInput) => Promise<AbandonedCart | null>;
export declare const buscarRestauranteComCardapioPorSlug: (slug: string) => Promise<(RestaurantComCategoriasEProdutos & {
    rating: number;
    ratingCount: number;
}) | null>;
export declare const buscarProdutoDoRestaurante: ({ slug, productId, }: {
    slug: string;
    productId: string;
}) => Promise<(ProductComRestaurante & {
    optionGroups: (ProductOptionGroup & {
        options: ProductOption[];
    })[];
}) | null>;
export declare const buscarPedidosPorTelefone: (customerPhone: string) => Promise<OrderComItens[]>;
export declare const validarBeneficiosPedido: (input: ValidarBeneficiosPedidoInput) => Promise<PedidoBeneficiosValidado>;
export declare const buscarProximaRegraFidelidade: (slug: string, subtotal: number) => Promise<{
    minOrderValue: number;
    cashbackPercent: number;
    remainingAmount: number;
} | null>;
export declare const criarPedido: (input: CriarPedidoInput) => Promise<Order>;
export declare const listarMesasComandasPorSlug: (slug: string) => Promise<MesaComanda[]>;
export declare const abrirComandaMesa: ({ slug, diningTableId, customerName, }: AbrirComandaMesaInput) => Promise<PedidoRecebimento>;
export declare const adicionarItensComanda: ({ orderId, products, }: AdicionarItensComandaInput) => Promise<PedidoRecebimento>;
export declare const fecharComanda: ({ orderId, paymentMethod, }: FecharComandaInput) => Promise<PedidoRecebimento>;
export declare const atualizarStatusPedido: ({ orderId, status, }: AtualizarStatusPedidoInput) => Promise<(AtualizacaoPedidoBase & {
    status: OrderStatus;
}) | null>;
export declare const atualizarStatusPagamentoPedido: ({ orderId, paymentStatus, }: AtualizarStatusPagamentoPedidoInput) => Promise<(AtualizacaoPedidoBase & {
    paymentStatus: PaymentStatus;
}) | null>;
export declare const buscarPedidoRecebimentoPorId: (orderId: number) => Promise<PedidoRecebimento | null>;
export declare const listarPedidosRecebimentoPorSlug: (slug: string) => Promise<PedidoRecebimento[]>;
export declare const listarCouriersPorSlug: (slug: string) => Promise<Courier[]>;
export declare const buscarPedidoParaRastreamento: (orderId: number) => Promise<{
    id: number;
    status: "PENDING" | "IN_PREPARATION" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "FINISHED" | "CANCELLED";
    deliveryFee: number;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    notes: string | null;
    paidAt: Date | null;
    subtotal: number;
    discountAmount: number;
    couponDiscountAmount: number;
    cashbackRedeemedAmount: number;
    cashbackEarnedAmount: number;
    total: number;
    estimatedCost: number;
    estimatedProfit: number;
    paymentStatus: "PENDING" | "CANCELLED" | "PAID" | "FAILED" | "REFUNDED";
    consumptionMethod: "TAKEAWAY" | "DINE_IN" | "DELIVERY";
    paymentMethod: "MERCADO_PAGO" | "DINHEIRO" | "CARTAO_PRESENCIAL" | "PIX" | "VALE_ALIMENTACAO" | "VALE_REFEICAO" | "FIADO";
    changeFor: number | null;
    couponId: string | null;
    couponCode: string | null;
    diningTableId: string | null;
    courierId: string | null;
    waiterId: string | null;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string | null;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    scheduledFor: Date | null;
    cashbackCreditedAt: Date | null;
    dispatchedAt: Date | null;
    deliveredAt: Date | null;
    cancelledAt: Date | null;
    finishedAt: Date | null;
    closedAt: Date | null;
    deliveryProofUrl: string | null;
    deliveryConfirmationLatitude: number | null;
    deliveryConfirmationLongitude: number | null;
    marketplaceOrderId: string | null;
    marketplaceType: "IFOOD" | "RAPPI" | "NINETY_NINE_FOOD" | null;
    brandName: string | null;
    brandColor: string | null;
    cashRegisterShiftId: string | null;
    serviceFeePercent: number | null;
    serviceFeeAmount: number;
    paymentSplits: {
        method: string;
        amount: number;
    }[] | null;
    customerCpf: string | null;
    nfeStatus: "PENDING" | "CANCELLED" | "ISSUED" | "REJECTED" | null;
    nfeAccessKey: string | null;
    nfeDanfeUrl: string | null;
    nfeRejectionReason: string | null;
    customerLedgerId: string | null;
    restaurant: {
        id: string;
        name: string;
        slug: string;
        description: string;
        avatarImageUrl: string;
        coverImageUrl: string;
        status: "AUTO" | "ALWAYS_OPEN" | "ALWAYS_CLOSED";
        cashbackPercent: number;
        acceptMercadoPago: boolean;
        isCouponsEnabled: boolean;
        isCashbackEnabled: boolean;
        showOptionImages: boolean;
        isDeliveryEnabled: boolean;
        isTakeawayEnabled: boolean;
        isDineInEnabled: boolean;
        cnpj: string | null;
        phone: string | null;
        address: string | null;
        latitude: number | null;
        longitude: number | null;
        deliveryFee: number;
        minimumOrderValue: number;
        freeDeliveryThreshold: number | null;
        estimatedDeliveryTime: string | null;
        pizzaPricingRule: "MAX" | "AVERAGE";
        scaleProtocol: string | null;
        scaleBaudRate: number | null;
        drawerPulseHex: string | null;
        createdAt: Date;
        updatedAt: Date;
    };
    courier: {
        id: string;
        name: string;
        phone: string;
        latitude: number | null;
        longitude: number | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        isActive: boolean;
        vehicleType: string | null;
        licensePlate: string | null;
        cpf: string | null;
        rg: string | null;
        cep: string | null;
        logradouro: string | null;
        numero: string | null;
        complemento: string | null;
        bairro: string | null;
        cidade: string | null;
        estado: string | null;
        cnhNumero: string | null;
        cnhCategoria: string | null;
        cnhVencimento: string | null;
        usesOwnVehicle: boolean | null;
        workDays: string[] | null;
        shiftStart: string | null;
        shiftEnd: string | null;
        isAvailable: boolean;
    } | null;
} | undefined>;
export declare const listarGarconsPorSlug: (slug: string) => Promise<Waiter[]>;
export declare const listarReservasPorSlug: (slug: string) => Promise<TableReservation[]>;
export declare const listarFilaEsperaPorSlug: (slug: string) => Promise<WaitingQueueEntry[]>;
export declare const listarComandasAvulsasPorSlug: (slug: string) => Promise<ComandaAvulsaComPedido[]>;
export interface TransferirItensInput {
    sourceOrderId: number;
    destinationOrderId: number;
    orderProductIds: string[];
}
export declare const transferirItensComanda: ({ sourceOrderId, destinationOrderId, orderProductIds, }: TransferirItensInput) => Promise<void>;
export interface UnirMesasInput {
    mainOrderId: number;
    secondaryOrderId: number;
}
export declare const unirMesas: ({ mainOrderId, secondaryOrderId }: UnirMesasInput) => Promise<void>;
export declare const buscarProdutosPorCategoria: (categoryId: string, restaurantId: string) => Promise<Product[]>;
export declare const buscarUltimoPedidoPorTelefone: (customerPhone: string, restaurantId: string) => Promise<OrderComItens | null>;
export interface CriarRegraFreteInput {
    restaurantId: string;
    name: string;
    type: "RADIUS_KM" | "NEIGHBORHOOD" | "CEP_RANGE";
    fee: number;
    minimumOrderValue?: number;
    freeDeliveryThreshold?: number | null;
    maxDistanceKm?: number | null;
    neighborhood?: string | null;
    cepFrom?: string | null;
    cepTo?: string | null;
    displayOrder?: number;
}
export declare const buscarRegrasFreteAtivas: (restaurantId: string) => Promise<DeliveryFeeRule[]>;
export declare const criarRegraFrete: (input: CriarRegraFreteInput) => Promise<DeliveryFeeRule>;
export declare const atualizarRegraFrete: (id: string, data: Partial<CriarRegraFreteInput>) => Promise<DeliveryFeeRule>;
export declare const excluirRegraFrete: (id: string) => Promise<void>;
export declare const buscarPedidosParaEntregador: (courierId: string) => Promise<{
    id: number;
    customerName: string;
    deliveryAddress: string | null;
    deliveryLatitude: number | null;
    deliveryLongitude: number | null;
    total: number;
    status: "PENDING" | "IN_PREPARATION" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "FINISHED" | "CANCELLED";
    courierId: string | null;
    createdAt: Date;
}[]>;
export declare const atualizarLocalizacaoEntregador: (courierId: string, latitude: number, longitude: number) => Promise<void>;
export declare const registrarComprovanteEntrega: (orderId: number, proofUrl: string, latitude?: number, longitude?: number) => Promise<void>;
export interface CriarViagemMotoboyInput {
    restaurantId: string;
    courierId: string;
    orderIds: number[];
    commissionAmount?: number;
}
export declare const criarViagemMotoboy: (input: CriarViagemMotoboyInput) => Promise<CourierTrip>;
export declare const concluirViagemMotoboy: (tripId: string) => Promise<void>;
export declare const buscarIntegracaoMarketplace: (restaurantId: string, type: MarketplaceType) => Promise<MarketplaceIntegration | null>;
export declare const salvarIntegracaoMarketplace: (restaurantId: string, type: MarketplaceType, data: {
    apiToken?: string;
    merchantId?: string;
    isActive?: boolean;
    menuMappings?: Record<string, string>;
}) => Promise<MarketplaceIntegration>;
export declare const listarSetoresProducaoPorSlug: (slug: string) => Promise<ProductionSector[]>;
export declare const atualizarStatusItemPedido: ({ itemId, itemStatus, }: {
    itemId: string;
    itemStatus: OrderProductItemStatus;
}) => Promise<OrderProduct | null>;
export declare const despacharPedido: ({ orderId, courierId, }: DespacharPedidoInput) => Promise<(AtualizacaoPedidoBase & {
    courierId: string;
    dispatchedAt: Date;
}) | null>;
export declare const listarContasBancariasPorSlug: (slug: string) => Promise<{
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    isActive: boolean;
    type: "CHECKING" | "SAVINGS" | "INTERNAL" | "DIGITAL";
    bankName: string | null;
    agency: string | null;
    accountNumber: string | null;
    currentBalance: number;
}[]>;
export declare const criarContaBancaria: (input: Omit<typeof bankAccountsTable.$inferInsert, "id" | "createdAt" | "updatedAt">) => Promise<{
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    isActive: boolean;
    type: "CHECKING" | "SAVINGS" | "INTERNAL" | "DIGITAL";
    bankName: string | null;
    agency: string | null;
    accountNumber: string | null;
    currentBalance: number;
}>;
export declare const atualizarContaBancaria: (id: string, data: Partial<Omit<typeof bankAccountsTable.$inferInsert, "id" | "restaurantId" | "createdAt">>) => Promise<{
    id: string;
    restaurantId: string;
    name: string;
    type: "CHECKING" | "SAVINGS" | "INTERNAL" | "DIGITAL";
    bankName: string | null;
    agency: string | null;
    accountNumber: string | null;
    currentBalance: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare const excluirContaBancaria: (id: string) => Promise<void>;
export declare const buscarConfiguracoesFiscaisPorSlug: (slug: string) => Promise<{
    id: string;
    cnpj: string | null;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    inscricaoEstadual: string | null;
    ambienteFiscal: string;
    certificadoPfxBase64: string | null;
    certificadoSenha: string | null;
    serieNfe: string;
    proximoNumeroNfe: number;
    serieNfce: string;
    proximoNumeroNfce: number;
    focusNfeToken: string | null;
    webhookUrl: string | null;
} | null>;
export declare const salvarConfiguracoesFiscais: (restaurantId: string, data: Omit<typeof fiscalSettingsTable.$inferInsert, "id" | "restaurantId" | "createdAt" | "updatedAt">) => Promise<{
    id: string;
    cnpj: string | null;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    inscricaoEstadual: string | null;
    ambienteFiscal: string;
    certificadoPfxBase64: string | null;
    certificadoSenha: string | null;
    serieNfe: string;
    proximoNumeroNfe: number;
    serieNfce: string;
    proximoNumeroNfce: number;
    focusNfeToken: string | null;
    webhookUrl: string | null;
}>;
export declare const atualizarStatusFiscalPedido: (orderId: number, data: {
    nfeStatus?: "PENDING" | "ISSUED" | "REJECTED" | "CANCELLED";
    nfeAccessKey?: string | null;
    nfeDanfeUrl?: string | null;
    nfeRejectionReason?: string | null;
}) => Promise<void>;
export declare const listarFiadosPorSlug: (slug: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    isActive: boolean;
    notes: string | null;
    customerName: string;
    customerPhone: string | null;
    customerCpf: string | null;
    creditLimit: number;
    debtBalance: number;
}[]>;
export declare const criarFiado: (input: Omit<typeof customerLedgersTable.$inferInsert, "id" | "createdAt" | "updatedAt" | "debtBalance">) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    isActive: boolean;
    notes: string | null;
    customerName: string;
    customerPhone: string | null;
    customerCpf: string | null;
    creditLimit: number;
    debtBalance: number;
}>;
export declare const atualizarFiado: (id: string, data: Partial<Pick<typeof customerLedgersTable.$inferInsert, "customerName" | "customerPhone" | "customerCpf" | "creditLimit" | "isActive" | "notes">>) => Promise<{
    id: string;
    restaurantId: string;
    customerName: string;
    customerPhone: string | null;
    customerCpf: string | null;
    creditLimit: number;
    debtBalance: number;
    isActive: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare const listarLancamentosFiado: (ledgerId: string) => Promise<{
    id: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    type: "DEBIT" | "CREDIT";
    amount: number;
    orderId: number | null;
    bankAccountId: string | null;
    ledgerId: string;
}[]>;
export declare const registrarDebitoFiado: (input: {
    ledgerId: string;
    restaurantId: string;
    orderId: number;
    amount: number;
    description: string;
}) => Promise<{
    id: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    type: "DEBIT" | "CREDIT";
    amount: number;
    orderId: number | null;
    bankAccountId: string | null;
    ledgerId: string;
}>;
export declare const registrarPagamentoFiado: (input: {
    ledgerId: string;
    restaurantId: string;
    bankAccountId?: string;
    amount: number;
    description: string;
}) => Promise<{
    id: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    type: "DEBIT" | "CREDIT";
    amount: number;
    orderId: number | null;
    bankAccountId: string | null;
    ledgerId: string;
}>;
export declare const criarExtratoImportado: (input: {
    restaurantId: string;
    bankAccountId: string;
    fileName: string;
    periodStart?: string;
    periodEnd?: string;
    totalEntries: number;
}) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    bankAccountId: string;
    fileName: string;
    periodStart: string | null;
    periodEnd: string | null;
    totalEntries: number;
    matchedEntries: number;
}>;
export declare const listarExtratosPorConta: (bankAccountId: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    bankAccountId: string;
    fileName: string;
    periodStart: string | null;
    periodEnd: string | null;
    totalEntries: number;
    matchedEntries: number;
}[]>;
export declare const criarLinhasExtrato: (entries: Array<Omit<typeof bankStatementEntriesTable.$inferInsert, "id" | "createdAt" | "updatedAt">>) => Promise<{
    id: string;
    description: string;
    status: "PENDING" | "MATCHED" | "IGNORED";
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    amount: number;
    statementId: string;
    entryDate: string;
    matchedTransactionId: string | null;
}[]>;
export declare const listarLinhasExtrato: (statementId: string) => Promise<{
    id: string;
    description: string;
    status: "PENDING" | "MATCHED" | "IGNORED";
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    amount: number;
    statementId: string;
    entryDate: string;
    matchedTransactionId: string | null;
}[]>;
export declare const vincularLinhaExtratoTransacao: (entryId: string, transactionId: string | null) => Promise<{
    id: string;
    statementId: string;
    restaurantId: string;
    entryDate: string;
    description: string;
    amount: number;
    status: "PENDING" | "MATCHED" | "IGNORED";
    matchedTransactionId: string | null;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare const ignorarLinhaExtrato: (entryId: string) => Promise<void>;
export declare const pausarBot: (restaurantId: string, customerPhone: string) => Promise<void>;
export declare const reativarBot: (restaurantId: string) => Promise<void>;
export declare const buscarStatusHandoff: (restaurantId: string) => Promise<{
    isBotPaused: boolean;
    pausedAt: Date | null;
    pausedForPhone: string | null;
    conversationStatus: "BOT_ACTIVE" | "HUMAN_REQUIRED";
}>;
export interface CriarGastoMarketingInput {
    restaurantId: string;
    referenceMonth: string;
    channel: "META_ADS" | "GOOGLE_ADS" | "OTHER";
    amountSpent: number;
    notes?: string;
}
export declare const criarGastoMarketing: (input: CriarGastoMarketingInput) => Promise<void>;
export declare const listarGastosMarketing: (restaurantId: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    restaurantId: string;
    referenceMonth: string;
    channel: "META_ADS" | "GOOGLE_ADS" | "OTHER";
    amountSpent: number;
    notes: string | null;
}[]>;
export declare const excluirGastoMarketing: (id: string) => Promise<void>;
export {};
