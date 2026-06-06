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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    console.error("Falha ao notificar o servidor de tempo real.", error);
  }
};
