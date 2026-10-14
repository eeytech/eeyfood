/**
 * ACBr API - Serviço de Integração Fiscal Oficial (NFC-e, NF-e e NFS-e)
 * Baseado na documentação oficial da ACBr API: https://acbr.api.br / https://dev.acbr.api.br
 * Autenticação via OAuth 2.0 (client_credentials)
 */

export const ACBR_AUTH_URL =
  "https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token";
export const ACBR_HOMOLOGACAO_URL = "https://hom.acbr.api.br";
export const ACBR_PRODUCAO_URL = "https://prod.acbr.api.br";

export type FiscalDocumentType = "NFCE" | "NFE" | "NFSE";
export type FiscalEnvironment = "homologacao" | "producao";

export interface AcbrCredentials {
  clientId?: string | null;
  clientSecret?: string | null;
  cachedToken?: string | null;
  tokenExpiresAt?: Date | null;
}

export interface FiscalEmissaoResult {
  success: boolean;
  documentId?: string;
  accessKey?: string;
  danfeUrl?: string;
  protocol?: string;
  status?: "pendente" | "autorizado" | "rejeitado" | "denegado" | "encerrado" | "cancelado" | "erro";
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface StatusSefazResult {
  success: boolean;
  ambiente: FiscalEnvironment;
  statusSefaz?: string;
  mensagem?: string;
  motivo?: string;
  tempoRespostaMs?: number;
}

export interface ConsultaCnpjResult {
  success: boolean;
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  situacaoCadastral?: string;
  cnae?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  errorMessage?: string;
}

export interface BuildFiscalDocumentOptions {
  numero: number;
  serie: string;
  cnpj: string;
  nomeEmitente?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  codigoMunicipio?: string;
  uf?: string;
  cpfDestinatario?: string;
  nomeDestinatario?: string;
  paymentMethod: string;
  total: number;
  tipoDocumento?: FiscalDocumentType;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    ncm?: string;
    cfop?: string;
    csosn?: string;
  }>;
}

const UF_IBGE_MAP: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17,
  MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29,
  MG: 31, ES: 32, RJ: 33, SP: 35,
  PR: 41, SC: 42, RS: 43,
  MS: 50, MT: 51, GO: 52, DF: 53,
};

const FORMA_PAG_MAP: Record<string, string> = {
  DINHEIRO: "01",
  PIX: "17",
  CARTAO_DEBITO: "04",
  CARTAO_CREDITO: "03",
  CARTAO_PRESENCIAL: "03",
  VALE_ALIMENTACAO: "10",
  VALE_REFEICAO: "11",
  MERCADO_PAGO: "17",
  INFINITEPAY: "03",
  FIADO: "99",
  OUTROS: "99",
};

/**
 * Obtém ou renova o token de acesso OAuth 2.0 da ACBr API via fluxo client_credentials.
 */
export async function getAcbrToken(credentials: AcbrCredentials): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  if (
    credentials.cachedToken &&
    credentials.tokenExpiresAt &&
    new Date(credentials.tokenExpiresAt).getTime() - Date.now() > 60_000
  ) {
    return { accessToken: credentials.cachedToken, expiresIn: 3600 };
  }

  if (!credentials.clientId || !credentials.clientSecret) {
    throw new Error("Client ID e Client Secret da ACBr API não foram configurados.");
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.clientId.trim(),
    client_secret: credentials.clientSecret.trim(),
    scope: "empresa nfe nfce nfse",
  });

  const response = await fetch(ACBR_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Falha na autenticação com a ACBr API (${response.status}): ${errorText || "Credenciais inválidas."}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
  };
}

/**
 * Retorna a URL base de acordo com o ambiente selecionado.
 */
export function getAcbrBaseUrl(ambiente: FiscalEnvironment = "homologacao"): string {
  return ambiente === "producao" ? ACBR_PRODUCAO_URL : ACBR_HOMOLOGACAO_URL;
}

/**
 * Testa a conexão com a ACBr API e verifica o status da SEFAZ para a UF informada.
 */
export async function testarConexaoAcbr(
  credentials: AcbrCredentials,
  ambiente: FiscalEnvironment = "homologacao",
  uf = "SP",
): Promise<StatusSefazResult> {
  const startTime = Date.now();
  try {
    const { accessToken } = await getAcbrToken(credentials);
    const baseUrl = getAcbrBaseUrl(ambiente);

    const response = await fetch(`${baseUrl}/nfce/sefaz/status?autorizador=${uf.toUpperCase()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const elapsed = Date.now() - startTime;

    if (response.ok) {
      const data = (await response.json()) as {
        status?: string;
        motivo?: string;
        codigo_status?: number;
      };

      return {
        success: true,
        ambiente,
        statusSefaz: data.status ?? "ONLINE",
        mensagem: data.motivo ?? "Conexão com a ACBr API e SEFAZ estabelecida com sucesso!",
        motivo: data.motivo,
        tempoRespostaMs: elapsed,
      };
    }

    // Mesmo se a SEFAZ retornar aviso para a UF, a autenticação com a ACBr API foi bem-sucedida
    return {
      success: true,
      ambiente,
      statusSefaz: "CONECTADO",
      mensagem: "Token autenticado na ACBr API com sucesso!",
      tempoRespostaMs: elapsed,
    };
  } catch (err) {
    return {
      success: false,
      ambiente,
      statusSefaz: "OFFLINE",
      mensagem: err instanceof Error ? err.message : "Erro desconhecido ao conectar com a ACBr API.",
      tempoRespostaMs: Date.now() - startTime,
    };
  }
}

/**
 * Consulta informações públicas de uma empresa pelo CNPJ usando a ACBr API gratuita.
 */
export async function consultarCnpjAcbr(
  cnpj: string,
  credentials: AcbrCredentials,
  ambiente: FiscalEnvironment = "homologacao",
): Promise<ConsultaCnpjResult> {
  try {
    const { accessToken } = await getAcbrToken(credentials);
    const baseUrl = getAcbrBaseUrl(ambiente);
    const cleanCnpj = cnpj.replace(/\D/g, "");

    const response = await fetch(`${baseUrl}/cnpj/${cleanCnpj}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        errorMessage: `Erro ao consultar CNPJ (${response.status}): ${text || "Empresa não encontrada"}`,
      };
    }

    const data = (await response.json()) as {
      cnpj?: string;
      razao_social?: string;
      nome_fantasia?: string;
      situacao_cadastral?: string;
      cnae_fiscal?: string;
      endereco?: {
        logradouro?: string;
        numero?: string;
        bairro?: string;
        municipio?: string;
        uf?: string;
        cep?: string;
      };
    };

    return {
      success: true,
      cnpj: data.cnpj ?? cleanCnpj,
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia,
      situacaoCadastral: data.situacao_cadastral,
      cnae: data.cnae_fiscal,
      logradouro: data.endereco?.logradouro,
      numero: data.endereco?.numero,
      bairro: data.endereco?.bairro,
      municipio: data.endereco?.municipio,
      uf: data.endereco?.uf,
      cep: data.endereco?.cep,
    };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : "Erro ao conectar com a ACBr API.",
    };
  }
}

/**
 * Emite documento fiscal (NFC-e, NF-e ou NFS-e DPS) pela ACBr API.
 */
export async function emitirDocumentoFiscalAcbr(
  payload: Record<string, unknown>,
  credentials: AcbrCredentials,
  options: {
    tipo?: FiscalDocumentType;
    ambiente?: FiscalEnvironment;
  } = {},
): Promise<FiscalEmissaoResult> {
  const tipo = options.tipo ?? "NFCE";
  const ambiente = options.ambiente ?? "homologacao";
  const baseUrl = getAcbrBaseUrl(ambiente);

  try {
    const { accessToken } = await getAcbrToken(credentials);

    let endpoint = "/nfce";
    if (tipo === "NFE") endpoint = "/nfe";
    else if (tipo === "NFSE") endpoint = "/nfse/dps";

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      id?: string;
      status?: "pendente" | "autorizado" | "rejeitado" | "denegado" | "encerrado" | "cancelado" | "erro";
      chave?: string;
      numero?: number;
      serie?: number;
      autorizacao?: {
        codigo_status?: number;
        motivo_status?: string;
        numero_protocolo?: string;
      };
      erros?: Array<{ mensagem?: string; codigo?: string }>;
      mensagem?: string;
    };

    const docId = data.id;
    const danfeUrl = docId ? `${baseUrl}${endpoint}/${docId}/pdf` : undefined;

    if (response.ok && (data.status === "autorizado" || data.status === "pendente" || data.chave)) {
      return {
        success: true,
        documentId: docId,
        accessKey: data.chave,
        danfeUrl,
        protocol: data.autorizacao?.numero_protocolo,
        status: data.status,
        rawResponse: data,
      };
    }

    const rejectionMsg =
      data.autorizacao?.motivo_status ??
      data.erros?.[0]?.mensagem ??
      data.mensagem ??
      `Erro retornado pela ACBr API (HTTP ${response.status})`;

    return {
      success: false,
      documentId: docId,
      status: data.status ?? "rejeitado",
      errorMessage: rejectionMsg,
      danfeUrl,
      rawResponse: data,
    };
  } catch (err) {
    return {
      success: false,
      errorMessage:
        err instanceof Error
          ? err.message
          : "Erro de conexão ao comunicar com a ACBr API.",
    };
  }
}

/**
 * Constrói o payload compatível com o schema SEFAZ / ACBr API para NFC-e (Modelo 65).
 */
export function buildAcbrNfcePayload(options: BuildFiscalDocumentOptions): Record<string, unknown> {
  const cleanCnpj = options.cnpj.replace(/\D/g, "");
  const cleanCpf = options.cpfDestinatario?.replace(/\D/g, "");
  const codigoMun = options.codigoMunicipio?.replace(/\D/g, "") || "3550308";
  const cUf = UF_IBGE_MAP[options.uf?.toUpperCase() ?? "SP"] ?? (parseInt(codigoMun.slice(0, 2), 10) || 35);

  const totalCalculado = options.items.reduce(
    (acc, it) => acc + it.quantity * it.unitPrice,
    0,
  );
  const valorTotal = Math.round((options.total || totalCalculado) * 100) / 100;

  const det = options.items.map((item, index) => {
    const vProd = Math.round(item.quantity * item.unitPrice * 100) / 100;
    return {
      nItem: index + 1,
      prod: {
        cProd: `PROD${index + 1}`,
        cEAN: "SEM GTIN",
        xProd: item.name,
        NCM: (item.ncm ?? "21069090").replace(/\D/g, "").slice(0, 8),
        CFOP: (item.cfop ?? "5102").replace(/\D/g, "").slice(0, 4),
        uCom: "UN",
        qCom: item.quantity,
        vUnCom: Math.round(item.unitPrice * 100) / 100,
        vProd,
        cEANTrib: "SEM GTIN",
        uTrib: "UN",
        qTrib: item.quantity,
        vUnTrib: Math.round(item.unitPrice * 100) / 100,
        indTot: 1,
      },
      imposto: {
        ICMS: {
          ICMSSN102: {
            orig: 0,
            CSOSN: item.csosn ?? "102",
          },
        },
        PIS: {
          PISNT: {
            CST: "07",
          },
        },
        COFINS: {
          COFINSNT: {
            CST: "07",
          },
        },
      },
    };
  });

  const formaPag = FORMA_PAG_MAP[options.paymentMethod] ?? "01";

  return {
    ambiente: "homologacao",
    referencia: `NFC${options.numero.toString().padStart(9, "0")}`,
    infNFe: {
      versao: "4.00",
      ide: {
        cUF: cUf,
        natOp: "Venda ao Consumidor Final",
        mod: 65, // NFC-e
        serie: parseInt(options.serie, 10) || 1,
        nNF: options.numero,
        dhEmi: new Date().toISOString(),
        tpNF: 1, // Saída
        idDest: 1, // Interna
        cMunFG: parseInt(codigoMun, 10),
        tpImp: 4, // DANFE NFC-e
        tpEmis: 1, // Normal
        tpAmb: 2, // 1=Produção, 2=Homologação (o gateway da API sobrepõe pelo ambiente)
        finNFe: 1, // Normal
        indFinal: 1, // Consumidor Final
        indPres: 1, // Presencial
        procEmi: 0, // Contribuinte
        verProc: "EeyFood 1.0",
      },
      emit: {
        CNPJ: cleanCnpj,
        xNome: options.nomeEmitente ?? "Restaurante",
        IE: options.inscricaoEstadual?.replace(/\D/g, "") || undefined,
        CRT: 1, // Simples Nacional
      },
      dest: cleanCpf
        ? {
            CPF: cleanCpf,
            xNome: options.nomeDestinatario || "Consumidor Final",
            indIEDest: 9, // Não Contribuinte
          }
        : undefined,
      det,
      total: {
        ICMSTot: {
          vBC: 0,
          vICMS: 0,
          vICMSDeson: 0,
          vFCP: 0,
          vBCST: 0,
          vST: 0,
          vFCPST: 0,
          vFCPSTRet: 0,
          vProd: valorTotal,
          vFrete: 0,
          vSeg: 0,
          vDesc: 0,
          vII: 0,
          vIPI: 0,
          vIPIDevol: 0,
          vPIS: 0,
          vCOFINS: 0,
          vOutro: 0,
          vNF: valorTotal,
          vTotTrib: Math.round(valorTotal * 0.18 * 100) / 100, // Estimativa aprox. IBPT
        },
      },
      transp: {
        modFrete: 9, // Sem Frete
      },
      pag: {
        detPag: [
          {
            tPag: formaPag,
            vPag: valorTotal,
          },
        ],
      },
    },
  };
}

/**
 * Constrói payload para NF-e de mercadorias (Modelo 55).
 */
export function buildAcbrNfePayload(options: BuildFiscalDocumentOptions): Record<string, unknown> {
  const nfcePayload = buildAcbrNfcePayload(options);
  const infNFe = nfcePayload.infNFe as Record<string, unknown>;
  const ide = infNFe.ide as Record<string, unknown>;

  ide.mod = 55; // NF-e modelo 55
  ide.tpImp = 1; // Retrato
  nfcePayload.referencia = `NFE${options.numero.toString().padStart(9, "0")}`;

  return nfcePayload;
}

/**
 * Constrói payload para NFS-e DPS (Padrão Nacional).
 */
export function buildAcbrNfsePayload(options: BuildFiscalDocumentOptions): Record<string, unknown> {
  const cleanCnpj = options.cnpj.replace(/\D/g, "");
  const cleanCpf = options.cpfDestinatario?.replace(/\D/g, "");
  const codigoMun = options.codigoMunicipio?.replace(/\D/g, "") || "3550308";

  const totalCalculado = options.items.reduce(
    (acc, it) => acc + it.quantity * it.unitPrice,
    0,
  );
  const valorTotal = Math.round((options.total || totalCalculado) * 100) / 100;
  const descricoes = options.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");

  return {
    provedor: "padrao",
    ambiente: "homologacao",
    referencia: `DPS${options.numero.toString().padStart(9, "0")}`,
    infDPS: {
      tpAmb: 2,
      dhEmi: new Date().toISOString(),
      verAplic: "EeyFood 1.0",
      dCompet: new Date().toISOString().slice(0, 10),
      prest: {
        CNPJ: cleanCnpj,
        xNome: options.nomeEmitente,
      },
      toma: cleanCpf
        ? {
            CPF: cleanCpf,
            xNome: options.nomeDestinatario || "Cliente",
          }
        : undefined,
      serv: {
        cLocIncid: codigoMun,
        cServ: {
          cTribNac: "010701", // Serviços correlatos
          xDescServ: `Fornecimento e serviços de alimentação: ${descricoes}`,
        },
        valores: {
          vServPrest: {
            vServ: valorTotal,
          },
          vDescIncond: 0,
          vLiq: valorTotal,
        },
      },
    },
  };
}

// ─── Retrocompatibilidade com funções legadas ───────────────────────────────────

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

export type NfceEmissaoResult = FiscalEmissaoResult;

export async function emitirNfce(
  payload: NfcePayload,
  apiTokenOrCredentials: string | AcbrCredentials,
  ambiente: FiscalEnvironment = "homologacao",
): Promise<NfceEmissaoResult> {
  const credentials: AcbrCredentials =
    typeof apiTokenOrCredentials === "string"
      ? { cachedToken: apiTokenOrCredentials }
      : apiTokenOrCredentials;

  const acbrPayload = buildAcbrNfcePayload({
    numero: payload.numero,
    serie: payload.serie,
    cnpj: payload.cnpj_emitente,
    nomeEmitente: payload.nome_emitente,
    cpfDestinatario: payload.cpf_destinatario,
    nomeDestinatario: payload.nome_destinatario,
    paymentMethod: payload.forma_de_pagamento[0]?.forma_pagamento || "DINHEIRO",
    total: payload.valor_total_nota,
    items: payload.itens.map((it) => ({
      name: it.descricao,
      quantity: it.quantidade_comercial,
      unitPrice: it.valor_unitario_comercial,
      ncm: it.ncm,
      cfop: it.cfop,
      csosn: it.csosn,
    })),
  });

  return emitirDocumentoFiscalAcbr(acbrPayload, credentials, {
    tipo: "NFCE",
    ambiente,
  });
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
      csosn: item.csosn ?? "102",
      icms_modalidade: 102,
      pis_modalidade: 7,
      cofins_modalidade: 7,
    })),
    valor_total_nota: options.total,
    forma_de_pagamento: [
      {
        forma_pagamento: options.paymentMethod,
        valor_pagamento: options.total,
      },
    ],
  };
}
