"use client";

import { useCallback, useRef, useState } from "react";

export type ScaleProtocol = "TOLEDO" | "FILIZOLA" | "ELGIN";

export type WeightCaptureStatus = "idle" | "requesting" | "reading" | "done" | "error";

export interface UseWebSerialResult {
  status: WeightCaptureStatus;
  errorMessage: string | null;
  captureWeight: (protocol: ScaleProtocol, baudRate: number) => Promise<number | null>;
  isSupported: boolean;
}

// Each protocol uses a different framing / regex to extract the net weight in kg.
// Toledo:   `\x02<status><spaces><weight kg><unit>\x03`  e.g. "\x02P 0.450 kg\x03"
// Filizola: ` <7 chars with weight> ` or similar ASCII weight-padded string
// Elgin:    similar to Toledo but with slightly different delimiters
function extractWeight(raw: string, protocol: ScaleProtocol): number | null {
  let match: RegExpMatchArray | null = null;

  if (protocol === "TOLEDO") {
    // Toledo ST: STX + status + spaces + sign + digits.decimals + space + unit + ETX
    match = raw.match(/[\x02\n][\w ]{0,4}([+-]?\d+[.,]\d+)\s*k?g?[\x03\r\n]/i);
    if (!match) {
      // Relaxed: any float-looking number in the string
      match = raw.match(/([+-]?\d{1,4}[.,]\d{1,4})/);
    }
  } else if (protocol === "FILIZOLA") {
    // Filizola: "@00000NNNNN\r\n" where N is the weight in grams (5 digits)
    match = raw.match(/@\d{2}(\d{5})/);
    if (match) {
      // Filizola sends weight in grams as 5 digits
      return Number(match[1]) / 1000;
    }
    // Fallback: float in string
    match = raw.match(/([+-]?\d{1,4}[.,]\d{1,4})/);
  } else {
    // Elgin — same as Toledo framing
    match = raw.match(/[\x02\n][\w ]{0,4}([+-]?\d+[.,]\d+)\s*k?g?[\x03\r\n]/i);
    if (!match) {
      match = raw.match(/([+-]?\d{1,4}[.,]\d{1,4})/);
    }
  }

  if (!match) return null;
  const raw_value = match[1].replace(",", ".");
  const value = parseFloat(raw_value);
  if (isNaN(value) || value < 0) return null;
  // Assume values < 1 are already in kg; values > 20 may be grams — convert
  return value > 20 ? value / 1000 : value;
}

export function useWebSerial(): UseWebSerialResult {
  const [status, setStatus] = useState<WeightCaptureStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const portRef = useRef<SerialPort | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serial" in navigator &&
    Boolean(navigator.serial);

  const captureWeight = useCallback(
    async (protocol: ScaleProtocol, baudRate: number): Promise<number | null> => {
      if (!isSupported || !navigator.serial) {
        setErrorMessage("Web Serial API não suportada neste navegador. Use Chrome/Edge.");
        setStatus("error");
        return null;
      }

      setStatus("requesting");
      setErrorMessage(null);

      let port: SerialPort;
      try {
        port = await navigator.serial.requestPort();
      } catch {
        // User cancelled the port picker
        setStatus("idle");
        return null;
      }

      portRef.current = port;

      try {
        await port.open({
          baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
          flowControl: "none",
        });
      } catch {
        setErrorMessage("Não foi possível abrir a porta serial. Verifique a conexão.");
        setStatus("error");
        return null;
      }

      setStatus("reading");

      const reader = port.readable?.getReader();
      if (!reader) {
        await port.close();
        setErrorMessage("Não foi possível ler dados da balança.");
        setStatus("error");
        return null;
      }

      let accumulated = "";
      let weight: number | null = null;
      const decoder = new TextDecoder();
      const TIMEOUT_MS = 5000;
      const deadline = Date.now() + TIMEOUT_MS;

      try {
        while (Date.now() < deadline) {
          const { value, done } = await Promise.race([
            reader.read(),
            new Promise<{ value: undefined; done: true }>((resolve) =>
              setTimeout(() => resolve({ value: undefined, done: true }), TIMEOUT_MS),
            ),
          ]);

          if (done) break;
          if (value) {
            accumulated += decoder.decode(value, { stream: true });
          }

          const candidate = extractWeight(accumulated, protocol);
          if (candidate !== null) {
            weight = candidate;
            break;
          }
        }
      } finally {
        try {
          reader.releaseLock();
          await port.close();
        } catch {
          // ignore close errors
        }
        portRef.current = null;
      }

      if (weight === null) {
        setErrorMessage("Nenhum peso detectado. Verifique a conexão e o protocolo da balança.");
        setStatus("error");
        return null;
      }

      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
      return weight;
    },
    [isSupported],
  );

  return { status, errorMessage, captureWeight, isSupported };
}
