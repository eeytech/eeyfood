interface NotificarNovoPedidoInput {
  orderId: number;
  restaurantSlug: string;
}

export const notificarNovoPedido = async ({
  orderId,
  restaurantSlug,
}: NotificarNovoPedidoInput) => {
  const websocketServerUrl = process.env.WEBSOCKET_SERVER_URL;

  if (!websocketServerUrl) {
    return;
  }

  try {
    await fetch(`${websocketServerUrl}/eventos/novo-pedido`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        restaurantSlug,
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Falha ao notificar o servidor de tempo real.", error);
  }
};
