/**
 * Utilitários para formatação e normalização de números e configurações do WhatsApp (Evolution API).
 */

export function cleanKey(val?: string | null): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

/**
 * Normaliza qualquer formato de telefone brasileiro ou internacional para o padrão E.164
 * exigido pela Evolution API / WhatsApp (somente dígitos com DDI, ex: 5516993407575).
 */
export function normalizeWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // Corrige caso venha com 550 (ex: 55 016 99999-9999 discagem com operadora)
  if (digits.startsWith("550")) {
    digits = "55" + digits.slice(3);
  }

  // Remove zero à esquerda de DDDs avulsos (ex: 016999999999 -> 16999999999)
  digits = digits.replace(/^0+/, "");

  // Se já possui DDI 55 (Brasil) e tem tamanho completo (12 dígitos fixo ou 13 dígitos celular)
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Se for número brasileiro nacional sem DDI (10 dígitos com DDD para fixo, ou 11 dígitos com DDD para celular)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Se for número com outro DDI internacional válido (>= 11 dígitos e não começa com 55)
  if (digits.length >= 11) {
    return digits;
  }

  return null;
}

/**
 * Formata um número de telefone para exibição visual amigável (ex: (16) 99340-7575)
 */
export function formatWhatsAppPhoneDisplay(phone?: string | null): string {
  if (!phone) return "—";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return phone;

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  return phone;
}
