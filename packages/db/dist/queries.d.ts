import type { AbandonedCart, ConsumptionMethod, Courier, FinancialCategory, FinancialTransaction, MesaComanda, Order, OrderComItens, OrderStatus, PaymentMethod, PaymentStatus, PedidoBeneficiosValidado, PedidoRecebimento, ProductComRestaurante, ProductOption, ProductOptionGroup, Restaurant, RestaurantComCategoriasEProdutos, TransactionStatus } from "./types.js";
export declare const listarCategoriasFinanceirasPorSlug: (slug: string) => Promise<FinancialCategory[]>;
export declare const criarTransacaoFinanceira: (input: Omit<FinancialTransaction, "id" | "createdAt" | "updatedAt">) => Promise<FinancialTransaction>;
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
    products: Array<{
        id: string;
        quantity: number;
        selectedOptions?: string[];
    }>;
    diningTableId?: string;
}
export interface ValidarBeneficiosPedidoInput {
    customerPhone: string;
    slug: string;
    couponCode?: string;
    useWalletBalance?: boolean;
    products: Array<{
        id: string;
        quantity: number;
        selectedOptions?: string[];
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
    restaurantId: string;
    status: "PENDING" | "CANCELLED" | "IN_PREPARATION" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "FINISHED";
    createdAt: Date;
    updatedAt: Date;
    paidAt: Date | null;
    subtotal: number;
    discountAmount: number;
    couponDiscountAmount: number;
    cashbackRedeemedAmount: number;
    cashbackEarnedAmount: number;
    deliveryFee: number;
    total: number;
    estimatedCost: number;
    estimatedProfit: number;
    paymentStatus: "PENDING" | "PAID" | "CANCELLED" | "FAILED" | "REFUNDED";
    consumptionMethod: "TAKEAWAY" | "DINE_IN" | "DELIVERY";
    paymentMethod: "MERCADO_PAGO" | "DINHEIRO" | "CARTAO_PRESENCIAL";
    changeFor: number | null;
    notes: string | null;
    couponId: string | null;
    couponCode: string | null;
    diningTableId: string | null;
    courierId: string | null;
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
    restaurant: {
        id: string;
        name: string;
        slug: string;
        description: string;
        avatarImageUrl: string;
        coverImageUrl: string;
        status: "AUTO" | "ALWAYS_OPEN" | "ALWAYS_CLOSED";
        cashbackPercent: number;
        address: string | null;
        latitude: number | null;
        longitude: number | null;
        createdAt: Date;
        updatedAt: Date;
    };
    courier: {
        id: string;
        name: string;
        restaurantId: string;
        latitude: number | null;
        longitude: number | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        phone: string;
        vehicleType: string | null;
        licensePlate: string | null;
    } | null;
} | undefined>;
export declare const despacharPedido: ({ orderId, courierId, }: DespacharPedidoInput) => Promise<(AtualizacaoPedidoBase & {
    courierId: string;
    dispatchedAt: Date;
}) | null>;
export {};
