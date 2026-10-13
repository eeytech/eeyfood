export const notificarGarcom = async ({
  restaurantSlug,
  tableId,
  tableName,
}: {
  restaurantSlug: string;
  tableId: string;
  tableName: string;
}) => {
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

    const res = await fetch(`${websocketServerUrl}/eventos/chamar-garcom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantSlug, tableId, tableName }),
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) {
      console.warn(`[notificarGarcom] Servidor WebSocket retornou status ${res.status}`);
    }
  } catch (error) {
    console.error("Falha ao notificar garçom via WebSocket:", error);
  }
};
