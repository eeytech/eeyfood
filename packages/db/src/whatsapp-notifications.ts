import { eq } from "drizzle-orm";

import { db } from "./client";
import { buscarPedidoRecebimentoPorId, buscarRestaurantePorSlug } from "./queries";
import { aiSettingsTable, couriersTable } from "./schema";
import type { OrderStatus, PaymentStatus } from "./types";

export interface NotificarWhatsAppStatusInput {
  orderId: number;
  restaurantSlug: string;
  status?: OrderStatus | string;
  paymentStatus?: PaymentStatus | string;
}

/**
 * Normaliza qualquer formato de telefone brasileiro ou internacional para o padrão E.164
 * exigido pela Evolution API / WhatsApp (somente dígitos com DDI, ex: 5511999999999).
 */
export function normalizeWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // Corrige caso venha com 550 (discagem com código de operadora 0)
  if (digits.startsWith("550")) {
    digits = "55" + digits.slice(3);
  }

  // Remove zeros à esquerda
  digits = digits.replace(/^0+/, "");

  // Se já possui DDI 55 (Brasil) e tem 12 (fixo) ou 13 (celular) dígitos
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Se for número nacional brasileiro sem DDI (10 dígitos fixo ou 11 celular)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Se for outro número internacional válido (>= 11 dígitos)
  if (digits.length >= 11) {
    return digits;
  }

  return null;
}

export const notificarStatusWhatsAppPedido = async ({
  orderId,
  restaurantSlug,
  status,
}: NotificarWhatsAppStatusInput): Promise<void> => {
  if (!status) return;

  try {
    const restaurant = await buscarRestaurantePorSlug(restaurantSlug);
    if (!restaurant) return;

    // Buscar configurações de IA e WhatsApp do restaurante
    const [aiSettings] = await db
      .select({
        evolutionInstanceName: aiSettingsTable.evolutionInstanceName,
        evolutionApiKey: aiSettingsTable.evolutionApiKey,
      })
      .from(aiSettingsTable)
      .where(eq(aiSettingsTable.restaurantId, restaurant.id))
      .limit(1);

    const envApiKey = (
      process.env.EVOLUTION_API_KEY ||
      process.env.AUTHENTICATION_API_KEY ||
      ""
    )
      .trim()
      .replace(/^["']|["']$/g, "");

    const storedApiKey = (aiSettings?.evolutionApiKey || "")
      .trim()
      .replace(/^["']|["']$/g, "");
    const apiKey = envApiKey || storedApiKey;

    let instanceName = (aiSettings?.evolutionInstanceName || "")
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!instanceName || instanceName === "burgercraft-bot") {
      instanceName = "eeyfood-bot";
    }

    // Se a instância ou a chave não estiverem preenchidas, WhatsApp não está conectado
    if (!instanceName || !apiKey) {
      return;
    }

    const order = await buscarPedidoRecebimentoPorId(orderId);
    if (!order || !order.customerPhone) return;

    // Se for telefone fictício de PDV (ex: PDV-123456789), ignora silenciosamente
    if (order.customerPhone.startsWith("PDV-")) return;

    const phone = normalizeWhatsAppNumber(order.customerPhone);
    if (!phone) return;

    const customerFirstName = (order.customerName || "Cliente").trim().split(" ")[0];
    const restaurantName = restaurant.name;
    const vendasBaseUrl = (
      process.env.NEXT_PUBLIC_VENDAS_URL ||
      process.env.VENDAS_URL ||
      "https://fswdonalds.eeytech.com"
    ).replace(/\/+$/, "");

    const trackingUrl = `${vendasBaseUrl}/orders/${orderId}/tracking`;

    let messageText = "";

    // ── 0. Pedido recebido (Novo pedido registrado no sistema) ──
    if (status === "PENDING") {
      const metodoText =
        order.consumptionMethod === "DELIVERY"
          ? "🛵 *Entrega (Delivery)*"
          : order.consumptionMethod === "TAKEAWAY"
            ? "🛍️ *Retirada no Balcão*"
            : "🍽️ *Consumo no Local*";

      const totalFormatado = Number(order.total || 0).toFixed(2).replace(".", ",");

      let pagamentoText = "";
      if (order.paymentMethod === "PIX") {
        pagamentoText =
          order.paymentStatus === "PAID"
            ? "Pix (Confirmado ✅)"
            : "Pix (Pendente de pagamento)";
      } else if (order.paymentMethod === "CARTAO_PRESENCIAL") {
        pagamentoText = "Cartão";
      } else if (order.paymentMethod === "DINHEIRO") {
        pagamentoText = order.changeFor
          ? `Dinheiro (Troco p/ R$ ${Number(order.changeFor).toFixed(2).replace(".", ",")})`
          : "Dinheiro";
      } else if (
        order.paymentMethod === "VALE_ALIMENTACAO" ||
        order.paymentMethod === "VALE_REFEICAO"
      ) {
        pagamentoText = "Vale Alimentação / Refeição";
      } else if (order.paymentMethod === "MERCADO_PAGO") {
        pagamentoText = "Mercado Pago";
      } else if (order.paymentMethod === "INFINITEPAY") {
        pagamentoText = "InfinitePay";
      } else if (order.paymentMethod === "FIADO") {
        pagamentoText = "Conta Assinada (Fiado)";
      }

      messageText = `👋 *Olá, ${customerFirstName}!*

Recebemos o seu pedido *#${orderId}* no *${restaurantName}*! 🎉

📋 *Modalidade:* ${metodoText}
💰 *Total:* R$ ${totalFormatado}${pagamentoText ? `\n💳 *Pagamento:* ${pagamentoText}` : ""}${
        order.deliveryAddress ? `\n📍 *Endereço:* ${order.deliveryAddress}` : ""
      }

⏳ Nosso time já está analisando o seu pedido. Assim que a cozinha iniciar o preparo, avisaremos você por aqui!

📍 *Acompanhe em tempo real:*
${trackingUrl}

Agradecemos a preferência! 💛`;
    }

    // ── 1. Pedido em preparo (Confirmado pela cozinha) ──
    else if (status === "IN_PREPARATION") {
      messageText = `👨‍🍳 *Olá, ${customerFirstName}!*

Seu pedido *#${orderId}* no *${restaurantName}* foi confirmado e já está sendo preparado com muito carinho! 🔥

🕒 *Previsão de preparo:* 20 a 40 minutos.
Assim que sair para entrega ou ficar pronto, avisaremos você por aqui!

📍 *Acompanhe em tempo real:*
${trackingUrl}`;
    }

    // ── 2. Pedido pronto (Expedição para Delivery ou Balcão para Retirada) ──
    else if (status === "READY_FOR_PICKUP") {
      if (order.consumptionMethod === "DELIVERY") {
        messageText = `🍕 *${customerFirstName}, seu pedido #${orderId} acabou de ficar pronto!*

Ele já foi cuidadosamente embalado na expedição do *${restaurantName}* e aguarda o entregador para iniciar a rota até você. Avisaremos assim que sair! 🛵

📍 *Acompanhe o status:*
${trackingUrl}`;
      } else if (order.consumptionMethod === "TAKEAWAY") {
        messageText = `🎉 *Oba, ${customerFirstName}!*

Seu pedido *#${orderId}* está *PRONTO PARA RETIRADA* no balcão do *${restaurantName}*! 🛍️

Você já pode vir buscar no estabelecimento. Basta apresentar seu nome (*${customerFirstName}*) ou o número *#${orderId}*.

Aguardamos você! Bom apetite! 🍽️`;
      } else {
        messageText = `🍽️ *${customerFirstName}, seu pedido #${orderId} está pronto e a caminho da sua mesa!*

Tenha uma excelente refeição! 😋`;
      }
    }

    // ── 3. Pedido saiu para entrega (Despachado com motoboy) ──
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

Por favor, mantenha alguém atento ao interfone ou portão. Tenha uma excelente refeição! 😋🛵`;
    }

    // ── 4. Pedido concluído / entregue ──
    else if (status === "FINISHED") {
      messageText = `✅ *Pedido #${orderId} finalizado com sucesso!*

Muito obrigado por escolher o *${restaurantName}*! Esperamos que sua experiência tenha sido maravilhosa. ❤️

⭐ *Avalie seu pedido aqui:*
${trackingUrl}

Até a próxima! 🍔🍕`;
    }

    // ── 5. Pedido cancelado ──
    else if (status === "CANCELLED") {
      messageText = `⚠️ *Olá, ${customerFirstName}.*

Informamos que o seu pedido *#${orderId}* no *${restaurantName}* foi cancelado.

Caso você tenha realizado pagamento via Pix ou precise de suporte, fale conosco diretamente por aqui.

Agradecemos a compreensão.`;
    }

    if (!messageText) return;

    const rawEvolutionUrl =
      process.env.EVOLUTION_API_URL ||
      process.env.EVOLUTION_URL ||
      "http://localhost:8080";
    const evolutionUrl = rawEvolutionUrl.trim().replace(/\/+$/, "");

    const url = `${evolutionUrl}/message/sendText/${encodeURIComponent(instanceName)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: phone,
        text: messageText,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(
        `[WhatsApp] Evolution API retornou status ${response.status} para o pedido #${orderId}: ${errText}`,
      );
    }
  } catch (error) {
    // Falha silenciosa para não quebrar a transação de status do pedido
    console.warn(
      `[WhatsApp] Falha ao enviar notificação de status para o pedido #${orderId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
};
