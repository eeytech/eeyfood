export interface NfcePayload {
  natureza_operacao: string;
  forma_pagamento: number;
  numero: number;
  serie: string;
  data_emissao: string;
  cnpj_emitente: string;
  nome_emitente?: string;
  cpf_destinatario?: string;
  nome_destinatario?: string;
  itens: Array<{
    numero_item: number;
    codigo_produto: string;
    descricao: string;
    cfop: string;
    unidade_comercial: string;
    quantidade_comercial: number;
    valor_unitario_comercial: number;
    valor_total_bruto: number;
    ncm: string;
    csosn?: string;
    cst?: string;
    icms_modalidade: number;
    pis_modalidade?: number;
    cofins_modalidade?: number;
  }>;
  valor_total_nota: number;
  forma_de_pagamento: Array<{
    forma_pagamento: string;
    valor_pagamento: number;
  }>;
}

export interface NfceEmissaoResult {
  success: boolean;
  accessKey?: string;
  danfeUrl?: string;
  protocol?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

const FOCUSNFE_BASE_URL = "https://homologacao.focusnfe.com.br/v2";

export async function emitirNfce(
  payload: NfcePayload,
  apiToken: string,
  ambiente: "homologacao" | "producao" = "homologacao",
): Promise<NfceEmissaoResult> {
  const baseUrl =
    ambiente === "producao"
      ? "https://api.focusnfe.com.br/v2"
      : FOCUSNFE_BASE_URL;

  const referencia = `NFC${payload.numero.toString().padStart(9, "0")}`;

  try {
    const response = await fetch(`${baseUrl}/nfce?ref=${referencia}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${apiToken}:`).toString("base64")}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      status?: string;
      chave_nfe?: string;
      danfe_url?: string;
      protocolo?: string;
      mensagem_sefaz?: string;
      erros?: Array<{ mensagem: string }>;
    };

    if (response.ok && (data.status === "autorizado" || data.chave_nfe)) {
      return {
        success: true,
        accessKey: data.chave_nfe,
        danfeUrl: data.danfe_url,
        protocol: data.protocolo,
      };
    }

    const errorMsg =
      data.mensagem_sefaz ??
      data.erros?.[0]?.mensagem ??
      `Erro HTTP ${response.status}`;

    return { success: false, errorMessage: errorMsg, rawResponse: data };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : "Erro de conexão com a API fiscal.",
    };
  }
}

export function buildNfcePayload(options: {
  numero: number;
  serie: string;
  cnpj: string;
  nomeEmitente?: string;
  cpfDestinatario?: string;
  nomeDestinatario?: string;
  paymentMethod: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    ncm?: string;
    cfop?: string;
    csosn?: string;
  }>;
}): NfcePayload {
  const FORMA_PAG_MAP: Record<string, string> = {
    DINHEIRO: "01",
    PIX: "17",
    CARTAO_PRESENCIAL: "03",
    VALE_ALIMENTACAO: "10",
    VALE_REFEICAO: "11",
    MERCADO_PAGO: "17",
    FIADO: "99",
  };

  return {
    natureza_operacao: "Venda ao consumidor",
    forma_pagamento: 0,
    numero: options.numero,
    serie: options.serie,
    data_emissao: new Date().toISOString(),
    cnpj_emitente: options.cnpj.replace(/\D/g, ""),
    nome_emitente: options.nomeEmitente,
    cpf_destinatario: options.cpfDestinatario?.replace(/\D/g, ""),
    nome_destinatario: options.nomeDestinatario,
    itens: options.items.map((item, i) => ({
      numero_item: i + 1,
      codigo_produto: `PROD${i + 1}`,
      descricao: item.name,
      cfop: item.cfop ?? "5102",
      unidade_comercial: "UN",
      quantidade_comercial: item.quantity,
      valor_unitario_comercial: item.unitPrice,
      valor_total_bruto: item.quantity * item.unitPrice,
      ncm: item.ncm ?? "21069090",
      csosn: item.csosn ?? "400",
      icms_modalidade: 102,
      pis_modalidade: 7,
      cofins_modalidade: 7,
    })),
    valor_total_nota: options.total,
    forma_de_pagamento: [
      {
        forma_pagamento: FORMA_PAG_MAP[options.paymentMethod] ?? "01",
        valor_pagamento: options.total,
      },
    ],
  };
}
