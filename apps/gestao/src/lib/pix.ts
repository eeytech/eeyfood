/**
 * Utilitário de Geração de Pix Dinâmico e Estático no padrão BR Code (Banco Central do Brasil / EMV)
 */

interface GerarPixPayloadOptions {
  chavePix: string;
  nomeRecebedor: string;
  cidadeRecebedor?: string;
  valor?: number;
  identificador?: string; // txid (até 25 caracteres)
  descricao?: string;
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function normalizeText(text: string, maxLength: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, "") // Remove caracteres especiais
    .trim()
    .slice(0, maxLength);
}

function calcularCrc16Ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function gerarPayloadPix({
  chavePix,
  nomeRecebedor,
  cidadeRecebedor = "SAO PAULO",
  valor,
  identificador = "***",
  descricao,
}: GerarPixPayloadOptions): string {
  // Limpar chave pix
  const chaveLimpa = chavePix.trim();
  const nomeNorm = normalizeText(nomeRecebedor || "RESTAURANTE", 25) || "RESTAURANTE";
  const cidadeNorm = normalizeText(cidadeRecebedor || "CIDADE", 15) || "CIDADE";
  const txidNorm = (identificador ? normalizeText(identificador, 25) : "") || "***";

  // Sub-campos Merchant Account Information (26)
  const gui = formatEmvField("00", "br.gov.bcb.pix");
  const key = formatEmvField("01", chaveLimpa);
  const infoAdicional = descricao
    ? formatEmvField("02", normalizeText(descricao, 40))
    : "";
  const merchantAccountInfo = formatEmvField("26", `${gui}${key}${infoAdicional}`);

  // Sub-campos Additional Data Field (62)
  const txidField = formatEmvField("05", txidNorm);
  const additionalDataField = formatEmvField("62", txidField);

  // Montagem preliminar do payload
  let payload = "";
  payload += formatEmvField("00", "01"); // Payload Format Indicator
  payload += merchantAccountInfo;
  payload += formatEmvField("52", "0000"); // Merchant Category Code
  payload += formatEmvField("53", "986"); // Transaction Currency (986 = BRL)

  if (valor !== undefined && valor > 0) {
    payload += formatEmvField("54", valor.toFixed(2)); // Transaction Amount
  }

  payload += formatEmvField("58", "BR"); // Country Code
  payload += formatEmvField("59", nomeNorm); // Merchant Name
  payload += formatEmvField("60", cidadeNorm); // Merchant City
  payload += additionalDataField;

  // Adiciona chave de CRC
  payload += "6304";
  const checksum = calcularCrc16Ccitt(payload);

  return `${payload}${checksum}`;
}
