"use server";

import { buscarPedidosPorTelefone } from "@/lib/db";

export const buscarPedidosPorTelefoneAction = async (phone: string) => {
  return buscarPedidosPorTelefone(phone);
};
