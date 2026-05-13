import {
  atualizarStatusPedido,
  buscarPedidoRecebimentoPorId,
} from "@fsw/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

const getOrderId = async (context: RouteContext) => {
  const { orderId } = await context.params;
  const parsedOrderId = Number(orderId);

  if (Number.isNaN(parsedOrderId)) {
    return null;
  }

  return parsedOrderId;
};

export async function GET(_request: Request, context: RouteContext) {
  const orderId = await getOrderId(context);

  if (!orderId) {
    return NextResponse.json(
      { message: "Identificador de pedido inválido." },
      { status: 400 },
    );
  }

  const order = await buscarPedidoRecebimentoPorId(orderId);

  if (!order) {
    return NextResponse.json(
      { message: "Pedido não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json(order);
}

export async function PATCH(_request: Request, context: RouteContext) {
  const orderId = await getOrderId(context);

  if (!orderId) {
    return NextResponse.json(
      { message: "Identificador de pedido inválido." },
      { status: 400 },
    );
  }

  const updatedOrder = await atualizarStatusPedido({
    orderId,
    status: "PAYMENT_CONFIRMED",
  });

  if (!updatedOrder) {
    return NextResponse.json(
      { message: "Pedido não encontrado." },
      { status: 404 },
    );
  }

  const order = await buscarPedidoRecebimentoPorId(orderId);

  if (!order) {
    return NextResponse.json(
      { message: "Pedido não encontrado após atualização." },
      { status: 404 },
    );
  }

  return NextResponse.json(order);
}
