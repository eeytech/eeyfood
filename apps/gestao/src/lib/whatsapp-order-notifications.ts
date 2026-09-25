import {
  aiSettingsTable,
  buscarPedidoRecebimentoPorId,
  buscarRestaurantePorSlug,
  couriersTable,
  db,
  eq,
  restaurantsTable,
} from "@fsw/db";
import axios from "axios";

interface NotificarWhatsAppStatusInput {
  orderId: number;
  restaurantSlug: string;
  status?: string;
  paymentStatus?: string;
}

export const enviarNotificacaoWhatsAppStatusPedido = async ({
  orderId,
  restaurantSlug,
  status,
}: NotificarWhatsAppStatusInput) => {
  if (!status) return;

  try {
    const restaurant = await buscarRestaurantePorSlug(restaurantSlug);
    if (!restaurant) return;

    // Buscar configurações de IA e WhatsApp do restaurante
    const [aiSettings] = await db
      .select()
      .from(aiSettingsTable)
      .where(eq(aiSettingsTable.restaurantId, restaurant.id))
      .limit(1);

    if (
      !aiSettings ||
      !aiSettings.evolutionInstanceName ||
      !aiSettings.evolutionApiKey
    ) {
      // WhatsApp não conectado para este restaurante
      return;
    }

    const order = await buscarPedidoRecebimentoPorId(orderId);
    if (!order || !order.customerPhone) return;

    // Normalizar telefone para envio (apenas dígitos, ex: 5511999999999)
    let phone = order.customerPhone.replace(/\D/g, "");
    if (!phone || phone.length < 10) return;
    if (!phone.startsWith("55") && (phone.length === 10 || phone.length === 11)) {
      phone = `55${phone}`;
    }

    const customerFirstName = order.customerName.trim().split(" ")[0];
    const restaurantName = restaurant.name;
    const vendasBaseUrl =
      process.env.NEXT_PUBLIC_VENDAS_URL || "https://fswdonalds.eeytech.com";
    const trackingUrl = `${vendasBaseUrl}/orders/${orderId}/tracking`;

    let messageText = "";

    // 1. Pedido em preparo (Confirmado pela cozinha)
    if (status === "IN_PREPARATION") {
      messageText = `👨‍🍳 *Olá, ${customerFirstName}!*

Seu pedido *#${orderId}* no *${restaurantName}* foi confirmado e já está sendo preparado com muito carinho!

🕒 *Tempo estimado:* 30 a 45 minutos.
Assim que sair para entrega ou ficar pronto, avisaremos você por aqui!`;
    }

    // 2. Pedido saiu para entrega
    else if (status === "OUT_FOR_DELIVERY") {
      let courierInfo = "";
      if (order.courierId) {
        try {
          const [courier] = await db
            .select({ name: couriersTable.name, phone: couriersTable.phone })
            .from(couriersTable)
            .where(eq(couriersTable.id, order.courierId))
            .limit(1);
          if (courier) {
            courierInfo = ` com o entregador *${courier.name}*`;
          }
        } catch {
          // ignore
        }
      }

      messageText = `🚀 *${customerFirstName}, seu pedido #${orderId} acabou de sair para entrega${courierInfo}!*

📍 *Acompanhe seu pedido no mapa AO VIVO:*
${trackingUrl}

Por favor, mantenha alguém atento ao interfone ou portão. Tenha uma excelente refeição! 😋`;
    }

    // 3. Pedido pronto para retirada no balcão (Takeaway ou Dine-in)
    else if (status === "READY_FOR_PICKUP") {
      messageText = `🎉 *Oba, ${customerFirstName}!*

Seu pedido *#${orderId}* está *PRONTO* no balcão do *${restaurantName}*!
Você já pode retirá-lo informando o número do pedido ou seu nome.

Aguardamos você! Bom apetite! 🍽️`;
    }

    // 4. Pedido concluído / entregue
    else if (status === "FINISHED") {
      messageText = `✅ *Pedido #${orderId} finalizado com sucesso!*

Muito obrigado por escolher o *${restaurantName}*. Esperamos que sua experiência tenha sido maravilhosa!

⭐ *Avalie seu pedido aqui:*
${vendasBaseUrl}/orders

Até a próxima! ❤️`;
    }

    if (!messageText) return;

    const evolutionUrl =
      process.env.EVOLUTION_API_URL ||
      process.env.EVOLUTION_URL ||
      "http://localhost:8080";

    await axios.post(
      `${evolutionUrl}/message/sendText/${aiSettings.evolutionInstanceName}`,
      {
        number: phone,
        text: messageText,
      },
      {
        headers: {
          apikey: aiSettings.evolutionApiKey,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      },
    );
  } catch (error) {
    // Falha silenciosa para não quebrar a transação de status do pedido caso a Evolution API oscile
    console.warn(
      `[WhatsApp] Falha ao enviar notificação de status para o pedido #${orderId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
};
