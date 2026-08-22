"use server";

import { buscarPedidoParaRastreamento } from "@fsw/db";

export const getOrderTracking = async (orderId: number) => {
  try {
    const pedido = await buscarPedidoParaRastreamento(orderId);
    return pedido;
  } catch (error) {
    console.error("Erro ao buscar rastreamento do pedido:", error);
    return null;
  }
};
