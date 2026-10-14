/**
 * Centralized formatting and masking utility functions for EeyFood Vendas.
 * Supports Brazilian document standards (CPF, CNPJ, Phone, CEP, Plates, Currencies, Dates).
 */

/**
 * Removes all non-digit characters from a string.
 */
export const cleanDigits = (value: string | null | undefined): string => {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
};

/**
 * Formats a string to Brazilian CPF: 000.000.000-00
 */
export const formatCpf = (value: string | null | undefined): string => {
  const digits = cleanDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

/**
 * Formats a string to Brazilian CNPJ: 00.000.000/0000-00
 */
export const formatCnpj = (value: string | null | undefined): string => {
  const digits = cleanDigits(value).slice(0, 14);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

/**
 * Formats a string to either CPF or CNPJ depending on digit count.
 */
export const formatCpfCnpj = (value: string | null | undefined): string => {
  const digits = cleanDigits(value).slice(0, 14);
  if (digits.length > 11) {
    return formatCnpj(digits);
  }
  return formatCpf(digits);
};

/**
 * Formats a string to Brazilian phone number:
 * (00) 0000-0000 or (00) 00000-0000
 */
export const formatPhone = (value: string | null | undefined): string => {
  const digits = cleanDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

/**
 * Formats a string to Brazilian CEP: 00000-000
 */
export const formatCep = (value: string | null | undefined): string => {
  const digits = cleanDigits(value).slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

/**
 * Formats a monetary amount into BRL currency mask:
 * e.g. "1234" -> "12,34" or 12.34 -> "12,34"
 */
export const formatCurrencyInput = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    if (isNaN(value)) return "";
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  const digits = cleanDigits(value);
  if (!digits) return "";
  const num = Number(digits) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Parses a currency input string (e.g. "1.234,56" or "12,34") into a numeric float.
 */
export const parseCurrencyInput = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const digits = cleanDigits(value);
  if (!digits) return 0;
  return Number(digits) / 100;
};

/**
 * Formats a vehicle plate to standard ABC-1234 or Mercosul ABC1D23.
 */
export const formatPlate = (value: string | null | undefined): string => {
  if (!value) return "";
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
};

/**
 * Formats date to DD/MM/YYYY
 */
export const formatDateInput = (value: string | null | undefined): string => {
  const digits = cleanDigits(value).slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/**
 * Formats time to HH:mm
 */
export const formatTimeInput = (value: string | null | undefined): string => {
  const digits = cleanDigits(value).slice(0, 4);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

/**
 * Formats Inscrição Estadual (IE) - only digits, max 14 characters.
 */
export const formatIe = (value: string | null | undefined): string => {
  return cleanDigits(value).slice(0, 14);
};
