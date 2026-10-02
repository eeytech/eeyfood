export interface ParsedAddress {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface AddressInput {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

export const formatCep = (v: string): string => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return d.replace(/^(\d{5})(\d{1,3})/, "$1-$2");
};

export const buildFullAddress = (addr: AddressInput): string => {
  const parts: string[] = [];

  const logradouro = addr.logradouro?.trim() ?? "";
  const numero = addr.numero?.trim() ?? "";
  const complemento = addr.complemento?.trim() ?? "";
  const bairro = addr.bairro?.trim() ?? "";
  const cidade = addr.cidade?.trim() ?? "";
  const estado = addr.estado?.trim().toUpperCase() ?? "";
  const cep = addr.cep?.trim() ?? "";

  // 1. Logradouro, Número, Complemento
  const streetParts: string[] = [];
  if (logradouro) streetParts.push(logradouro);
  if (numero) {
    streetParts.push(numero);
  } else if (complemento) {
    streetParts.push("S/N");
  }
  if (complemento) streetParts.push(complemento);

  if (streetParts.length > 0) {
    parts.push(streetParts.join(", "));
  }

  // 2. Bairro
  if (bairro) {
    parts.push(bairro);
  }

  // 3. Cidade - UF
  if (cidade && estado) {
    parts.push(`${cidade} - ${estado}`);
  } else if (cidade) {
    parts.push(cidade);
  } else if (estado) {
    parts.push(estado);
  }

  // 4. CEP
  if (cep) {
    parts.push(`CEP: ${formatCep(cep)}`);
  }

  return parts.join(" - ");
};

export const parseAddress = (raw: string | null | undefined): ParsedAddress => {
  const result: ParsedAddress = {
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  };

  if (!raw) return result;

  let text = raw.trim();

  // 1. Extrair CEP se presente: "CEP: 00000-000", "CEP 00000000", ou apenas "00000-000"
  const cepMatch = text.match(/(?:CEP:?\s*)?(\d{5}-?\d{3})/i);
  if (cepMatch) {
    result.cep = formatCep(cepMatch[1]);
    text = text.replace(/(?:,?\s*[-–—]?\s*)?(?:CEP:?\s*)?\d{5}-?\d{3}/i, "").trim();
  }

  // Limpar traços e vírgulas residuais nas pontas
  text = text.replace(/^[-–—,\s]+|[-–—,\s]+$/g, "").trim();
  if (!text) return result;

  // 2. Extrair complemento entre parênteses: ex: "Rua das Flores, 123 (Sala 4)"
  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch) {
    result.complemento = parenMatch[1].trim();
    text = text.replace(/\(([^)]+)\)/, "").trim();
    text = text.replace(/\s*,\s*,/g, ",").replace(/\s*-\s*-/g, "-").trim();
  }

  // 3. Separar por traços (" - ", " – ", " — ")
  const dashParts = text.split(/\s+[-–—]\s+/).map((s) => s.trim()).filter(Boolean);

  const parseStreetPart = (streetStr: string) => {
    const commas = streetStr.split(",").map((s) => s.trim()).filter(Boolean);
    if (commas.length >= 3) {
      result.logradouro = commas[0];
      result.numero = commas[1];
      if (!result.complemento) {
        result.complemento = commas.slice(2).join(", ");
      }
    } else if (commas.length === 2) {
      result.logradouro = commas[0];
      result.numero = commas[1];
    } else if (commas.length === 1) {
      const numMatch = commas[0].match(/^(.*?)[,\s]+(\d+[A-Za-z]?|S\/N)$/i);
      if (numMatch) {
        result.logradouro = numMatch[1].trim();
        result.numero = numMatch[2].trim();
      } else {
        result.logradouro = commas[0];
      }
    }
  };

  const cleanUf = (ufStr: string) => ufStr.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  const isUf = (s: string) => /^[A-Za-z]{2}$/.test(s.trim());

  if (dashParts.length >= 5) {
    // Ex: ["Rua das Flores, 123", "Sala 4", "Centro", "São Paulo", "SP"]
    const lastPart = dashParts[dashParts.length - 1];
    if (isUf(lastPart)) {
      result.estado = cleanUf(lastPart);
      result.cidade = dashParts[dashParts.length - 2];
      result.bairro = dashParts[dashParts.length - 3];
      const middleComplementos = dashParts.slice(1, dashParts.length - 3).join(" - ");
      if (middleComplementos) {
        result.complemento = result.complemento
          ? `${result.complemento} - ${middleComplementos}`
          : middleComplementos;
      }
      parseStreetPart(dashParts[0]);
    } else {
      const cityState = lastPart.split(/[,/]/).map((s) => s.trim());
      if (cityState.length >= 2) {
        result.cidade = cityState[0];
        result.estado = cleanUf(cityState[1]);
      } else {
        result.cidade = lastPart;
      }
      result.bairro = dashParts[dashParts.length - 2];
      const middleComplementos = dashParts.slice(1, dashParts.length - 2).join(" - ");
      if (middleComplementos) {
        result.complemento = result.complemento
          ? `${result.complemento} - ${middleComplementos}`
          : middleComplementos;
      }
      parseStreetPart(dashParts[0]);
    }
  } else if (dashParts.length === 4) {
    const lastPart = dashParts[3];
    if (isUf(lastPart)) {
      result.estado = cleanUf(lastPart);
      result.cidade = dashParts[2];
      result.bairro = dashParts[1];
      parseStreetPart(dashParts[0]);
    } else {
      const cityState = lastPart.split(/[,/]/).map((s) => s.trim());
      if (cityState.length >= 2) {
        result.cidade = cityState[0];
        result.estado = cleanUf(cityState[1]);
        result.bairro = dashParts[2];
        if (!result.complemento) result.complemento = dashParts[1];
        parseStreetPart(dashParts[0]);
      } else {
        result.cidade = lastPart;
        result.bairro = dashParts[1];
        parseStreetPart(dashParts[0]);
      }
    }
  } else if (dashParts.length === 3) {
    parseStreetPart(dashParts[0]);
    result.bairro = dashParts[1];

    const cityState = dashParts[2].split(/[,/]/).map((s) => s.trim());
    if (cityState.length >= 2) {
      result.cidade = cityState[0];
      result.estado = cleanUf(cityState[1]);
    } else {
      result.cidade = dashParts[2];
    }
  } else if (dashParts.length === 2) {
    parseStreetPart(dashParts[0]);
    const rest = dashParts[1].split(",").map((s) => s.trim());
    if (rest.length >= 3) {
      result.bairro = rest[0];
      result.cidade = rest[1];
      result.estado = cleanUf(rest[2]);
    } else if (rest.length === 2) {
      result.bairro = rest[0];
      result.cidade = rest[1];
    } else {
      result.bairro = dashParts[1];
    }
  } else {
    const commas = text.split(",").map((s) => s.trim()).filter(Boolean);
    if (commas.length >= 6) {
      result.logradouro = commas[0];
      result.numero = commas[1];
      if (!result.complemento) {
        result.complemento = commas.slice(2, commas.length - 3).join(", ");
      }
      result.bairro = commas[commas.length - 3];
      result.cidade = commas[commas.length - 2];
      result.estado = cleanUf(commas[commas.length - 1]);
    } else if (commas.length === 5) {
      result.logradouro = commas[0];
      result.numero = commas[1];
      result.bairro = commas[2];
      result.cidade = commas[3];
      result.estado = cleanUf(commas[4]);
    } else if (commas.length >= 2) {
      result.logradouro = commas[0];
      result.numero = commas[1];
      if (commas[2] && !result.complemento) result.complemento = commas.slice(2).join(", ");
    } else {
      result.logradouro = text;
    }
  }

  return result;
};
