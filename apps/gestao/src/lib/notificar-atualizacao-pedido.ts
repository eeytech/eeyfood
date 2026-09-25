import { enviarNotificacaoWhatsAppStatusPedido } from "./whatsapp-order-notifications";

interface NotificarAtualizacaoPedidoInput {
  orderId: number;
  restaurantSlug: string;
  status?: string;
  paymentStatus?: string;
}

export const notificarAtualizacaoPedido = async ({
  orderId,
  restaurantSlug,
  status,
  paymentStatus,
}: NotificarAtualizacaoPedidoInput) => {
  // Disparo assíncrono da notificação transacional de WhatsApp para o cliente
  if (status) {
    enviarNotificacaoWhatsAppStatusPedido({
      orderId,
      restaurantSlug,
      status,
      paymentStatus,
    }).catch((err) =>
      console.warn("Aviso ao disparar notificação WhatsApp do pedido:", err),
    );
  }

  const websocketServerUrl =
    process.env.WEBSOCKET_SERVER_URL ||
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
    process.env.WEBSOCKET_URL;

  if (!websocketServerUrl) {
    return;
  }

  try {
    await fetch(`${websocketServerUrl}/eventos/pedido-atualizado`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        restaurantSlug,
        status,
        paymentStatus,
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Falha ao notificar atualização de pedido.", error);
  }
};
