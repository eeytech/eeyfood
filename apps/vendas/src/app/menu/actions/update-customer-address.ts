"use server";

import { editarEnderecoCliente } from "@/lib/db";
import type { CustomerAddress } from "@/lib/db";

interface UpdateCustomerAddressInput {
  id: string;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  reference?: string;
  city?: string;
  state?: string;
}

export const updateCustomerAddress = async (
  input: UpdateCustomerAddressInput,
): Promise<CustomerAddress | null> => {
  try {
    const updated = await editarEnderecoCliente(input);
    return updated ?? null;
  } catch (error) {
    console.error("Falha ao atualizar endereço do cliente:", error);
    throw new Error("Não foi possível salvar as alterações do endereço.");
  }
};
