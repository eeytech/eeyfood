"use client";

import { PedidoRecebimento } from "@fsw/db";
import { QRCodeSVG } from "qrcode.react";
import * as React from "react";

interface ThermalPrintLayoutProps {
  order: PedidoRecebimento;
  type: "PRODUCTION" | "DELIVERY";
}

const formatCurrency = (value: number | null) => {
  if (value === null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDateTime = (value: Date | string) => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export const ThermalPrintLayout = React.forwardRef<
  HTMLDivElement,
  ThermalPrintLayoutProps
>(({ order, type }, ref) => {
  const isProduction = type === "PRODUCTION";

  return (
    <div
      ref={ref}
      className="hidden print:block thermal-print-area w-[80mm] p-4 text-black font-mono text-[12px] leading-tight"
      style={{ width: "80mm" }}
    >
      {/* Cabeçalho */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold uppercase">{order.restaurant.name}</h1>
        {!isProduction && (
          <p className="text-[10px]">CNPJ: 00.000.000/0001-00</p>
        )}
        <div className="border-t border-dashed my-2" />
        <h2 className="text-md font-bold">
          {isProduction ? "CUPOM DE PRODUÇÃO" : "CUPOM DE ENTREGA"}
        </h2>
        <p className="text-xl font-bold mt-1">PEDIDO #{order.id}</p>
      </div>

      {/* Informações do Cliente */}
      {!isProduction && (
        <div className="mb-4">
          <p>
            <span className="font-bold">CLIENTE:</span> {order.customerName}
          </p>
          <p>
            <span className="font-bold">TEL:</span> {order.customerPhone}
          </p>
          <p>
            <span className="font-bold">DATA:</span> {formatDateTime(order.createdAt)}
          </p>
          <p>
            <span className="font-bold">MÉTODO:</span>{" "}
            {order.consumptionMethod === "DELIVERY"
              ? "ENTREGA"
              : order.consumptionMethod === "DINE_IN"
                ? "SALÃO"
                : "PARA LEVAR"}
          </p>
          {order.notes && (
            <p className="mt-2 italic">
              <span className="font-bold">OBS:</span> {order.notes}
            </p>
          )}
        </div>
      )}

      {isProduction && order.notes && (
        <div className="mb-4 border border-black p-2">
          <p className="font-bold">OBSERVAÇÕES DO PEDIDO:</p>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="border-t border-dashed my-2" />

      {/* Itens */}
      <div className="mb-4">
        <div className="flex justify-between font-bold mb-1">
          <span>ITEM</span>
          <span>QTD</span>
        </div>
        {order.orderProducts.map((item) => (
          <div key={item.id} className="flex justify-between mb-1">
            <span className="max-w-[70%]">{item.product.name}</span>
            <span>{item.quantity}x</span>
          </div>
        ))}
      </div>

      {!isProduction && (
        <>
          <div className="border-t border-dashed my-2" />
          {/* Totais */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>SUBTOTAL</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>TAXA ENTREGA</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            )}
            {order.discountAmount > 0 && (
              <div className="flex justify-between">
                <span>DESCONTO</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1">
              <span>TOTAL</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          <div className="border-t border-dashed my-2" />

          {/* Pagamento */}
          <div className="mb-4">
            <p>
              <span className="font-bold">PAGAMENTO:</span>{" "}
              {order.paymentMethod === "DINHEIRO"
                ? "DINHEIRO"
                : order.paymentMethod === "CARTAO_PRESENCIAL"
                  ? "CARTÃO (PRESENCIAL)"
                  : "ONLINE (MERCADO PAGO)"}
            </p>
            <p>
              <span className="font-bold">STATUS:</span>{" "}
              {order.paymentStatus === "PAID" ? "PAGO" : "PENDENTE"}
            </p>
            {order.paymentMethod === "DINHEIRO" && order.changeFor && (
              <p className="font-bold mt-1">
                TROCO PARA: {formatCurrency(order.changeFor)}
              </p>
            )}
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center mt-6 space-y-2">
            <QRCodeSVG
              value={`https://eeyfood.com.br/pedido/${order.id}`}
              size={128}
            />
            <p className="text-[8px] text-center">
              Acompanhe seu pedido escaneando o QR Code acima.
            </p>
          </div>
        </>
      )}

      {/* Rodapé */}
      <div className="mt-8 text-center text-[10px]">
        <p>Obrigado pela preferência!</p>
        <p>www.eeyfood.com.br</p>
      </div>

      {/* Espaçamento para o corte da impressora */}
      <div className="h-20" />
    </div>
  );
});

ThermalPrintLayout.displayName = "ThermalPrintLayout";
