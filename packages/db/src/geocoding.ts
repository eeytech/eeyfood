export interface GeocodedCoordinates {
  latitude: number;
  longitude: number;
}

export const geocodeAddress = async (
  query: string,
): Promise<GeocodedCoordinates | null> => {
  if (!query || query.trim().length < 5) return null;

  try {
    const encoded = encodeURIComponent(query.trim());
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encoded}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "EeyFood-DeliveryPlatform/1.0",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (err) {
    console.warn("⚠️ [geocodeAddress] Erro ao geocodificar endereço:", err);
    return null;
  }
};
