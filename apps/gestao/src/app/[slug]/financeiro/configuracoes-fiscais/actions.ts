"use server";

import {
  buscarRestaurantePorSlug,
  buscarConfiguracoesFiscaisPorSlug,
  salvarConfiguracoesFiscais,
  atualizarStatusFiscalPedido,
  db,
  eq,
  ordersTable,
  orderProductsTable,
  productsTable,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { getStringValue } from "@/lib/admin-form-utils";
import { buildNfcePayload, emitirNfce } from "@/lib/fiscal-service";

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");
  return restaurant;
};

export const salvarConfiguracoesFiscaisAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const data = {
    cnpj: getStringValue(formData.get("cnpj")) || null,
    inscricaoEstadual: getStringValue(formData.get("inscricaoEstadual")) || null,
    ambienteFiscal: getStringValue(formData.get("ambienteFiscal")) || "homologacao",
    focusNfeToken: getStringValue(formData.get("focusNfeToken")) || null,
    serieNfce: getStringValue(formData.get("serieNfce")) || "001",
    webhookUrl: getStringValue(formData.get("webhookUrl")) || null,
  };

  await salvarConfiguracoesFiscais(restaurant.id, data);
  revalidatePath(`/${slug}/financeiro/configuracoes-fiscais`);
};

export const emitirNfcePedidoAction = async (
  slug: string,
  orderId: number,
  customerCpf?: string,
): Promise<{ success: boolean; message: string; accessKey?: string; danfeUrl?: string }> => {
  const restaurant = await getRestaurantOrThrow(slug);
  const fiscalSettings = await buscarConfiguracoesFiscaisPorSlug(slug);

  if (!fiscalSettings?.focusNfeToken) {
    return { success: false, message: "Configure o token FocusNFe antes de emitir notas." };
  }
  if (!fiscalSettings.cnpj && !restaurant.cnpj) {
    return { success: false, message: "CNPJ do restaurante não configurado." };
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) return { success: false, message: "Pedido não encontrado." };

  const orderItems = await db
    .select({
      orderProduct: orderProductsTable,
      product: productsTable,
    })
    .from(orderProductsTable)
    .innerJoin(productsTable, eq(productsTable.id, orderProductsTable.productId))
    .where(eq(orderProductsTable.orderId, orderId));

  await atualizarStatusFiscalPedido(orderId, { nfeStatus: "PENDING" });

  const payload = buildNfcePayload({
    numero: fiscalSettings.proximoNumeroNfce,
    serie: fiscalSettings.serieNfce,
    cnpj: (fiscalSettings.cnpj ?? restaurant.cnpj)!,
    nomeEmitente: restaurant.name,
    cpfDestinatario: customerCpf?.replace(/\D/g, ""),
    paymentMethod: order.paymentMethod,
    total: order.total,
    items: orderItems.map((i) => ({
      name: i.orderProduct.productNameSnapshot,
      quantity: i.orderProduct.quantity,
      unitPrice: i.orderProduct.price,
      ncm: i.product.ncm ?? undefined,
      cfop: i.product.cfop ?? undefined,
      csosn: i.product.csosn ?? undefined,
    })),
  });

  const result = await emitirNfce(
    payload,
    fiscalSettings.focusNfeToken,
    fiscalSettings.ambienteFiscal as "homologacao" | "producao",
  );

  if (result.success) {
    await atualizarStatusFiscalPedido(orderId, {
      nfeStatus: "ISSUED",
      nfeAccessKey: result.accessKey,
      nfeDanfeUrl: result.danfeUrl,
      nfeRejectionReason: null,
    });
    await db
      .update(ordersTable)
      .set({ customerCpf: customerCpf ?? null, updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId));

    revalidatePath(`/${slug}/pedidos`);
    return {
      success: true,
      message: "NFC-e emitida com sucesso!",
      accessKey: result.accessKey,
      danfeUrl: result.danfeUrl,
    };
  }

  await atualizarStatusFiscalPedido(orderId, {
    nfeStatus: "REJECTED",
    nfeRejectionReason: result.errorMessage,
  });

  return { success: false, message: result.errorMessage ?? "Erro ao emitir NFC-e." };
};
