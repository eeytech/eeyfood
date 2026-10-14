import type { PedidoRecebimento, RestaurantPrinter } from "@fsw/db";

import { EscPosBuilder } from "./escpos-builder";

const formatCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
};

const formatDateTime = (date: Date | string): string => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const getConsumptionMethodLabel = (method: string): string => {
  if (method === "DELIVERY") return "DELIVERY / ENTREGA";
  if (method === "DINE_IN") return "MESA / SALAO";
  return "RETIRADA / BALCAO";
};

/**
 * Builds ESC/POS receipt bytes specifically tailored for a given printer configuration.
 */
export function buildOrderReceiptBytes(
  order: PedidoRecebimento,
  printer: Partial<RestaurantPrinter> = {},
): Buffer {
  const paperWidth = (printer.paperWidth === 58 ? 58 : 80) as 80 | 58;
  const isKitchen = printer.role === "KITCHEN";
  const cutPaper = printer.cutPaper ?? true;
  const openDrawer = printer.openDrawer ?? false;
  const printPrices = printer.printPrices ?? !isKitchen;
  const printCustomer = printer.printCustomerDetails ?? true;
  const printObs = printer.printObservations ?? true;

  const builder = new EscPosBuilder({
    paperWidth,
    cutPaper,
    openDrawer: isKitchen ? false : openDrawer,
  });

  // ─────────────────────────────────────────────────────────────
  // CABEÇALHO
  // ─────────────────────────────────────────────────────────────
  builder.align("CENTER");
  builder.bold(true);
  builder.size("NORMAL");
  builder.line(order.restaurant.name.toUpperCase());

  if (!isKitchen) {
    const restaurantAny = order.restaurant as any;
    if (restaurantAny.cnpj) {
      builder.bold(false);
      builder.line(`CNPJ: ${restaurantAny.cnpj}`);
    }
    if (restaurantAny.phone) {
      builder.line(`TEL: ${restaurantAny.phone}`);
    }
  }

  builder.divider("=");

  // Título da Via
  builder.align("CENTER");
  builder.bold(true);
  if (isKitchen) {
    builder.size("LARGE");
    builder.line("*** VIA DA COZINHA ***");
  } else {
    builder.size("NORMAL");
    builder.line("CUPOM DE CONFERENCIA / BALCAO");
  }

  // Número do Pedido em Destaque
  builder.size("HUGE");
  builder.line(`#${order.id}`);

  // Canal / Marketplace se houver
  if (order.marketplaceType) {
    builder.size("NORMAL");
    builder.bold(true);
    builder.line(`CANAL: ${order.marketplaceType} ${order.marketplaceOrderId ? `(#${order.marketplaceOrderId})` : ""}`);
  }

  // Método de Consumo e Data
  builder.size("NORMAL");
  builder.bold(true);
  builder.line(`TIPO: ${getConsumptionMethodLabel(order.consumptionMethod)}`);
  builder.bold(false);
  builder.line(`DATA: ${formatDateTime(order.createdAt)}`);

  // ─────────────────────────────────────────────────────────────
  // DADOS DO CLIENTE & ENTREGA
  // ─────────────────────────────────────────────────────────────
  if (printCustomer && (order.customerName || order.customerPhone || order.deliveryAddress)) {
    builder.divider("-");
    builder.align("LEFT");
    if (order.customerName) {
      builder.bold(true);
      builder.line(`CLIENTE: ${order.customerName.toUpperCase()}`);
    }
    if (order.customerPhone) {
      builder.bold(false);
      builder.line(`TEL: ${order.customerPhone}`);
    }
    if (order.consumptionMethod === "DELIVERY" && order.deliveryAddress) {
      builder.bold(true);
      builder.line(`ENDERECO DE ENTREGA:`);
      builder.bold(false);
      builder.line(order.deliveryAddress);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // OBSERVAÇÃO GERAL DO PEDIDO
  // ─────────────────────────────────────────────────────────────
  if (printObs && order.notes) {
    builder.divider("=");
    builder.align("LEFT");
    builder.bold(true);
    builder.line("!! ATENCAO - OBSERVACOES DO PEDIDO !!");
    builder.bold(false);
    builder.line(order.notes);
    builder.divider("=");
  } else {
    builder.divider("-");
  }

  // ─────────────────────────────────────────────────────────────
  // ITENS DO PEDIDO
  // ─────────────────────────────────────────────────────────────
  builder.align("LEFT");
  builder.bold(true);
  if (printPrices) {
    builder.row("QTD ITEM", "TOTAL");
  } else {
    builder.line("QTD  DESCRICAO DO ITEM");
  }
  builder.divider("-");

  for (const item of order.orderProducts) {
    const itemName = (item.productNameSnapshot || item.product.name).toUpperCase();
    const itemQty = `${item.quantity}x`;

    builder.bold(true);
    if (printPrices) {
      const itemTotalFormatted = formatCurrency(Number(item.price) * item.quantity);
      builder.row(`${itemQty} ${itemName}`, itemTotalFormatted);
    } else {
      // Na cozinha: Destaque bem nítido para quantidade e nome
      builder.size("DOUBLE_HEIGHT");
      builder.line(`${itemQty} ${itemName}`);
      builder.size("NORMAL");
    }

    // Opcionais / Adicionais
    if (item.orderProductOptions && item.orderProductOptions.length > 0) {
      builder.bold(false);
      for (const opt of item.orderProductOptions) {
        const optLine = `  + ${opt.nameSnapshot}`;
        const optPrice = Number(opt.priceSnapshot ?? (opt as any).price ?? 0);
        if (printPrices && optPrice > 0) {
          builder.row(optLine, formatCurrency(optPrice));
        } else {
          builder.line(optLine);
        }
      }
    }

    // Observação específica do item
    if (item.notes) {
      builder.bold(true);
      builder.line(`  >> OBS: ${item.notes}`);
      builder.bold(false);
    }

    builder.line(); // Espaço entre itens
  }

  // ─────────────────────────────────────────────────────────────
  // TOTAIS E PAGAMENTO (SOMENTE SE PRINT_PRICES ATIVO)
  // ─────────────────────────────────────────────────────────────
  if (printPrices) {
    builder.divider("-");
    builder.align("LEFT");
    builder.bold(false);

    builder.row("SUBTOTAL", formatCurrency(order.subtotal));

    if (order.deliveryFee && Number(order.deliveryFee) > 0) {
      builder.row("TAXA DE ENTREGA", formatCurrency(order.deliveryFee));
    }

    if (order.discountAmount && Number(order.discountAmount) > 0) {
      builder.row("DESCONTO", `-${formatCurrency(order.discountAmount)}`);
    }

    builder.divider("-");
    builder.bold(true);
    builder.size("DOUBLE_HEIGHT");
    builder.row("TOTAL", formatCurrency(order.total));
    builder.size("NORMAL");

    // Forma de Pagamento
    builder.divider("-");
    builder.bold(false);
    builder.row("FORMA PAGTO:", order.paymentMethod || "NAO INFORMADO");
    builder.row("STATUS PAGTO:", order.paymentStatus === "PAID" ? "PAGO" : "PENDENTE");

    if (order.paymentMethod === "DINHEIRO" && order.changeFor) {
      builder.bold(true);
      builder.row("TROCO PARA:", formatCurrency(order.changeFor));
      const trocoCalculado = Math.max(0, Number(order.changeFor) - Number(order.total));
      builder.row("VALOR DO TROCO:", formatCurrency(trocoCalculado));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RODAPÉ
  // ─────────────────────────────────────────────────────────────
  builder.divider("=");
  builder.align("CENTER");
  builder.bold(false);
  builder.size("NORMAL");

  if (isKitchen) {
    builder.bold(true);
    builder.line("--- FIM DO PEDIDO (COZINHA) ---");
  } else {
    builder.line("Obrigado pela preferencia!");
    builder.line("EeyFood Sistemas");
  }

  return builder.build();
}
