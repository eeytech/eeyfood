"use client";

import { useCallback, useState } from "react";

// Default ESC/POS pulse: ESC p m t1 t2  (pin 2, 50ms on, 250ms off)
const DEFAULT_DRAWER_HEX = "1B700019FA";

function hexStringToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[\s:]/g, "");
  const bytes = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export type DrawerOpenStatus = "idle" | "opening" | "done" | "error";

export interface UseCashDrawerResult {
  drawerStatus: DrawerOpenStatus;
  drawerError: string | null;
  openDrawerSerial: (pulseHex?: string | null) => Promise<boolean>;
  openDrawerUsb: (pulseHex?: string | null) => Promise<boolean>;
  isSerialSupported: boolean;
  isUsbSupported: boolean;
}

export function useCashDrawer(): UseCashDrawerResult {
  const [drawerStatus, setDrawerStatus] = useState<DrawerOpenStatus>("idle");
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const isSerialSupported =
    typeof navigator !== "undefined" && "serial" in navigator;
  const isUsbSupported =
    typeof navigator !== "undefined" && "usb" in navigator;

  // Opens drawer via the thermal printer's serial (COM) port
  const openDrawerSerial = useCallback(
    async (pulseHex?: string | null): Promise<boolean> => {
      if (!isSerialSupported) {
        setDrawerError("Web Serial não suportada. Use Chrome/Edge.");
        setDrawerStatus("error");
        return false;
      }

      setDrawerStatus("opening");
      setDrawerError(null);

      const bytes = hexStringToBytes(pulseHex ?? DEFAULT_DRAWER_HEX);

      let port: SerialPort;
      try {
        port = await navigator.serial.requestPort();
      } catch {
        setDrawerStatus("idle");
        return false;
      }

      try {
        await port.open({ baudRate: 9600 });
        const writer = port.writable?.getWriter();
        if (!writer) throw new Error("Porta sem stream de escrita.");
        await writer.write(bytes);
        writer.releaseLock();
        await port.close();
        setDrawerStatus("done");
        setTimeout(() => setDrawerStatus("idle"), 2000);
        return true;
      } catch {
        try { await port.close(); } catch { /* ignore */ }
        setDrawerError("Falha ao abrir gaveta via serial. Verifique a impressora.");
        setDrawerStatus("error");
        return false;
      }
    },
    [isSerialSupported],
  );

  // Opens drawer via the thermal printer's USB port (WebUSB)
  const openDrawerUsb = useCallback(
    async (pulseHex?: string | null): Promise<boolean> => {
      if (!isUsbSupported) {
        setDrawerError("Web USB não suportada. Use Chrome/Edge.");
        setDrawerStatus("error");
        return false;
      }

      setDrawerStatus("opening");
      setDrawerError(null);

      const bytes = hexStringToBytes(pulseHex ?? DEFAULT_DRAWER_HEX);

      let device: USBDevice;
      try {
        device = await navigator.usb.requestDevice({ filters: [] });
      } catch {
        setDrawerStatus("idle");
        return false;
      }

      try {
        await device.open();
        if (device.configuration === null) {
          await device.selectConfiguration(1);
        }

        // Find the first bulk-OUT endpoint on the first interface
        const iface = device.configuration?.interfaces[0];
        if (!iface) throw new Error("Nenhuma interface USB encontrada.");

        await device.claimInterface(iface.interfaceNumber);

        const endpoint = iface.alternate.endpoints.find(
          (ep) => ep.direction === "out" && ep.type === "bulk",
        );
        if (!endpoint) throw new Error("Endpoint bulk-OUT não encontrado.");

        await device.transferOut(endpoint.endpointNumber, bytes);
        await device.releaseInterface(iface.interfaceNumber);
        await device.close();

        setDrawerStatus("done");
        setTimeout(() => setDrawerStatus("idle"), 2000);
        return true;
      } catch {
        try { await device.close(); } catch { /* ignore */ }
        setDrawerError("Falha ao abrir gaveta via USB. Verifique a impressora.");
        setDrawerStatus("error");
        return false;
      }
    },
    [isUsbSupported],
  );

  return {
    drawerStatus,
    drawerError,
    openDrawerSerial,
    openDrawerUsb,
    isSerialSupported,
    isUsbSupported,
  };
}
