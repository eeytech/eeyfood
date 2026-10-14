import { toast } from "sonner";

import type { PreparedPrintJob } from "@/app/(dashboard)/configuracoes/impressoras-actions";

export const LOCAL_AGENT_URL = "http://localhost:4050";

export interface LocalAgentStatus {
  isOnline: boolean;
  version?: string;
  platform?: string;
  hostname?: string;
}

export interface InstalledPrinterInfo {
  name: string;
  port?: string;
  isDefault?: boolean;
}

/**
 * Checks if the EeyFood Print Agent is running locally on the cashier machine (port 4050).
 */
export async function checkLocalAgentStatus(): Promise<LocalAgentStatus> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);

    const res = await fetch(`${LOCAL_AGENT_URL}/status`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isOnline: data.status === "online",
        version: data.version,
        platform: data.platform,
        hostname: data.hostname,
      };
    }
  } catch {
    // Agent is offline or unreachable
  }

  return { isOnline: false };
}

/**
 * Queries the Local Agent to detect all installed printers on the Windows system.
 */
export async function fetchInstalledPrintersFromAgent(): Promise<InstalledPrinterInfo[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${LOCAL_AGENT_URL}/printers`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.printers)) {
        return data.printers;
      }
    }
  } catch {
    // ignore
  }

  return [];
}

export interface DispatchResult {
  printerName: string;
  role: string;
  connectionType: string;
  success: boolean;
  message: string;
}

/**
 * Dispatches prepared print jobs to the local agent or informs of network completion.
 */
export async function dispatchPrintJobs(jobs: PreparedPrintJob[]): Promise<DispatchResult[]> {
  if (!jobs || jobs.length === 0) {
    return [];
  }

  const agentStatus = await checkLocalAgentStatus();
  const results: DispatchResult[] = [];

  for (const job of jobs) {
    // Se o agente local estiver ativo, roteia via agente
    if (agentStatus.isOnline) {
      try {
        if (job.connectionType === "NETWORK_TCP" && job.ipAddress) {
          const res = await fetch(`${LOCAL_AGENT_URL}/print-network`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ip: job.ipAddress,
              port: job.port || 9100,
              dataHex: job.rawHex,
            }),
          });
          const data = await res.json();
          results.push({
            printerName: job.printerName,
            role: job.role,
            connectionType: job.connectionType,
            success: data.success,
            message: data.message || (data.success ? "Impresso via rede (Agente)" : "Falha na rede"),
          });
          continue;
        }

        if (job.connectionType === "WINDOWS_SPOOLER" && job.spoolerName) {
          const res = await fetch(`${LOCAL_AGENT_URL}/print-spooler`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              printerName: job.spoolerName,
              dataHex: job.rawHex,
            }),
          });
          const data = await res.json();
          results.push({
            printerName: job.printerName,
            role: job.role,
            connectionType: job.connectionType,
            success: data.success,
            message: data.message || (data.success ? "Impresso via USB/Windows Spooler" : "Falha no Spooler"),
          });
          continue;
        }
      } catch (err: any) {
        results.push({
          printerName: job.printerName,
          role: job.role,
          connectionType: job.connectionType,
          success: false,
          message: `Erro ao enviar via Agente Local: ${err?.message}`,
        });
        continue;
      }
    }

    // Se o agente NÃO estiver online, mas for NETWORK_TCP, o servidor já tentou disparar na LAN
    if (job.connectionType === "NETWORK_TCP") {
      results.push({
        printerName: job.printerName,
        role: job.role,
        connectionType: job.connectionType,
        success: true,
        message: `Disparado para ${job.ipAddress}:${job.port}. Para impressão 100% garantida no Windows, ative o Agente Local.`,
      });
    } else {
      results.push({
        printerName: job.printerName,
        role: job.role,
        connectionType: job.connectionType,
        success: false,
        message: `Impressora USB "${job.spoolerName || job.printerName}" requer o Agente de Impressão rodando no computador do caixa.`,
      });
    }
  }

  return results;
}
