import crypto from "node:crypto";

const getWebhookSecret = () => {
  return (
    process.env.INFINITEPAY_WEBHOOK_SECRET ||
    process.env.JWT_SECRET ||
    "eeyfood_infinitepay_webhook_signature_2026"
  );
};

/**
 * Gera assinatura HMAC segura para validação do webhook da InfinitePay
 */
export const generateOrderWebhookToken = (orderId: number | string): string => {
  const secret = getWebhookSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(String(orderId))
    .digest("hex");
};

/**
 * Valida a autenticidade da notificação de webhook
 */
export const verifyOrderWebhookToken = (
  orderId: number | string,
  token: string | null | undefined,
  secretHeaderOrQuery?: string | null,
): boolean => {
  const configuredSecret = process.env.INFINITEPAY_WEBHOOK_SECRET;
  if (configuredSecret && secretHeaderOrQuery === configuredSecret) {
    return true;
  }
  if (!token) return false;

  const expectedToken = generateOrderWebhookToken(orderId);
  try {
    const bufA = Buffer.from(token, "hex");
    const bufB = Buffer.from(expectedToken, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};
