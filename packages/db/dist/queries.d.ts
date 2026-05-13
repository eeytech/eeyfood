import type { ConsumptionMethod, Order, OrderComItens, OrderStatus, PaymentMethod, PedidoRecebimento, ProductComRestaurante, Restaurant, RestaurantComCategoriasEProdutos } from "./types.js";
export interface CriarPedidoInput {
    customerName: string;
    customerCpf: string;
    slug: string;
    consumptionMethod: ConsumptionMethod;
    paymentMethod: PaymentMethod;
    changeFor?: number;
    products: Array<{
        id: string;
        quantity: number;
    }>;
}
export declare const buscarRestaurantePorSlug: (slug: string) => Promise<Restaurant | null>;
export declare const buscarRestauranteComCardapioPorSlug: (slug: string) => Promise<RestaurantComCategoriasEProdutos | null>;
export declare const buscarProdutoDoRestaurante: ({ slug, productId, }: {
    slug: string;
    productId: string;
}) => Promise<ProductComRestaurante | null>;
export declare const buscarPedidosPorCpf: (customerCpf: string) => Promise<OrderComItens[]>;
export declare const criarPedido: (input: CriarPedidoInput) => Promise<Order>;
export declare const atualizarStatusPedido: ({ orderId, status, }: {
    orderId: number;
    status: OrderStatus;
}) => Promise<{
    id: number;
    status: OrderStatus;
    restaurantSlug: string;
} | null>;
export declare const buscarPedidoRecebimentoPorId: (orderId: number) => Promise<PedidoRecebimento | null>;
export declare const listarPedidosRecebimentoPorSlug: (slug: string) => Promise<PedidoRecebimento[]>;
