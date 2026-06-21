export const notificarGarcom = async ({
  restaurantSlug,
  tableId,
  tableName,
}: {
  restaurantSlug: string;
  tableId: string;
  tableName: string;
}) => {
  const websocketServerUrl = process.env.WEBSOCKET_SERVER_URL;
  if (!websocketServerUrl) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch(`${websocketServerUrl}/eventos/chamar-garcom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantSlug, tableId, tableName }),
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    console.error("Falha ao notificar garçom.", error);
  }
};
