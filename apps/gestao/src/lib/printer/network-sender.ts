import net from "net";

export interface SendResult {
  success: boolean;
  message: string;
}

/**
 * Sends a raw binary buffer directly to a thermal printer connected to the local network via TCP/IP (port 9100).
 */
export async function sendRawToNetworkPrinter(
  ip: string,
  port = 9100,
  buffer: Buffer,
  timeoutMs = 5000,
): Promise<SendResult> {
  if (!ip || !ip.trim()) {
    return { success: false, message: "Endereço IP da impressora não informado." };
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      try {
        socket.removeAllListeners();
        socket.destroy();
      } catch {
        // ignore
      }
    };

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      socket.write(buffer, (err) => {
        if (err) {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({
              success: false,
              message: `Falha ao transmitir dados para a impressora ${ip}:${port}: ${err.message}`,
            });
          }
          return;
        }

        // Wait brief moment to ensure bytes leave the TCP buffer before closing
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({
              success: true,
              message: `Impressão enviada com sucesso para ${ip}:${port}`,
            });
          }
        }, 300);
      });
    });

    socket.on("timeout", () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          message: `Tempo limite esgotado (${timeoutMs}ms) ao tentar conectar na impressora em ${ip}:${port}. Verifique se a impressora está ligada e conectada na mesma rede.`,
        });
      }
    });

    socket.on("error", (err: any) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        let errorMsg = err.message || "Erro de conexão";
        if (err.code === "ECONNREFUSED") {
          errorMsg = "Conexão recusada pela impressora na porta " + port;
        } else if (err.code === "EHOSTUNREACH") {
          errorMsg = "Dispositivo inalcançável na rede (IP " + ip + ")";
        } else if (err.code === "ETIMEDOUT") {
          errorMsg = "Tempo de conexão esgotado";
        }
        resolve({
          success: false,
          message: `Não foi possível comunicar com a impressora ${ip}:${port}: ${errorMsg}`,
        });
      }
    });

    try {
      socket.connect(port, ip.trim());
    } catch (err: any) {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          message: `Erro ao iniciar conexão com ${ip}:${port}: ${err?.message}`,
        });
      }
    }
  });
}

/**
 * Tests connection to a network thermal printer by sending a small ping or test slip.
 */
export async function testNetworkPrinterConnection(
  ip: string,
  port = 9100,
  printerName = "Impressora de Rede",
): Promise<SendResult> {
  // ESC @ (Init) + Test slip text + GS V 65 3 (Cut)
  const testBuffer = Buffer.from([
    0x1b, 0x40, // Init
    0x1b, 0x61, 0x01, // Center
    0x1b, 0x45, 0x01, // Bold ON
    0x1d, 0x21, 0x11, // Double size
    ...Buffer.from("TESTE DE IMPRESSAO\n", "ascii"),
    0x1d, 0x21, 0x00, // Normal size
    0x1b, 0x45, 0x00, // Bold OFF
    ...Buffer.from(`EeyFood - ${printerName}\n`, "ascii"),
    ...Buffer.from(`IP: ${ip}:${port}\n`, "ascii"),
    ...Buffer.from(`Data: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date())}\n`, "ascii"),
    ...Buffer.from("--------------------------------\n", "ascii"),
    ...Buffer.from("Conexao de rede funcionando 100%!\n", "ascii"),
    0x1b, 0x64, 0x03, // Feed 3 lines
    0x1d, 0x56, 0x41, 0x03, // Cut
  ]);

  return sendRawToNetworkPrinter(ip, port, testBuffer);
}
