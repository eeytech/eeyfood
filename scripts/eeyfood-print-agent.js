/**
 * EeyFood Local Print Agent (Agente de Impressão Local)
 * 
 * Executa um servidor HTTP local na porta 4050 na máquina do caixa/balcão.
 * Permite que o sistema web (EeyFood Gestão / PDV) envie impressões silenciosas
 * e automáticas para:
 *   1. Impressora de Rede na Cozinha (via socket TCP na porta 9100)
 *   2. Impressora USB no Caixa (via Windows Spooler RAW)
 * 
 * Para rodar:
 *   node scripts/eeyfood-print-agent.js
 * ou
 *   npm run print-agent
 */

const http = require("http");
const net = require("net");
const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = 4050;

// Configuração de CORS para permitir requisições do sistema web
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Enviar dados para impressora de rede (TCP socket direto)
function printToNetwork(ip, port, buffer) {
  return new Promise((resolve, reject) => {
    if (!ip) return reject(new Error("IP da impressora não especificado."));
    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.on("connect", () => {
      socket.write(buffer, (err) => {
        if (err) {
          socket.destroy();
          return reject(err);
        }
        setTimeout(() => {
          socket.destroy();
          resolve({ success: true, message: `Impresso via rede em ${ip}:${port}` });
        }, 300);
      });
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`Tempo limite esgotado ao conectar na impressora em ${ip}:${port}`));
    });

    socket.on("error", (err) => {
      socket.destroy();
      reject(err);
    });

    socket.connect(port || 9100, ip.trim());
  });
}

// Enviar dados RAW para impressora do Windows Spooler (USB / Driver)
function printToWindowsSpooler(printerName, buffer) {
  return new Promise((resolve, reject) => {
    if (process.platform !== "win32") {
      // Fallback em Linux/Mac com CUPS lp
      const tmpFile = path.join(os.tmpdir(), `eeyfood-print-${Date.now()}.bin`);
      fs.writeFileSync(tmpFile, buffer);
      exec(`lp -d "${printerName}" "${tmpFile}"`, (err) => {
        try { fs.unlinkSync(tmpFile); } catch {}
        if (err) return reject(err);
        resolve({ success: true, message: `Enviado para ${printerName}` });
      });
      return;
    }

    const tmpFile = path.join(os.tmpdir(), `eeyfood-print-${Date.now()}.bin`);
    fs.writeFileSync(tmpFile, buffer);

    // PowerShell script chamando winspool.drv RAW printer
    const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
  public static bool SendFile(string printerName, string filePath) {
    byte[] bytes = File.ReadAllBytes(filePath);
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "EeyFood Cupom";
    di.pDataType = "RAW";
    if (StartDocPrinter(hPrinter, 1, di)) {
      if (StartPagePrinter(hPrinter)) {
        IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pBytes, bytes.Length);
        int written;
        bool res = WritePrinter(hPrinter, pBytes, bytes.Length, out written);
        Marshal.FreeCoTaskMem(pBytes);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return res;
      }
      EndDocPrinter(hPrinter);
    }
    ClosePrinter(hPrinter);
    return false;
  }
}
"@
[RawPrinterHelper]::SendFile("${printerName.replace(/"/g, '`"')}", "${tmpFile.replace(/\\/g, "/")}")
`;

    const ps = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript]);
    let output = "";
    let errorOutput = "";

    ps.stdout.on("data", (d) => { output += d.toString(); });
    ps.stderr.on("data", (d) => { errorOutput += d.toString(); });

    ps.on("close", (code) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      if (code === 0 && output.trim().toLowerCase().includes("true")) {
        resolve({ success: true, message: `Enviado com sucesso para a impressora ${printerName}` });
      } else {
        reject(new Error(errorOutput || `Falha ao enviar para ${printerName}. Verifique se o nome da impressora no Windows está exato.`));
      }
    });
  });
}

// Obter lista de impressoras instaladas no sistema operacional
function getInstalledPrinters() {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      exec('powershell -Command "Get-CimInstance Win32_Printer | Select-Object Name, PortName, Default | ConvertTo-Json"', (err, stdout) => {
        if (err || !stdout.trim()) {
          return resolve([]);
        }
        try {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          resolve(list.map((p) => ({
            name: p.Name,
            port: p.PortName,
            isDefault: Boolean(p.Default),
          })));
        } catch {
          resolve([]);
        }
      });
    } else {
      exec("lpstat -a", (err, stdout) => {
        if (err || !stdout) return resolve([]);
        const lines = stdout.split("\n").filter(Boolean);
        const printers = lines.map((l) => ({
          name: l.split(" ")[0],
          port: "CUPS",
          isDefault: false,
        }));
        resolve(printers);
      });
    }
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // Endpoint de status
  if (url.pathname === "/status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "online",
      version: "1.0.0",
      platform: process.platform,
      hostname: os.hostname(),
      uptimeSeconds: Math.floor(process.uptime()),
    }));
    return;
  }

  // Listar impressoras instaladas no Windows / SO
  if (url.pathname === "/printers" && req.method === "GET") {
    const printers = await getInstalledPrinters();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, printers }));
    return;
  }

  // Imprimir via rede (Cozinha TCP)
  if (url.pathname === "/print-network" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const { ip, port = 9100, dataHex, dataBase64 } = payload;
        const buffer = dataHex ? Buffer.from(dataHex, "hex") : Buffer.from(dataBase64, "base64");
        const result = await printToNetwork(ip, port, buffer);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // Imprimir via Spooler do Windows (USB / Caixa)
  if (url.pathname === "/print-spooler" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const { printerName, dataHex, dataBase64 } = payload;
        const buffer = dataHex ? Buffer.from(dataHex, "hex") : Buffer.from(dataBase64, "base64");
        const result = await printToWindowsSpooler(printerName, buffer);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint não encontrado" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [EeyFood Print Agent] Ativo e escutando na porta ${PORT}`);
  console.log(`📍 URL Local: http://localhost:${PORT}`);
  console.log(`🖨️ Pronto para rotear impressões de Rede (Cozinha) e USB (Caixa)`);
  console.log(`======================================================\n`);
});
