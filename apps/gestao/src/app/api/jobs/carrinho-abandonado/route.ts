import {
  abandonedCartsTable,
  aiSettingsTable,
  and,
  couponsTable,
  customerInteractionsTable,
  customersTable,
  db,
  eq,
  lte,
  marketingSettingsTable,
  ne,
  restaurantsTable,
  sql,
} from "@fsw/db";
import axios from "axios";
import { NextResponse } from "next/server";

const VENDAS_URL = process.env.VENDAS_URL || "http://localhost:3001";
const EVOLUTION_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    // Fetch all restaurants that have abandoned cart recovery enabled
    const settings = await db
      .select({
        restaurantId: marketingSettingsTable.restaurantId,
        slug: restaurantsTable.slug,
        delayMinutes: marketingSettingsTable.abandonedCartDelayMinutes,
        couponPercent: marketingSettingsTable.abandonedCartCouponPercent,
        enabled: marketingSettingsTable.abandonedCartEnabled,
        evolutionInstance: aiSettingsTable.evolutionInstanceName,
        evolutionApiKey: aiSettingsTable.evolutionApiKey,
      })
      .from(marketingSettingsTable)
      .innerJoin(restaurantsTable, eq(marketingSettingsTable.restaurantId, restaurantsTable.id))
      .leftJoin(aiSettingsTable, eq(aiSettingsTable.restaurantId, marketingSettingsTable.restaurantId))
      .where(eq(marketingSettingsTable.abandonedCartEnabled, true));

    let totalSent = 0;

    for (const setting of settings) {
      if (!setting.evolutionInstance || !setting.evolutionApiKey) continue;

      const cutoff = new Date(Date.now() - setting.delayMinutes * 60 * 1000);

      const carts = await db.query.abandonedCartsTable.findMany({
        where: and(
          eq(abandonedCartsTable.restaurantId, setting.restaurantId),
          eq(abandonedCartsTable.status, "ACTIVE"),
          lte(abandonedCartsTable.updatedAt, cutoff),
          ne(abandonedCartsTable.customerPhone, ""),
        ),
      });

      for (const cart of carts) {
        if (!cart.customerPhone) continue;

        // Skip if we already sent a recovery message for this cart session
        const alreadySent = await db.query.customerInteractionsTable.findFirst({
          where: and(
            eq(customerInteractionsTable.restaurantId, setting.restaurantId),
            sql`${customerInteractionsTable.message} LIKE ${"%" + cart.sessionId + "%"}`,
          ),
        });
        if (alreadySent) continue;

        // Create or find the customer record
        const customer = await db.query.customersTable.findFirst({
          where: and(
            eq(customersTable.restaurantId, setting.restaurantId),
            eq(customersTable.phone, cart.customerPhone),
          ),
        });

        let couponCode: string | null = null;

        if (setting.couponPercent > 0) {
          couponCode = `VOLTA${cart.customerPhone.slice(-4)}`;
          const existing = await db.query.couponsTable.findFirst({
            where: and(
              eq(couponsTable.restaurantId, setting.restaurantId),
              eq(couponsTable.code, couponCode),
            ),
          });
          if (!existing) {
            await db.insert(couponsTable).values({
              restaurantId: setting.restaurantId,
              code: couponCode,
              discountType: "PERCENTAGE",
              discountValue: setting.couponPercent,
              usageLimit: 1,
              perCustomerLimit: 1,
              isActive: true,
              endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
            });
          }
        }

        const firstName = cart.customerName?.split(" ")[0] ?? "Olá";
        const itemsSummary = (cart.cartSnapshot as Array<{ name: string; quantity: number }>)
          .slice(0, 3)
          .map((i) => `• ${i.quantity}x ${i.name}`)
          .join("\n");

        const checkoutLink = `${VENDAS_URL}/${setting.slug}/menu?cartId=${cart.id}`;

        let message = `Oi ${firstName}! 👋\n\nVocê esqueceu alguns itens no carrinho:\n${itemsSummary}\n\n`;
        if (couponCode) {
          message += `Use o cupom *${couponCode}* e ganhe ${setting.couponPercent}% de desconto para finalizar seu pedido!\n\n`;
        }
        message += `Clique aqui para continuar: ${checkoutLink}`;

        try {
          await axios.post(
            `${EVOLUTION_URL}/message/sendText/${setting.evolutionInstance}`,
            { number: cart.customerPhone, text: message },
            { headers: { apikey: setting.evolutionApiKey } },
          );

          if (customer) {
            await db.insert(customerInteractionsTable).values({
              restaurantId: setting.restaurantId,
              customerId: customer.id,
              type: "CART_RECOVERY",
              channel: "WHATSAPP",
              message: `Recuperação de carrinho [${cart.sessionId}]: ${message}`,
              sentAt: new Date(),
            });
          }

          totalSent++;
        } catch (err) {
          console.error(`Falha ao enviar mensagem para ${cart.customerPhone}:`, err);
        }
      }
    }

    return NextResponse.json({ ok: true, totalSent });
  } catch (error) {
    console.error("Erro no job de carrinho abandonado:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
