interface NotificarItemAtualizadoInput {
  orderId: number;
  itemId: string;
  restaurantSlug: string;
  itemStatus: string;
}

export const notificarItemAtualizado = async ({
  orderId,
  itemId,
  restaurantSlug,
  itemStatus,
}: NotificarItemAtualizadoInput) => {
  const websocketServerUrl = process.env.WEBSOCKET_SERVER_URL;

  if (!websocketServerUrl) {
    return;
  }

  try {
    await fetch(`${websocketServerUrl}/eventos/item-atualizado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, itemId, restaurantSlug, itemStatus }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Falha ao notificar atualização de item.", error);
  }
};
