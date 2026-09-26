"use client";

import type { DiningTable, Restaurant } from "@fsw/db";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PrinterIcon,
  QrCodeIcon,
  ScissorsIcon,
  SearchIcon,
  SmartphoneIcon,
  UtensilsIcon,
  WifiIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface MesasQrCodesClientProps {
  slug: string;
  restaurant: Restaurant;
  tables: DiningTable[];
}

type CardTemplate = "TOTEM_ACRYLIC" | "STICKER_COMPACT" | "DARK_ELEGANT" | "TENT_FOLDABLE";
type GridDistribution = "1_PER_PAGE" | "2_PER_PAGE" | "4_PER_PAGE" | "6_PER_PAGE";

const COLOR_PALETTES = [
  { label: "Preto Clássico", value: "#0f172a" },
  { label: "Azul Marinho", value: "#1e3a8a" },
  { label: "Verde Esmeralda", value: "#065f46" },
  { label: "Dourado Nobre", value: "#854d0e" },
  { label: "Vinho Elegante", value: "#881337" },
  { label: "Laranja Restaurante", value: "#c2410c" },
];

export function MesasQrCodesClient({
  slug,
  restaurant,
  tables,
}: MesasQrCodesClientProps) {
  // Sales URL
  const defaultSalesUrl =
    process.env.NEXT_PUBLIC_VENDAS_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://cardapio.digital");
  const [salesBaseUrl, setSalesBaseUrl] = useState(defaultSalesUrl);

  // Template & Layout
  const [template, setTemplate] = useState<CardTemplate>("TOTEM_ACRYLIC");
  const [gridDistribution, setGridDistribution] = useState<GridDistribution>("4_PER_PAGE");
  const [primaryColor, setPrimaryColor] = useState("#0f172a");

  // Visual toggles
  const [showLogo, setShowLogo] = useState(true);
  const [showRestaurantName, setShowRestaurantName] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showWifi, setShowWifi] = useState(true);
  const [showCutLines, setShowCutLines] = useState(true);
  const [onlyActiveTables, setOnlyActiveTables] = useState(true);

  // Custom texts
  const [callToAction, setCallToAction] = useState("Aponte a câmera do seu celular para pedir");
  const [subtext, setSubtext] = useState("Cardápio Digital • Peça e acompanhe na mesa");
  const [wifiSsid, setWifiSsid] = useState(`${restaurant.name} Clientes`);
  const [wifiPassword, setWifiPassword] = useState("Restaurante123");

  // Selection
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(() => {
    return new Set(tables.filter((t) => t.isActive).map((t) => t.id));
  });

  const [tableSearch, setTableSearch] = useState("");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Filtered tables to display
  const displayedTables = useMemo(() => {
    return tables
      .filter((t) => {
        if (!selectedTableIds.has(t.id)) return false;
        if (onlyActiveTables && !t.isActive) return false;
        if (tableSearch.trim()) {
          const q = tableSearch.toLowerCase().trim();
          if (!t.name.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return a.name.localeCompare(b.name, "pt-BR", { numeric: true });
      });
  }, [tables, selectedTableIds, onlyActiveTables, tableSearch]);

  // Construct target link for a specific table
  const getTableUrl = (tableId: string) => {
    const base = salesBaseUrl.replace(/\/$/, "");
    return `${base}/menu?consumptionMethod=DINE_IN&tableId=${encodeURIComponent(tableId)}&slug=${encodeURIComponent(slug)}`;
  };

  // Toggle selection
  const toggleTable = (id: string) => {
    setSelectedTableIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = (select: boolean) => {
    if (select) {
      setSelectedTableIds(new Set(tables.map((t) => t.id)));
    } else {
      setSelectedTableIds(new Set());
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = async (tableId: string, tableName: string) => {
    try {
      const url = getTableUrl(tableId);
      await navigator.clipboard.writeText(url);
      toast.success(`Link da ${tableName} copiado!`);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  // Trigger print
  const handlePrint = () => {
    window.print();
  };

  // Download high-resolution PNG for a specific table
  const handleDownloadPng = (table: DiningTable) => {
    try {
      const canvas = document.getElementById(`qr-canvas-${table.id}`) as HTMLCanvasElement;
      if (!canvas) {
        toast.error("Canvas do QR Code não encontrado.");
        return;
      }

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `qrcode-${slug}-${table.name.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast.success(`QR Code da ${table.name} baixado em PNG!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar imagem PNG.");
    }
  };

  // Download PDF with jsPDF
  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      toast.info("Gerando PDF com os displays das mesas...");

      const { jsPDF } = await import("jspdf");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 8;

      // Define grid dimensions (e.g. 2x2 = 4 per page)
      const cols = gridDistribution === "1_PER_PAGE" ? 1 : gridDistribution === "2_PER_PAGE" ? 1 : 2;
      const rows = gridDistribution === "1_PER_PAGE" ? 1 : gridDistribution === "2_PER_PAGE" ? 2 : gridDistribution === "6_PER_PAGE" ? 3 : 2;
      const itemsPerPage = cols * rows;

      const cellWidth = (pageWidth - margin * 2) / cols;
      const cellHeight = (pageHeight - margin * 2) / rows;


      for (let i = 0; i < displayedTables.length; i++) {
        const table = displayedTables[i];

        if (i > 0 && i % itemsPerPage === 0) {
          doc.addPage();
        }

        const pageItemIndex = i % itemsPerPage;
        const colIndex = pageItemIndex % cols;
        const rowIndex = Math.floor(pageItemIndex / cols);

        const x = margin + colIndex * cellWidth;
        const y = margin + rowIndex * cellHeight;

        // Draw card border
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.roundedRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4, 3, 3);

        // Restaurant Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(restaurant.name.toUpperCase(), x + cellWidth / 2, y + 10, {
          align: "center",
        });

        // Table Name Banner
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(x + cellWidth / 2 - 25, y + 14, 50, 8, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text(table.name.toUpperCase(), x + cellWidth / 2, y + 19.5, {
          align: "center",
        });

        // Instruction
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(callToAction, x + cellWidth / 2, y + 26, {
          align: "center",
        });

        // Draw QR Code Image if canvas exists
        const canvas = document.getElementById(`qr-canvas-${table.id}`) as HTMLCanvasElement;
        if (canvas) {
          const qrData = canvas.toDataURL("image/png");
          const qrSize = Math.min(cellWidth * 0.45, 42);
          doc.addImage(
            qrData,
            "PNG",
            x + cellWidth / 2 - qrSize / 2,
            y + 28,
            qrSize,
            qrSize,
          );
        }

        // Wi-Fi info box
        if (showWifi && (wifiSsid || wifiPassword)) {
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(
            `Wi-Fi: ${wifiSsid}   •   Senha: ${wifiPassword}`,
            x + cellWidth / 2,
            y + cellHeight - 12,
            { align: "center" },
          );
        }

        // Subtext Footer
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(subtext, x + cellWidth / 2, y + cellHeight - 6, {
          align: "center",
        });
      }

      const fileName = `qrcodes-mesas-${slug}.pdf`;
      doc.save(fileName);
      toast.success("PDF das mesas gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Ocorreu um erro ao gerar o PDF das mesas.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Hidden Off-Screen Canvases for PNG & PDF Export ── */}
      <div className="hidden">
        {tables.map((table) => (
          <QRCodeCanvas
            key={table.id}
            id={`qr-canvas-${table.id}`}
            value={getTableUrl(table.id)}
            size={380}
            level="H"
            includeMargin
          />
        ))}
      </div>

      {/* ── Print Stylesheet ─────────────────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            overflow: visible !important;
          }
          aside,
          nav,
          header,
          .no-print,
          button,
          [data-sidebar] {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          #qrcodes-print-sheet {
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .table-card-print {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ── Top Header Bar (No Print) ─────────────────────── */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div className="flex items-start gap-3">
          <Link href="/mesas">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white hover:bg-slate-50"
            >
              <ArrowLeftIcon size={18} />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Gerador de QR Code para Mesas
              </h1>
              <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                Auto-Atendimento na Mesa
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Gere displays e plaquinhas com QR Codes vinculados a cada mesa para seus clientes fazerem pedidos diretamente pelo smartphone.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf || displayedTables.length === 0}
            variant="outline"
            className="h-10 gap-2 rounded-full border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <DownloadIcon size={15} />
            <span>{isExportingPdf ? "Gerando..." : "Baixar Todas em PDF"}</span>
          </Button>

          <Button
            onClick={handlePrint}
            disabled={displayedTables.length === 0}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <PrinterIcon size={16} />
            <span>Imprimir Displays ({displayedTables.length})</span>
          </Button>
        </div>
      </div>

      {/* ── Main Studio Grid ──────────────────────────────── */}
      <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Left Sidebar Settings (4 cols) ──────────────── */}
        <div className="space-y-5 lg:col-span-4">
          <Card className="border-slate-200/90 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <QrCodeIcon size={16} className="text-slate-600" />
                <span>Personalizar Displays</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs defaultValue="template" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="template" className="text-xs">
                    Modelo
                  </TabsTrigger>
                  <TabsTrigger value="content" className="text-xs">
                    Textos
                  </TabsTrigger>
                  <TabsTrigger value="tables" className="text-xs">
                    Mesas ({displayedTables.length})
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: MODELO & DISTRIBUIÇÃO */}
                <TabsContent value="template" className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Modelo de Display</Label>
                    <Select
                      value={template}
                      onValueChange={(val) => setTemplate(val as CardTemplate)}
                    >
                      <SelectTrigger className="mt-1.5 h-9 rounded-lg border-slate-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOTEM_ACRYLIC">
                          📐 Display Acrílico / T-Stand (Vertical A6/A5)
                        </SelectItem>
                        <SelectItem value="DARK_ELEGANT">
                          🌙 Dark Luxury (Preto com Dourado)
                        </SelectItem>
                        <SelectItem value="STICKER_COMPACT">
                          🏷️ Adesivo Compacto (Para canto de mesa)
                        </SelectItem>
                        <SelectItem value="TENT_FOLDABLE">
                          🔺 Prisma Dobrável (Fica em pé sozinho)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Distribuição na Folha A4</Label>
                    <Select
                      value={gridDistribution}
                      onValueChange={(val) => setGridDistribution(val as GridDistribution)}
                    >
                      <SelectTrigger className="mt-1.5 h-9 rounded-lg border-slate-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4_PER_PAGE">
                          ✂️ 4 por folha (Grade 2x2 - 10x15cm Ideal)
                        </SelectItem>
                        <SelectItem value="2_PER_PAGE">
                          📄 2 por folha (Grande A5)
                        </SelectItem>
                        <SelectItem value="1_PER_PAGE">
                          📑 1 por página (Display Gigante)
                        </SelectItem>
                        <SelectItem value="6_PER_PAGE">
                          🏷️ 6 por folha (Compacto para Adesivos)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Cor de Destaque</Label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {COLOR_PALETTES.map((palette) => (
                        <button
                          key={palette.value}
                          type="button"
                          onClick={() => setPrimaryColor(palette.value)}
                          className={cn(
                            "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                            primaryColor === palette.value
                              ? "border-slate-900 scale-110 shadow-sm"
                              : "border-transparent",
                          )}
                          style={{ backgroundColor: palette.value }}
                          title={palette.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <Label className="text-xs font-semibold text-slate-900 block">
                      Opções do Display
                    </Label>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-show-logo" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Exibir Logotipo
                      </Label>
                      <Switch id="toggle-show-logo" checked={showLogo} onCheckedChange={setShowLogo} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-show-name" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Exibir Nome do Restaurante
                      </Label>
                      <Switch id="toggle-show-name" checked={showRestaurantName} onCheckedChange={setShowRestaurantName} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-show-inst" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Passo a Passo com Ícones
                      </Label>
                      <Switch id="toggle-show-inst" checked={showInstructions} onCheckedChange={setShowInstructions} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-show-wifi" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Exibir Box de Wi-Fi
                      </Label>
                      <Switch id="toggle-show-wifi" checked={showWifi} onCheckedChange={setShowWifi} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="toggle-cut-lines" className="text-xs text-slate-600 font-normal cursor-pointer block">
                          Linhas de Corte Pontilhadas
                        </Label>
                        <span className="text-[10px] text-slate-400">Facilita cortar com tesoura</span>
                      </div>
                      <Switch id="toggle-cut-lines" checked={showCutLines} onCheckedChange={setShowCutLines} />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: TEXTOS & URL */}
                <TabsContent value="content" className="space-y-3.5">
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Chamada Principal (CTA)</Label>
                    <Input
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      className="mt-1 h-8 rounded-lg text-xs"
                      placeholder="Aponte a câmera do seu celular para pedir"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Subtexto Explicativo</Label>
                    <Input
                      value={subtext}
                      onChange={(e) => setSubtext(e.target.value)}
                      className="mt-1 h-8 rounded-lg text-xs"
                      placeholder="Cardápio Digital • Peça e acompanhe na mesa"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Nome da Rede Wi-Fi</Label>
                      <Input
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        className="mt-1 h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Senha do Wi-Fi</Label>
                      <Input
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        className="mt-1 h-8 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-slate-700">
                        URL Base do App de Vendas
                      </Label>
                      <span className="text-[10px] text-slate-400 font-mono">Auto-detectado</span>
                    </div>
                    <Input
                      value={salesBaseUrl}
                      onChange={(e) => setSalesBaseUrl(e.target.value)}
                      className="h-8 rounded-lg text-xs"
                      placeholder="https://sua-loja.com"
                    />
                    <p className="text-[11px] text-slate-500 leading-tight">
                      O QR code levará diretamente para o cardápio em modo consumo no local (DINE_IN) com a mesa identificada!
                    </p>
                  </div>
                </TabsContent>

                {/* TAB 3: SELEÇÃO DE MESAS */}
                <TabsContent value="tables" className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAll(true)}
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        Selecionar Todas
                      </Button>
                      <span className="text-slate-300">|</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAll(false)}
                        className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Limpar
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor="toggle-active-tables" className="text-xs text-slate-600 cursor-pointer">
                        Só ativas
                      </Label>
                      <Switch
                        id="toggle-active-tables"
                        checked={onlyActiveTables}
                        onCheckedChange={setOnlyActiveTables}
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <SearchIcon size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Buscar por nome da mesa..."
                      className="h-8 pl-8 text-xs rounded-lg border-slate-200"
                    />
                  </div>

                  <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
                    {tables.map((table) => {
                      const isChecked = selectedTableIds.has(table.id);
                      return (
                        <div
                          key={table.id}
                          className={cn(
                            "flex items-center justify-between rounded-xl border p-2.5 transition-colors cursor-pointer",
                            isChecked
                              ? "border-slate-900 bg-slate-50/80"
                              : "border-slate-200 bg-white opacity-60 hover:opacity-100",
                          )}
                          onClick={() => toggleTable(table.id)}
                        >
                          <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleTable(table.id)}
                              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                            <span>{table.name}</span>
                          </label>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[11px] text-slate-400">
                              {table.seats} lugares
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyUrl(table.id, table.name)}
                              className="h-7 w-7 text-slate-400 hover:text-slate-800"
                              title="Copiar Link"
                            >
                              <CopyIcon size={13} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPng(table)}
                              className="h-7 w-7 text-slate-400 hover:text-slate-800"
                              title="Baixar PNG"
                            >
                              <DownloadIcon size={13} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Canvas: Printable Sheet Preview (8 cols) ─ */}
        <div className="space-y-4 lg:col-span-8">
          {/* Zoom and Header Controls */}
          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Folha de Impressão A4</span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {displayedTables.length} {displayedTables.length === 1 ? "Mesa" : "Mesas"} • {gridDistribution.replace("_PER_PAGE", " por folha")}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                className="h-7 w-7 text-slate-600 hover:bg-slate-100"
              >
                <ZoomOutIcon size={14} />
              </Button>
              <span className="text-xs font-mono w-10 text-center text-slate-600">
                {zoomLevel}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                className="h-7 w-7 text-slate-600 hover:bg-slate-100"
              >
                <ZoomInIcon size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel(100)}
                className="h-7 px-2 text-[11px] text-slate-500 hover:bg-slate-100"
              >
                100%
              </Button>
            </div>
          </div>

          {/* Scaled Preview Canvas Wrapper */}
          <div className="flex justify-center overflow-x-auto p-4 bg-slate-100/80 rounded-2xl border border-slate-200/60 min-h-[600px]">
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
              }}
            >
              {/* ── THE PRINTABLE SHEET (A4) ─────────────────── */}
              <div
                id="qrcodes-print-sheet"
                className="bg-white shadow-2xl transition-all mx-auto w-[210mm] min-h-[297mm] p-[8mm]"
              >
                {displayedTables.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[260mm] text-center p-8">
                    <QrCodeIcon size={48} className="text-slate-300 mb-3" />
                    <h3 className="text-lg font-bold text-slate-700">Nenhuma mesa selecionada</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm">
                      Selecione ao menos uma mesa no painel lateral esquerdo para gerar e imprimir as plaquinhas.
                    </p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "grid gap-4",
                      gridDistribution === "1_PER_PAGE" && "grid-cols-1",
                      gridDistribution === "2_PER_PAGE" && "grid-cols-1 md:grid-cols-2",
                      gridDistribution === "4_PER_PAGE" && "grid-cols-2",
                      gridDistribution === "6_PER_PAGE" && "grid-cols-2 md:grid-cols-3",
                    )}
                  >
                    {displayedTables.map((table) => {
                      const targetUrl = getTableUrl(table.id);

                      return (
                        <div
                          key={table.id}
                          className={cn(
                            "table-card-print relative rounded-2xl border transition-all p-5 flex flex-col items-center justify-between text-center overflow-hidden",
                            showCutLines && "border-dashed border-slate-300",
                            !showCutLines && "border-slate-200/80 shadow-xs",
                            // Theme variations
                            template === "DARK_ELEGANT"
                              ? "bg-slate-950 text-white"
                              : template === "STICKER_COMPACT"
                                ? "bg-white text-slate-900 aspect-square justify-center p-3"
                                : "bg-white text-slate-900",
                            // Size variations
                            gridDistribution === "4_PER_PAGE" && "min-h-[135mm]",
                            gridDistribution === "2_PER_PAGE" && "min-h-[135mm]",
                            gridDistribution === "1_PER_PAGE" && "min-h-[270mm] p-10 justify-around",
                            gridDistribution === "6_PER_PAGE" && "min-h-[90mm] p-3",
                          )}
                        >
                          {/* Cut Guide Scissors Indicator */}
                          {showCutLines && (
                            <div className="no-print absolute top-1 right-1 flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                              <ScissorsIcon size={10} />
                              <span>corte</span>
                            </div>
                          )}

                          {/* ── Top Branding ──────────────────────── */}
                          <div className="w-full flex flex-col items-center gap-1.5 pt-1">
                            {showLogo && restaurant.avatarImageUrl && (
                              <div className="h-10 w-10 overflow-hidden rounded-xl border border-black/10 shadow-xs">
                                <Image
                                  src={restaurant.avatarImageUrl}
                                  alt={restaurant.name}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}

                            {showRestaurantName && (
                              <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                                {restaurant.name}
                              </span>
                            )}

                            {/* Table Number Pill Banner */}
                            <div
                              className="mt-1 px-4 py-1 rounded-full text-white shadow-sm flex items-center gap-1.5"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <UtensilsIcon size={13} />
                              <span className="text-sm font-extrabold uppercase tracking-wide">
                                {table.name}
                              </span>
                            </div>
                          </div>

                          {/* ── Center: QR Code ────────────────────── */}
                          <div className="my-3 flex flex-col items-center">
                            <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-md">
                              <QRCodeSVG
                                value={targetUrl}
                                size={
                                  gridDistribution === "1_PER_PAGE"
                                    ? 220
                                    : gridDistribution === "2_PER_PAGE"
                                      ? 150
                                      : gridDistribution === "6_PER_PAGE"
                                        ? 100
                                        : 130
                                }
                                level="H"
                              />
                            </div>

                            <p className="mt-2.5 text-[11px] font-bold tracking-tight max-w-[200px] leading-tight">
                              {callToAction}
                            </p>

                            {/* 3 Step Instruction Icons */}
                            {showInstructions && template !== "STICKER_COMPACT" && (
                              <div className="mt-2 flex items-center justify-center gap-2 text-[9px] opacity-75">
                                <span className="flex items-center gap-1">
                                  <SmartphoneIcon size={11} /> 1. Aponte
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <UtensilsIcon size={11} /> 2. Escolha
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <CheckIcon size={11} /> 3. Peça
                                </span>
                              </div>
                            )}
                          </div>

                          {/* ── Bottom: Wi-Fi & Courtesy Footer ───── */}
                          <div className="w-full flex flex-col items-center gap-1 pb-1">
                            {showWifi && (wifiSsid || wifiPassword) && (
                              <div className="flex items-center justify-center gap-2 rounded-lg border border-current/15 px-2.5 py-1 text-[9px] opacity-80 max-w-full">
                                <WifiIcon size={11} className="shrink-0" />
                                <span className="truncate">
                                  Wi-Fi: <strong className="font-semibold">{wifiSsid}</strong>
                                  {wifiPassword && ` • Senha: ${wifiPassword}`}
                                </span>
                              </div>
                            )}

                            {subtext && template !== "STICKER_COMPACT" && (
                              <span className="text-[9px] opacity-60 font-medium">
                                {subtext}
                              </span>
                            )}

                            {/* Card Hover Action Buttons (No Print) */}
                            <div className="no-print mt-2 flex items-center gap-1 pt-1 border-t border-slate-100 w-full justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyUrl(table.id, table.name)}
                                className="h-6 px-2 text-[10px] text-slate-600 hover:text-slate-900"
                              >
                                <CopyIcon size={11} className="mr-1" />
                                Copiar Link
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPng(table)}
                                className="h-6 px-2 text-[10px] text-slate-600 hover:text-slate-900"
                              >
                                <DownloadIcon size={11} className="mr-1" />
                                PNG
                              </Button>

                              <a
                                href={targetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center h-6 px-2 text-[10px] text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLinkIcon size={11} className="mr-1" />
                                Testar
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
