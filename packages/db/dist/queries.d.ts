import type { ConsumptionMethod, Order, OrderComItens, OrderStatus, PaymentMethod, PaymentStatus, PedidoRecebimento, ProductComRestaurante, Restaurant, RestaurantComCategoriasEProdutos } from "./types.js";
export interface CriarPedidoInput {
    customerName: string;
    customerPhone: string;
    slug: string;
    consumptionMethod: ConsumptionMethod;
    paymentMethod: PaymentMethod;
    changeFor?: number;
    notes?: string;
    products: Array<{
        id: string;
        quantity: number;
    }>;
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
export declare const buscarRestauranteComCardapioPorSlug: (slug: string) => Promise<RestaurantComCategoriasEProdutos | null>;
export declare const buscarProdutoDoRestaurante: ({ slug, productId, }: {
    slug: string;
    productId: string;
}) => Promise<ProductComRestaurante | null>;
export declare const buscarPedidosPorTelefone: (customerPhone: string) => Promise<OrderComItens[]>;
export declare const criarPedido: (input: CriarPedidoInput) => Promise<Order>;
export declare const atualizarStatusPedido: ({ orderId, status, }: AtualizarStatusPedidoInput) => Promise<(AtualizacaoPedidoBase & {
    status: OrderStatus;
}) | null>;
export declare const atualizarStatusPagamentoPedido: ({ orderId, paymentStatus, }: AtualizarStatusPagamentoPedidoInput) => Promise<(AtualizacaoPedidoBase & {
    paymentStatus: PaymentStatus;
}) | null>;
export declare const buscarPedidoRecebimentoPorId: (orderId: number) => Promise<PedidoRecebimento | null>;
export declare const listarPedidosRecebimentoPorSlug: (slug: string) => Promise<PedidoRecebimento[]>;
export {};
