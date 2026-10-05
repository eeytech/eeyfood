export interface GeocodedCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Normaliza e higieniza um endereço brasileiro para serviços de geocodificação (OSM Nominatim, Photon, etc.).
 * Remove prefixos/sufixos como "CEP: 00000-000", complementos que não existem nas bases cartográficas
 * (Apto, Sala, Loja, Bloco, Fundos, S/N, etc.) e normaliza pontuações.
 */
export const cleanAddressForGeocoding = (
  raw: string,
): { cleaned: string; cep: string | null } => {
  let text = raw.trim();

  // 1. Extrair CEP (8 dígitos numéricos) se estiver presente
  let cep: string | null = null;
  const cepMatch = text.match(/(?:CEP:?\s*)?(\d{5})[- ]?(\d{3})/i);
  if (cepMatch) {
    cep = `${cepMatch[1]}${cepMatch[2]}`;
  }

  // 2. Remover o termo CEP e os números do CEP do texto da consulta
  text = text.replace(/(?:,?\s*[-–—]?\s*)?(?:CEP:?\s*)\b\d{5}[- ]?\d{3}\b/gi, "");
  text = text.replace(/(?:,?\s*[-–—]?\s*)?\b\d{5}-\d{3}\b/g, "");
  text = text.replace(/\bCEP:?\b/gi, "");

  // 3. Remover complementos comuns que quebram o casamento de endereços em OSM
  text = text.replace(/\([^)]*\)/g, ""); // Tudo entre parênteses
  text = text.replace(
    /\b(apto|apartamento|sala|bloco|fundos|frente|casa|cj|conjunto|loja|sobreloja|lote|quadra|qd|condom[ií]nio|edif[ií]cio|ed|andar|pavimento)\.?\s*[\w\d\-\/]+/gi,
    "",
  );
  text = text.replace(/\bS\/N\b/gi, "");
  text = text.replace(/\bSN\b/gi, "");

  // 4. Normalizar traços e vírgulas (" - " para ", ")
  text = text.replace(/\s*[-–—]\s*/g, ", ");
  text = text.replace(/,\s*,+/g, ",");
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/^,+|,+$/g, "").trim();

  return { cleaned: text, cep };
};

const fetchWithTimeout = async (
  url: string,
  headers?: Record<string, string>,
  timeoutMs = 4000,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const OSM_HEADERS = {
  "User-Agent": "EeyFood-DeliveryPlatform/1.0 (contato@eeyfood.com.br)",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

/**
 * Geocodifica um endereço brasileiro utilizando múltiplos provedores em cascata:
 * 1. OpenStreetMap Nominatim com endereço normalizado
 * 2. Photon (Komoot OSM Geocoder com tolerância a abreviações e busca difusa)
 * 3. OpenStreetMap Nominatim a nível de rua (sem número predial)
 * 4. BrasilAPI (coordenadas geográficas oficiais por CEP brasileiro)
 * 5. OpenStreetMap Nominatim estruturado por CEP (postalcode)
 */
export const geocodeAddress = async (
  query: string,
): Promise<GeocodedCoordinates | null> => {
  if (!query || query.trim().length < 4) return null;

  const { cleaned, cep } = cleanAddressForGeocoding(query);

  // ── Estratégia 1: OpenStreetMap Nominatim com endereço tratado ──
  if (cleaned.length >= 5) {
    try {
      const encoded = encodeURIComponent(cleaned);
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encoded}`;
      const res = await fetchWithTimeout(url, OSM_HEADERS, 3500);
      if (res.ok) {
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
        }
      }
    } catch {
      // Falha de rede ou timeout, tenta o próximo provedor
    }
  }

  // ── Estratégia 2: Photon (Komoot OSM) com busca difusa ──
  if (cleaned.length >= 5) {
    try {
      const encoded = encodeURIComponent(`${cleaned}, Brasil`);
      const url = `https://photon.komoot.io/api/?q=${encoded}&limit=1`;
      const res = await fetchWithTimeout(url, undefined, 3500);
      if (res.ok) {
        const data = (await res.json()) as {
          features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
        };
        const feat = data.features?.[0];
        if (feat && feat.geometry?.coordinates) {
          const [lon, lat] = feat.geometry.coordinates;
          if (typeof lat === "number" && typeof lon === "number") {
            return { latitude: lat, longitude: lon };
          }
        }
      }
    } catch {
      // Avança para próxima estratégia
    }
  }

  // ── Estratégia 3: Nominatim sem o número do imóvel (fallback para a rua/bairro) ──
  const withoutNumber = cleaned
    .replace(/,\s*\d+\b/, "")
    .trim()
    .replace(/^,+|,+$/g, "");
  if (withoutNumber !== cleaned && withoutNumber.length >= 5) {
    try {
      const encoded = encodeURIComponent(withoutNumber);
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encoded}`;
      const res = await fetchWithTimeout(url, OSM_HEADERS, 3000);
      if (res.ok) {
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
        }
      }
    } catch {
      // Avança para próxima estratégia
    }
  }

  // ── Estratégia 4: BrasilAPI v2 por CEP ──
  if (cep && cep.length === 8) {
    try {
      const url = `https://brasilapi.com.br/api/cep/v2/${cep}`;
      const res = await fetchWithTimeout(url, undefined, 3000);
      if (res.ok) {
        const data = (await res.json()) as {
          location?: { coordinates?: { latitude?: string; longitude?: string } };
        };
        const latStr = data.location?.coordinates?.latitude;
        const lngStr = data.location?.coordinates?.longitude;
        if (latStr && lngStr) {
          const latitude = parseFloat(latStr);
          const longitude = parseFloat(lngStr);
          if (!isNaN(latitude) && !isNaN(longitude)) {
            return { latitude, longitude };
          }
        }
      }
    } catch {
      // Avança para próxima estratégia
    }
  }

  // ── Estratégia 5: Nominatim estruturado pelo código postal (CEP) ──
  if (cep && cep.length === 8) {
    try {
      const formattedCep = `${cep.slice(0, 5)}-${cep.slice(5)}`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&postalcode=${encodeURIComponent(formattedCep)}`;
      const res = await fetchWithTimeout(url, OSM_HEADERS, 3000);
      if (res.ok) {
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
        }
      }
    } catch {
      // Não foi possível encontrar
    }
  }

  return null;
};
