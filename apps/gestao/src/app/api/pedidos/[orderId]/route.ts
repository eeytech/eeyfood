import {
  atualizarStatusPagamentoPedido,
  atualizarStatusPedido,
  buscarPedidoRecebimentoPorId,
  type OrderStatus,
  type PaymentStatus,
} from "@fsw/db";
import { NextResponse } from "next/server";

import { notificarAtualizacaoPedido } from "@/lib/notificar-atualizacao-pedido";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

interface PedidoPatchPayload {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

const ORDER_STATUS_VALUES: OrderStatus[] = [
  "PENDING",
  "IN_PREPARATION",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "FINISHED",
  "CANCELLED",
];

const PAYMENT_STATUS_VALUES: PaymentStatus[] = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
];

const getOrderId = async (context: RouteContext) => {
  const { orderId } = await context.params;
  const parsedOrderId = Number(orderId);

  if (Number.isNaN(parsedOrderId)) {
    return null;
  }

  return parsedOrderId;
};

const isOrderStatus = (value: unknown): value is OrderStatus => {
  return typeof value === "string" && ORDER_STATUS_VALUES.includes(value as OrderStatus);
};

const isPaymentStatus = (value: unknown): value is PaymentStatus => {
  return (
    typeof value === "string" &&
    PAYMENT_STATUS_VALUES.includes(value as PaymentStatus)
  );
};

const parsePayload = async (request: Request): Promise<PedidoPatchPayload> => {
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body) {
    return {
      paymentStatus: "PAID",
    };
  }

  const payload: PedidoPatchPayload = {};

  if (isOrderStatus(body.status)) {
    payload.status = body.status;
  }

  if (isPaymentStatus(body.paymentStatus)) {
    payload.paymentStatus = body.paymentStatus;
  }

  return payload;
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

export async function PATCH(request: Request, context: RouteContext) {
  const orderId = await getOrderId(context);

  if (!orderId) {
    return NextResponse.json(
      { message: "Identificador de pedido inválido." },
      { status: 400 },
    );
  }

  const payload = await parsePayload(request);

  if (!payload.status && !payload.paymentStatus) {
    return NextResponse.json(
      { message: "Nenhuma atualização válida foi informada." },
      { status: 400 },
    );
  }

  let updatedStatus: OrderStatus | undefined;
  let updatedPaymentStatus: PaymentStatus | undefined;
  let restaurantSlug: string | null = null;

  if (payload.status) {
    const updatedOrder = await atualizarStatusPedido({
      orderId,
      status: payload.status,
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { message: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    updatedStatus = updatedOrder.status;
    restaurantSlug = updatedOrder.restaurantSlug;
  }

  if (payload.paymentStatus) {
    const updatedOrder = await atualizarStatusPagamentoPedido({
      orderId,
      paymentStatus: payload.paymentStatus,
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { message: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    updatedPaymentStatus = updatedOrder.paymentStatus;
    restaurantSlug = updatedOrder.restaurantSlug;
  }

  if (restaurantSlug) {
    await notificarAtualizacaoPedido({
      orderId,
      restaurantSlug,
      status: updatedStatus,
      paymentStatus: updatedPaymentStatus,
    });
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
