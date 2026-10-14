"use server";

import {
  buscarRestaurantePorSlug,
  buscarConfiguracoesFiscaisPorSlug,
  salvarConfiguracoesFiscais,
  atualizarStatusFiscalPedido,
  incrementarNumeroFiscal,
  db,
  eq,
  ordersTable,
  orderProductsTable,
  productsTable,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { getStringValue } from "@/lib/admin-form-utils";
import {
  buildAcbrNfcePayload,
  buildAcbrNfePayload,
  buildAcbrNfsePayload,
  consultarCnpjAcbr,
  emitirDocumentoFiscalAcbr,
  testarConexaoAcbr,
  type ConsultaCnpjResult,
  type FiscalDocumentType,
  type FiscalEnvironment,
} from "@/lib/fiscal-service";
import { assertRestaurantAccess } from "@/lib/auth/session";

const getRestaurantOrThrow = async (slug: string) => {
  await assertRestaurantAccess(slug);
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");
  return restaurant;
};

export const salvarConfiguracoesFiscaisAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const data = {
    cnpj: getStringValue(formData.get("cnpj")) || null,
    inscricaoEstadual: getStringValue(formData.get("inscricaoEstadual")) || null,
    inscricaoMunicipal: getStringValue(formData.get("inscricaoMunicipal")) || null,
    codigoMunicipio: getStringValue(formData.get("codigoMunicipio")) || null,
    ambienteFiscal: getStringValue(formData.get("ambienteFiscal")) || "homologacao",
    // ACBr API Credenciais
    acbrClientId: getStringValue(formData.get("acbrClientId")) || null,
    acbrClientSecret: getStringValue(formData.get("acbrClientSecret")) || null,
    tipoDocumentoPadrao: getStringValue(formData.get("tipoDocumentoPadrao")) || "NFCE",
    // Parâmetros NFC-e / SEFAZ
    cscId: getStringValue(formData.get("cscId")) || null,
    cscCodigo: getStringValue(formData.get("cscCodigo")) || null,
    serieNfce: getStringValue(formData.get("serieNfce")) || "001",
    serieNfe: getStringValue(formData.get("serieNfe")) || "001",
    regimeTributario: getStringValue(formData.get("regimeTributario")) || "SIMPLES_NACIONAL",
    provedorNfse: getStringValue(formData.get("provedorNfse")) || "padrao",
    webhookUrl: getStringValue(formData.get("webhookUrl")) || null,
  };

  await salvarConfiguracoesFiscais(restaurant.id, data);
  revalidatePath(`/${slug}/financeiro/configuracoes-fiscais`);
  return { success: true };
};

export const testarConexaoAcbrAction = async (
  slug: string,
  formData?: FormData,
): Promise<{ success: boolean; message: string; tempoRespostaMs?: number }> => {
  await assertRestaurantAccess(slug);
  const fiscalSettings = await buscarConfiguracoesFiscaisPorSlug(slug);

  const clientId = formData
    ? getStringValue(formData.get("acbrClientId")) || fiscalSettings?.acbrClientId
    : fiscalSettings?.acbrClientId;

  const clientSecret = formData
    ? getStringValue(formData.get("acbrClientSecret")) || fiscalSettings?.acbrClientSecret
    : fiscalSettings?.acbrClientSecret;

  const ambiente = ((formData
    ? getStringValue(formData.get("ambienteFiscal"))
    : fiscalSettings?.ambienteFiscal) || "homologacao") as FiscalEnvironment;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      message: "Preencha o Client ID e Client Secret da ACBr API antes de testar a conexão.",
    };
  }

  const result = await testarConexaoAcbr(
    { clientId, clientSecret },
    ambiente,
    "SP",
  );

  return {
    success: result.success,
    message: result.mensagem ?? "Conexão com a ACBr API testada com sucesso!",
    tempoRespostaMs: result.tempoRespostaMs,
  };
};

export const consultarCnpjAcbrAction = async (
  slug: string,
  cnpj: string,
): Promise<ConsultaCnpjResult> => {
  await assertRestaurantAccess(slug);
  const fiscalSettings = await buscarConfiguracoesFiscaisPorSlug(slug);

  if (!fiscalSettings?.acbrClientId || !fiscalSettings?.acbrClientSecret) {
    return {
      success: false,
      errorMessage: "Configure as credenciais da ACBr API para consultar o CNPJ.",
    };
  }

  return consultarCnpjAcbr(
    cnpj,
    {
      clientId: fiscalSettings.acbrClientId,
      clientSecret: fiscalSettings.acbrClientSecret,
    },
    (fiscalSettings.ambienteFiscal as FiscalEnvironment) || "homologacao",
  );
};

export const emitirDocumentoFiscalPedidoAction = async (
  slug: string,
  orderId: number,
  customerCpf?: string,
  tipoForcado?: FiscalDocumentType,
): Promise<{
  success: boolean;
  message: string;
  accessKey?: string;
  danfeUrl?: string;
  documentId?: string;
}> => {
  const restaurant = await getRestaurantOrThrow(slug);
  const fiscalSettings = await buscarConfiguracoesFiscaisPorSlug(slug);

  const hasAcbr = !!(fiscalSettings?.acbrClientId && fiscalSettings?.acbrClientSecret);
  const hasLegacyToken = !!fiscalSettings?.focusNfeToken;

  if (!hasAcbr && !hasLegacyToken) {
    return {
      success: false,
      message: "Configure as credenciais da ACBr API (Client ID e Secret) em Configurações Fiscais antes de emitir notas.",
    };
  }

  const cnpj = fiscalSettings?.cnpj ?? restaurant.cnpj;
  if (!cnpj) {
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

  const tipoDocumento =
    tipoForcado ??
    ((fiscalSettings?.tipoDocumentoPadrao as FiscalDocumentType) || "NFCE");

  const buildOptions = {
    numero:
      tipoDocumento === "NFE"
        ? fiscalSettings?.proximoNumeroNfe ?? 1
        : fiscalSettings?.proximoNumeroNfce ?? 1,
    serie:
      tipoDocumento === "NFE"
        ? fiscalSettings?.serieNfe ?? "001"
        : fiscalSettings?.serieNfce ?? "001",
    cnpj,
    nomeEmitente: restaurant.name,
    inscricaoEstadual: fiscalSettings?.inscricaoEstadual ?? undefined,
    inscricaoMunicipal: fiscalSettings?.inscricaoMunicipal ?? undefined,
    codigoMunicipio: fiscalSettings?.codigoMunicipio ?? undefined,
    cpfDestinatario: customerCpf?.replace(/\D/g, "") || order.customerCpf?.replace(/\D/g, "") || undefined,
    nomeDestinatario: order.customerName ?? undefined,
    paymentMethod: order.paymentMethod,
    total: order.total,
    tipoDocumento,
    items: orderItems.map((i) => ({
      name: i.orderProduct.productNameSnapshot,
      quantity: i.orderProduct.quantity,
      unitPrice: i.orderProduct.price,
      ncm: i.product.ncm ?? undefined,
      cfop: i.product.cfop ?? undefined,
      csosn: i.product.csosn ?? undefined,
    })),
  };

  let payload: Record<string, unknown>;
  if (tipoDocumento === "NFE") {
    payload = buildAcbrNfePayload(buildOptions);
  } else if (tipoDocumento === "NFSE") {
    payload = buildAcbrNfsePayload(buildOptions);
  } else {
    payload = buildAcbrNfcePayload(buildOptions);
  }

  const credentials = {
    clientId: fiscalSettings?.acbrClientId,
    clientSecret: fiscalSettings?.acbrClientSecret,
    cachedToken: fiscalSettings?.acbrToken ?? fiscalSettings?.focusNfeToken ?? undefined,
  };

  const result = await emitirDocumentoFiscalAcbr(payload, credentials, {
    tipo: tipoDocumento,
    ambiente: (fiscalSettings?.ambienteFiscal as FiscalEnvironment) || "homologacao",
  });

  if (result.success) {
    await atualizarStatusFiscalPedido(orderId, {
      nfeStatus: "ISSUED",
      nfeAccessKey: result.accessKey,
      nfeDanfeUrl: result.danfeUrl,
      nfeDocumentoId: result.documentId,
      nfeRejectionReason: null,
    });

    if (tipoDocumento === "NFE") {
      await incrementarNumeroFiscal(restaurant.id, "NFE");
    } else {
      await incrementarNumeroFiscal(restaurant.id, "NFCE");
    }

    if (customerCpf) {
      await db
        .update(ordersTable)
        .set({ customerCpf, updatedAt: new Date() })
        .where(eq(ordersTable.id, orderId));
    }

    revalidatePath(`/${slug}/pedidos`);
    revalidatePath(`/${slug}/financeiro`);

    return {
      success: true,
      message: `${tipoDocumento} emitida com sucesso via ACBr API!`,
      accessKey: result.accessKey,
      danfeUrl: result.danfeUrl,
      documentId: result.documentId,
    };
  }

  await atualizarStatusFiscalPedido(orderId, {
    nfeStatus: "REJECTED",
    nfeRejectionReason: result.errorMessage,
    nfeDocumentoId: result.documentId,
  });

  return {
    success: false,
    message: result.errorMessage ?? "Erro ao emitir documento fiscal via ACBr API.",
    documentId: result.documentId,
    danfeUrl: result.danfeUrl,
  };
};

/**
 * Retrocompatibilidade: exporta emitirNfcePedidoAction chamando o novo pipeline ACBr
 */
export const emitirNfcePedidoAction = emitirDocumentoFiscalPedidoAction;
