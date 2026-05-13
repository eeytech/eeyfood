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
  const websocketServerUrl = process.env.WEBSOCKET_SERVER_URL;

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
