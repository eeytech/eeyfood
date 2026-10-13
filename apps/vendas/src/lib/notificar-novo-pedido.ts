interface NotificarNovoPedidoInput {
  orderId: number;
  restaurantSlug: string;
}

export const notificarNovoPedido = async ({
  orderId,
  restaurantSlug,
}: NotificarNovoPedidoInput) => {
  const rawUrl =
    process.env.WEBSOCKET_SERVER_URL ||
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
    process.env.WEBSOCKET_URL ||
    "http://localhost:4000";

  const websocketServerUrl = rawUrl
    .trim()
    .replace(/^ws:\/\//i, "http://")
    .replace(/^wss:\/\//i, "https://");

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
