import type { AbandonedCart, ComandaAvulsaComPedido, ConsumptionMethod, Courier, MarketplaceType, MesaComanda, Order, OrderComItens, OrderProduct, OrderProductItemStatus, OrderStatus, PaymentMethod, PaymentStatus, PedidoBeneficiosValidado, PedidoRecebimento, Product, ProductComRestaurante, ProductionSector, ProductOption, ProductOptionGroup, Restaurant, RestaurantComCategoriasEProdutos, TableReservation, Waiter, WaitingQueueEntry } from "./types.js";
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
    restaurantId: string;
    status: "PENDING" | "IN_PREPARATION" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "FINISHED" | "CANCELLED";
    deliveryFee: number;
    createdAt: Date;
    updatedAt: Date;
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
        restaurantId: string;
        phone: string;
        latitude: number | null;
        longitude: number | null;
        createdAt: Date;
        updatedAt: Date;
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
export declare const listarSetoresProducaoPorSlug: (slug: string) => Promise<ProductionSector[]>;
export declare const atualizarStatusItemPedido: ({ itemId, itemStatus, }: {
    itemId: string;
    itemStatus: OrderProductItemStatus;
}) => Promise<OrderProduct | null>;
export declare const despacharPedido: ({ orderId, courierId, }: DespacharPedidoInput) => Promise<(AtualizacaoPedidoBase & {
    courierId: string;
    dispatchedAt: Date;
}) | null>;
export {};
