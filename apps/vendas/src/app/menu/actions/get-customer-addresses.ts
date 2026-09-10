"use server";

import { buscarEnderecosClientePorTelefone } from "@/lib/db";
import type { CustomerAddress } from "@/lib/db";

import { normalizePhoneNumber } from "../helpers/phone";

export const getCustomerAddresses = async (
  phone: string,
): Promise<CustomerAddress[]> => {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone || normalizedPhone.length !== 11) {
    return [];
  }

  try {
    return await buscarEnderecosClientePorTelefone(normalizedPhone);
  } catch (error) {
    console.error("Erro ao buscar endereços do cliente:", error);
    return [];
  }
};
