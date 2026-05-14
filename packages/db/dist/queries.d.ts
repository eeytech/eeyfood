import type { AbandonedCart, ConsumptionMethod, MesaComanda, Order, OrderComItens, OrderStatus, PaymentMethod, PaymentStatus, PedidoBeneficiosValidado, PedidoRecebimento, ProductComRestaurante, Restaurant, RestaurantComCategoriasEProdutos } from "./types.js";
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
export declare const buscarRestaurantePorSlug: (slug: string) => Promise<Restaurant | null>;
export declare const salvarCarrinhoAbandonado: (input: SalvarCarrinhoAbandonadoInput) => Promise<AbandonedCart | null>;
export declare const buscarRestauranteComCardapioPorSlug: (slug: string) => Promise<RestaurantComCategoriasEProdutos | null>;
export declare const buscarProdutoDoRestaurante: ({ slug, productId, }: {
    slug: string;
    productId: string;
}) => Promise<ProductComRestaurante | null>;
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
export {};
