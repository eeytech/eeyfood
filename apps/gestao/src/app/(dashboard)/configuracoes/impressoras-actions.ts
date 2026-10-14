"use server";

import {
  alternarStatusImpressora,
  atualizarImpressora,
  buscarImpressorasAtivasPorSlug,
  buscarImpressorasPorSlug,
  buscarPedidoRecebimentoPorId,
  buscarRestaurantePorSlug,
  criarImpressora,
  excluirImpressora,
  type NewRestaurantPrinter,
  type PrinterConnectionType,
  type PrinterRole,
  type RestaurantPrinter,
} from "@fsw/db";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { buildOrderReceiptBytes } from "@/lib/printer/format-order-ticket";
import { sendRawToNetworkPrinter, testNetworkPrinterConnection } from "@/lib/printer/network-sender";

export interface SalvarImpressoraInput {
  id?: string;
  name: string;
  role: PrinterRole;
  connectionType: PrinterConnectionType;
  ipAddress?: string | null;
  port?: number;
  spoolerName?: string | null;
  paperWidth?: number;
  cutPaper?: boolean;
  openDrawer?: boolean;
  copies?: number;
  isActive?: boolean;
  autoPrintOnNewOrder?: boolean;
  printPrices?: boolean;
  printCustomerDetails?: boolean;
  printObservations?: boolean;
}

export async function buscarImpressorasAction(slug: string) {
  try {
    const printers = await buscarImpressorasPorSlug(slug);
    return { success: true, printers };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao buscar impressoras", printers: [] };
  }
}

export async function salvarImpressoraAction(
  slug: string,
  data: SalvarImpressoraInput,
): Promise<{ success: boolean; message: string; printer?: RestaurantPrinter }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, message: "Não autorizado." };
    }

    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) {
      return { success: false, message: "Restaurante não encontrado." };
    }

    if (!data.name || !data.name.trim()) {
      return { success: false, message: "O nome da impressora é obrigatório." };
    }

    if (data.connectionType === "NETWORK_TCP" && (!data.ipAddress || !data.ipAddress.trim())) {
      return {
        success: false,
        message: "O endereço IP é obrigatório para impressoras com conexão de rede (TCP/IP).",
      };
    }

    if (data.connectionType === "WINDOWS_SPOOLER" && (!data.spoolerName || !data.spoolerName.trim())) {
      return {
        success: false,
        message: "O nome da impressora no Windows é obrigatório para conexão via Spooler/USB.",
      };
    }

    const payload: Omit<NewRestaurantPrinter, "id" | "createdAt" | "updatedAt"> = {
      restaurantId: restaurant.id,
      name: data.name.trim(),
      role: data.role || "KITCHEN",
      connectionType: data.connectionType || "NETWORK_TCP",
      ipAddress: data.ipAddress ? data.ipAddress.trim() : null,
      port: data.port ? Number(data.port) : 9100,
      spoolerName: data.spoolerName ? data.spoolerName.trim() : null,
      paperWidth: data.paperWidth ? Number(data.paperWidth) : 80,
      cutPaper: data.cutPaper ?? true,
      openDrawer: data.openDrawer ?? false,
      copies: data.copies ? Number(data.copies) : 1,
      isActive: data.isActive ?? true,
      autoPrintOnNewOrder: data.autoPrintOnNewOrder ?? true,
      printPrices: data.printPrices ?? (data.role === "CASHIER" || data.role === "BOTH"),
      printCustomerDetails: data.printCustomerDetails ?? true,
      printObservations: data.printObservations ?? true,
    };

    let resultPrinter: RestaurantPrinter;

    if (data.id) {
      resultPrinter = await atualizarImpressora(data.id, restaurant.id, payload);
    } else {
      resultPrinter = await criarImpressora(payload);
    }

    revalidatePath(`/${slug}/configuracoes`);
    return {
      success: true,
      message: data.id ? "Impressora atualizada com sucesso!" : "Impressora cadastrada com sucesso!",
      printer: resultPrinter,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Erro ao salvar impressora." };
  }
}

export async function alternarStatusImpressoraAction(
  slug: string,
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, message: "Não autorizado." };

    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) return { success: false, message: "Restaurante não encontrado." };

    await alternarStatusImpressora(id, restaurant.id, isActive);
    revalidatePath(`/${slug}/configuracoes`);
    return {
      success: true,
      message: isActive ? "Impressora ativada." : "Impressora desativada.",
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Erro ao alternar status da impressora." };
  }
}

export async function excluirImpressoraAction(
  slug: string,
  id: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, message: "Não autorizado." };

    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) return { success: false, message: "Restaurante não encontrado." };

    const ok = await excluirImpressora(id, restaurant.id);
    if (!ok) return { success: false, message: "Impressora não encontrada." };

    revalidatePath(`/${slug}/configuracoes`);
    return { success: true, message: "Impressora removida com sucesso!" };
  } catch (err: any) {
    return { success: false, message: err?.message || "Erro ao excluir impressora." };
  }
}

export async function testarImpressoraAction(
  slug: string,
  id: string,
): Promise<{ success: boolean; message: string; rawHex?: string }> {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) return { success: false, message: "Restaurante não encontrado." };

    const printers = await buscarImpressorasPorSlug(slug);
    const printer = printers.find((p) => p.id === id);
    if (!printer) return { success: false, message: "Impressora não encontrada." };

    if (printer.connectionType === "NETWORK_TCP" && printer.ipAddress) {
      // Dispara diretamente teste via socket de rede
      const result = await testNetworkPrinterConnection(
        printer.ipAddress,
        printer.port,
        printer.name,
      );
      return result;
    }

    return {
      success: true,
      message: `Impressora configurada como ${printer.connectionType}. Teste será enviado via Agente Local.`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Erro ao testar impressora." };
  }
}

export interface PreparedPrintJob {
  printerId: string;
  printerName: string;
  role: PrinterRole;
  connectionType: PrinterConnectionType;
  ipAddress?: string | null;
  port: number;
  spoolerName?: string | null;
  rawHex: string;
  copies: number;
}

/**
 * Prepares raw ESC/POS printing jobs for a given order, routing correctly
 * to each configured active printer (e.g. Kitchen Network vs Cashier USB).
 */
export async function prepararImpressaoPedidoAction(
  slug: string,
  orderId: number,
  targetRole?: "KITCHEN" | "CASHIER" | "ALL",
): Promise<{
  success: boolean;
  message?: string;
  order?: any;
  jobs: PreparedPrintJob[];
}> {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) return { success: false, message: "Restaurante não encontrado.", jobs: [] };

    const order = await buscarPedidoRecebimentoPorId(orderId);
    if (!order) return { success: false, message: "Pedido não encontrado.", jobs: [] };

    const allPrinters = await buscarImpressorasAtivasPorSlug(slug);

    // Filtrar por papel (KITCHEN, CASHIER, ou ALL)
    const filteredPrinters = allPrinters.filter((p) => {
      if (!targetRole || targetRole === "ALL") return true;
      if (targetRole === "KITCHEN") return p.role === "KITCHEN" || p.role === "BOTH";
      if (targetRole === "CASHIER") return p.role === "CASHIER" || p.role === "BOTH";
      return true;
    });

    const jobs: PreparedPrintJob[] = [];

    for (const printer of filteredPrinters) {
      const bytes = buildOrderReceiptBytes(order as any, printer);
      jobs.push({
        printerId: printer.id,
        printerName: printer.name,
        role: printer.role,
        connectionType: printer.connectionType,
        ipAddress: printer.ipAddress,
        port: printer.port,
        spoolerName: printer.spoolerName,
        rawHex: bytes.toString("hex"),
        copies: printer.copies || 1,
      });

      // Se a impressora for de rede e o servidor estiver na mesma LAN, podemos tentar envio direto
      if (printer.connectionType === "NETWORK_TCP" && printer.ipAddress) {
        // Tenta envio assíncrono em segundo plano (não bloqueia resposta caso dê timeout)
        sendRawToNetworkPrinter(printer.ipAddress, printer.port, bytes).catch(() => {});
      }
    }

    return {
      success: true,
      order,
      jobs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Erro ao preparar impressão do pedido.",
      jobs: [],
    };
  }
}
