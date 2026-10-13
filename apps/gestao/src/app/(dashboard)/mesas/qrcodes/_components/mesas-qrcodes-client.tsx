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
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useTheme } from "@/components/theme-provider";
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

type CardTemplate = "TOTEM_ACRYLIC" | "DARK_ELEGANT" | "TENT_FOLDABLE";
type GridDistribution = "1_PER_PAGE" | "2_PER_PAGE" | "4_PER_PAGE" | "6_PER_PAGE";

export function MesasQrCodesClient({
  slug,
  restaurant,
  tables,
}: MesasQrCodesClientProps) {
  const { currentThemeConfig } = useTheme();

  // Sales URL
  const defaultSalesUrl =
    process.env.NEXT_PUBLIC_VENDAS_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://cardapio.digital");
  const [salesBaseUrl, setSalesBaseUrl] = useState(defaultSalesUrl);

  // Template & Layout
  const [template, setTemplate] = useState<CardTemplate>("TOTEM_ACRYLIC");
  const [gridDistribution, setGridDistribution] = useState<GridDistribution>("4_PER_PAGE");
  const [primaryColor, setPrimaryColor] = useState(currentThemeConfig.hex || "#0f172a");

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

  const colorPalettes = useMemo(
    () => [
      { label: "Cor do Tema", value: currentThemeConfig.hex },
      { label: "Preto Clássico", value: "#0f172a" },
      { label: "Azul Marinho", value: "#1e3a8a" },
      { label: "Verde Esmeralda", value: "#065f46" },
      { label: "Dourado Nobre", value: "#854d0e" },
      { label: "Vinho Elegante", value: "#881337" },
      { label: "Laranja Restaurante", value: "#c2410c" },
    ],
    [currentThemeConfig.hex],
  );

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

  // Pagination for A4 sheets
  const itemsPerPage =
    gridDistribution === "1_PER_PAGE"
      ? 1
      : gridDistribution === "2_PER_PAGE"
        ? 2
        : gridDistribution === "4_PER_PAGE"
          ? 4
          : 6;

  const pages = useMemo(() => {
    const chunks: DiningTable[][] = [];
    for (let i = 0; i < displayedTables.length; i += itemsPerPage) {
      chunks.push(displayedTables.slice(i, i + itemsPerPage));
    }
    return chunks;
  }, [displayedTables, itemsPerPage]);

  // Dynamic runtime loader for html2canvas (matches menu print screen)
  const loadHtml2Canvas = (): Promise<any> => {
    if (typeof window === "undefined") return Promise.resolve(null);
    const win = window as any;
    if (win.html2canvas) return Promise.resolve(win.html2canvas);

    return new Promise((resolve, reject) => {
      const existing = document.getElementById("html2canvas-lib");
      if (existing) {
        existing.addEventListener("load", () => resolve((window as any).html2canvas));
        existing.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.id = "html2canvas-lib";
      script.src = "/html2canvas.min.js";
      script.onload = () => resolve((window as any).html2canvas);
      script.onerror = () => {
        const cdnScript = document.createElement("script");
        cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        cdnScript.onload = () => resolve((window as any).html2canvas);
        cdnScript.onerror = () => reject(new Error("Não foi possível carregar o renderizador de PDF."));
        document.body.appendChild(cdnScript);
      };
      document.body.appendChild(script);
    });
  };

  // Isolated iframe print with clean A4 page breaks (model from menu print)
  const handlePrint = async () => {
    const pageElements = document.querySelectorAll<HTMLElement>(".printable-table-page");
    if (!pageElements.length) {
      window.print();
      return;
    }

    try {
      // Remove any existing print iframe
      const oldIframe = document.getElementById("qrcodes-print-iframe");
      if (oldIframe) {
        oldIframe.remove();
      }

      const iframe = document.createElement("iframe");
      iframe.id = "qrcodes-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "1024px";
      iframe.style.height = "1024px";
      iframe.style.border = "none";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      let styles = "";
      document.querySelectorAll("link[rel='stylesheet'], style").forEach((styleNode) => {
        styles += styleNode.outerHTML;
      });

      // Clone page elements, strip non-print items, and force eager image loading
      const tempWrapper = document.createElement("div");
      pageElements.forEach((el) => {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".no-print").forEach((np) => np.remove());
        clone.querySelectorAll("img").forEach((img) => {
          img.setAttribute("loading", "eager");
          img.setAttribute("decoding", "sync");
        });
        tempWrapper.appendChild(clone);
      });
      const pagesHtml = tempWrapper.innerHTML;
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <base href="${origin}/" />
            <title>Imprimir QR Codes de Mesas - ${restaurant.name}</title>
            ${styles}
            <style>
              @page {
                size: A4 portrait;
                margin: 0 !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
                height: auto !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .printable-table-page {
                box-shadow: none !important;
                margin: 0 auto !important;
                border: none !important;
                width: 210mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                min-height: 297mm !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                padding: 8mm !important;
                overflow: hidden !important;
                transform: none !important;
              }
              .printable-table-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .table-card-print {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            </style>
          </head>
          <body>
            ${pagesHtml}
          </body>
        </html>
      `);
      doc.close();

      const waitForImages = async () => {
        const imgs = Array.from(doc.images);
        if (imgs.length === 0) return;
        const promises = imgs.map((img) => {
          if (img.complete && img.naturalHeight > 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 3500);
          });
        });
        await Promise.all(promises);
      };

      await waitForImages();
      await new Promise((resolve) => setTimeout(resolve, 300));

      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Erro ao imprimir QR codes:", err);
      window.print();
    }
  };

  // High-fidelity PDF export with html2canvas and jsPDF (model from menu print)
  const handleDownloadPdf = async () => {
    const pageElements = document.querySelectorAll<HTMLElement>(".printable-table-page");
    if (!pageElements.length) {
      toast.error("Nenhuma mesa selecionada para exportar.");
      return;
    }

    const zoomWrapper = document.getElementById("qrcodes-preview-zoom-wrapper");
    const prevTransform = zoomWrapper?.style.transform;
    const prevTransition = zoomWrapper?.style.transition;

    try {
      setIsExportingPdf(true);
      toast.info(`Gerando PDF com ${pageElements.length} folha(s) em alta qualidade...`);

      if (zoomWrapper) {
        zoomWrapper.style.transition = "none";
        zoomWrapper.style.transform = "none";
      }

      await new Promise((resolve) => setTimeout(resolve, 80));

      const { jsPDF } = await import("jspdf");
      const html2canvas = await loadHtml2Canvas();

      if (!html2canvas) {
        throw new Error("Renderizador não carregado.");
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidthMm = doc.internal.pageSize.getWidth();
      const pdfHeightMm = doc.internal.pageSize.getHeight();

      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) {
          doc.addPage();
        }

        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: "#ffffff",
          imageTimeout: 15000,
          scrollX: 0,
          scrollY: 0,
          onclone: (_clonedDoc: Document, clonedEl: HTMLElement) => {
            const clonedZoom = _clonedDoc.getElementById("qrcodes-preview-zoom-wrapper");
            if (clonedZoom) {
              clonedZoom.style.transform = "none";
              clonedZoom.style.transition = "none";
            }
            clonedEl.style.transform = "none";
            clonedEl.style.boxShadow = "none";
            clonedEl.style.margin = "0";
            clonedEl.style.width = "210mm";
            clonedEl.style.height = "297mm";
            clonedEl.style.maxHeight = "297mm";
            clonedEl.style.boxSizing = "border-box";
            clonedEl.querySelectorAll<HTMLElement>(".no-print").forEach((el) => {
              el.remove();
            });
          },
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        doc.addImage(imgData, "JPEG", 0, 0, pdfWidthMm, pdfHeightMm, undefined, "FAST");
      }

      const fileName = `qrcodes-mesas-${slug || "restaurante"}.pdf`;
      doc.save(fileName);
      toast.success(`PDF das mesas gerado com ${pageElements.length} folha(s) com sucesso!`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Ocorreu um erro ao gerar o PDF das mesas.");
    } finally {
      if (zoomWrapper) {
        if (prevTransform !== undefined) zoomWrapper.style.transform = prevTransform;
        zoomWrapper.style.transition = prevTransition ?? "transform 0.15s ease";
      }
      setIsExportingPdf(false);
    }
  };

  // Download high-resolution PNG for a specific table's complete display card
  const handleDownloadPng = async (table: DiningTable) => {
    try {
      const cardEl = document.getElementById(`table-card-${table.id}`);
      if (!cardEl) {
        toast.error("Card da mesa não encontrado.");
        return;
      }

      const html2canvas = await loadHtml2Canvas();
      if (!html2canvas) {
        toast.error("Renderizador não carregado.");
        return;
      }

      toast.info(`Gerando imagem da ${table.name}...`);
      const canvas = await html2canvas(cardEl, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: template === "DARK_ELEGANT" ? "#020617" : "#ffffff",
        imageTimeout: 10000,
        onclone: (_clonedDoc: Document, clonedEl: HTMLElement) => {
          clonedEl.style.transform = "none";
          clonedEl.style.boxShadow = "none";
          clonedEl.querySelectorAll<HTMLElement>(".no-print").forEach((el) => {
            el.style.display = "none";
          });
        },
      });

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `display-mesa-${slug}-${table.name.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast.success(`Display da ${table.name} baixado em PNG!`);
    } catch (err) {
      console.error("Erro ao gerar PNG:", err);
      toast.error("Erro ao gerar imagem PNG.");
    }
  };

  // Render individual table display card
  const renderTableCard = (table: DiningTable) => {
    const targetUrl = getTableUrl(table.id);

    return (
      <div
        key={table.id}
        id={`table-card-${table.id}`}
        className={cn(
          "table-card-print relative rounded-2xl border transition-all p-5 flex flex-col items-center justify-between text-center overflow-hidden min-h-0",
          showCutLines && "border-dashed border-slate-300",
          !showCutLines && "border-slate-200/80 shadow-xs",
          // Theme variations
          template === "DARK_ELEGANT"
            ? "bg-slate-950 text-white border-slate-800"
            : template === "TENT_FOLDABLE"
              ? "bg-white text-slate-900 border-stone-300"
              : "bg-white text-slate-900",
          // Size variations
          gridDistribution === "4_PER_PAGE" && "p-3.5 h-full",
          gridDistribution === "2_PER_PAGE" && "p-6 h-full",
          gridDistribution === "1_PER_PAGE" && "p-10 justify-around h-full",
          gridDistribution === "6_PER_PAGE" && "p-2.5 h-full",
        )}
      >
        {/* Cut Guide Scissors Indicator */}
        {showCutLines && (
          <div className="no-print absolute top-1.5 right-2 flex items-center gap-1 text-[9px] text-slate-400 font-mono">
            <ScissorsIcon size={10} />
            <span>corte</span>
          </div>
        )}

        {/* ── Top Branding ──────────────────────── */}
        <div className="w-full flex flex-col items-center gap-1 pt-0.5 shrink-0">
          {showLogo && restaurant.avatarImageUrl && (
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-black/10 shadow-xs shrink-0",
                gridDistribution === "6_PER_PAGE"
                  ? "h-7 w-7"
                  : gridDistribution === "4_PER_PAGE"
                    ? "h-9 w-9"
                    : "h-11 w-11",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={restaurant.avatarImageUrl}
                alt={restaurant.name}
                width={gridDistribution === "4_PER_PAGE" ? 36 : 44}
                height={gridDistribution === "4_PER_PAGE" ? 36 : 44}
                loading="eager"
                decoding="sync"
                crossOrigin="anonymous"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {showRestaurantName && (
            <span
              className={cn(
                "font-bold uppercase tracking-wider opacity-80 leading-tight",
                gridDistribution === "6_PER_PAGE"
                  ? "text-[9px]"
                  : gridDistribution === "4_PER_PAGE"
                    ? "text-[11px]"
                    : "text-xs",
              )}
            >
              {restaurant.name}
            </span>
          )}

          {/* Table Number Pill Banner */}
          <div
            className={cn(
              "mt-0.5 rounded-full text-white shadow-sm flex items-center gap-1.5 shrink-0",
              gridDistribution === "6_PER_PAGE"
                ? "px-2.5 py-0.5"
                : gridDistribution === "4_PER_PAGE"
                  ? "px-3.5 py-0.5"
                  : "px-4 py-1",
            )}
            style={{ backgroundColor: primaryColor }}
          >
            <UtensilsIcon size={gridDistribution === "6_PER_PAGE" ? 10 : 12} />
            <span
              className={cn(
                "font-extrabold uppercase tracking-wide",
                gridDistribution === "6_PER_PAGE"
                  ? "text-[11px]"
                  : gridDistribution === "4_PER_PAGE"
                    ? "text-xs"
                    : "text-sm",
              )}
            >
              {table.name}
            </span>
          </div>
        </div>

        {/* Fold Guide for Tent Foldable Template */}
        {template === "TENT_FOLDABLE" && (
          <div className="w-full flex items-center gap-2 my-1 text-[8.5px] text-slate-400 font-mono shrink-0">
            <span className="h-px bg-slate-300 flex-1 border-t border-dashed" />
            <span>✂️ Linha de Dobra</span>
            <span className="h-px bg-slate-300 flex-1 border-t border-dashed" />
          </div>
        )}

        {/* ── Center: QR Code ────────────────────── */}
        <div className="my-1 flex flex-col items-center shrink-0">
          <div
            className={cn(
              "rounded-2xl bg-white border border-slate-200/80 shadow-md",
              gridDistribution === "6_PER_PAGE"
                ? "p-1.5"
                : gridDistribution === "4_PER_PAGE"
                  ? "p-2"
                  : "p-2.5",
            )}
          >
            <QRCodeSVG
              value={targetUrl}
              size={
                gridDistribution === "1_PER_PAGE"
                  ? 220
                  : gridDistribution === "2_PER_PAGE"
                    ? 150
                    : gridDistribution === "6_PER_PAGE"
                      ? 85
                      : 116
              }
              level="H"
            />
          </div>

          {callToAction && (
            <p
              className={cn(
                "mt-1.5 mb-0.5 font-bold tracking-tight text-center max-w-[260px] leading-snug",
                gridDistribution === "6_PER_PAGE"
                  ? "text-[9.5px]"
                  : gridDistribution === "4_PER_PAGE"
                    ? "text-[10.5px]"
                    : "text-xs",
              )}
            >
              {callToAction}
            </p>
          )}

          {/* 3 Step Instruction Icons */}
          {showInstructions && (
            <div
              className={cn(
                "mt-0.5 flex items-center justify-center gap-2 opacity-75 whitespace-nowrap",
                gridDistribution === "6_PER_PAGE" ? "text-[8px]" : "text-[8.5px]",
              )}
            >
              <span className="inline-flex items-center gap-1">
                <SmartphoneIcon size={10} className="shrink-0" /> 1. Aponte
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <UtensilsIcon size={10} className="shrink-0" /> 2. Escolha
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <CheckIcon size={10} className="shrink-0" /> 3. Peça
              </span>
            </div>
          )}
        </div>

        {/* ── Bottom: Wi-Fi & Courtesy Footer ───── */}
        <div className="w-full flex flex-col items-center gap-1 pb-0.5 shrink-0">
          {showWifi && (wifiSsid || wifiPassword) && (
            <div
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border border-current/15 px-3 py-1 opacity-85 w-full max-w-[92%]",
                gridDistribution === "6_PER_PAGE" ? "text-[8px]" : "text-[8.5px]",
              )}
            >
              <WifiIcon size={11} className="shrink-0 text-current" />
              <div className="flex flex-col items-center justify-center text-center leading-tight">
                {wifiSsid && (
                  <span className="truncate max-w-[220px]">
                    Wi-Fi: <strong className="font-semibold">{wifiSsid}</strong>
                  </span>
                )}
                {wifiPassword && (
                  <span className="truncate max-w-[220px]">
                    Senha: <strong className="font-semibold">{wifiPassword}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {subtext && (
            <span
              className={cn(
                "opacity-60 font-medium leading-tight",
                gridDistribution === "6_PER_PAGE" ? "text-[8px]" : "text-[8.5px]",
              )}
            >
              {subtext}
            </span>
          )}

          {/* Card Hover Action Buttons (No Print) */}
          <div className="no-print mt-1.5 flex items-center gap-1 pt-1 border-t border-slate-100 w-full justify-center">
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
  };

  return (
    <div className="space-y-6">
      {/* ── Print Stylesheet ─────────────────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
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
          .printable-table-page {
            box-shadow: none !important;
            margin: 0 auto !important;
            border: none !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            min-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            padding: 8mm !important;
            overflow: hidden !important;
            transform: none !important;
          }
          .printable-table-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
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
            onClick={handlePrint}
            disabled={displayedTables.length === 0}
            className="h-10 gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
            style={{ backgroundColor: currentThemeConfig.hex }}
          >
            <PrinterIcon size={16} />
            <span>Imprimir Displays ({displayedTables.length})</span>
          </Button>
        </div>
      </div>

      {/* ── Main Studio Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Left Sidebar Settings (4 cols) ──────────────── */}
        <div className="no-print space-y-5 lg:col-span-4">
          <Card className="border-slate-200/90 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <QrCodeIcon size={16} style={{ color: currentThemeConfig.hex }} />
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
                      {colorPalettes.map((palette) => (
                        <button
                          key={palette.value}
                          type="button"
                          onClick={() => setPrimaryColor(palette.value)}
                          className={cn(
                            "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                            primaryColor === palette.value
                              ? "border-slate-900 scale-110 shadow-sm ring-2 ring-primary/20"
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
                        className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
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

        {/* ── Right Live Preview Canvas (8 cols) ──────────── */}
        <div className="space-y-4 lg:col-span-8">
          {/* Zoom and Header Controls */}
          <div className="no-print flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-700">Pré-visualização</span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                A4 Retrato •{" "}
                {gridDistribution === "1_PER_PAGE"
                  ? "1 por folha"
                  : gridDistribution === "2_PER_PAGE"
                    ? "2 por folha"
                    : gridDistribution === "4_PER_PAGE"
                      ? "4 por folha"
                      : "6 por folha"}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {pages.length} {pages.length === 1 ? "Folha A4" : "Folhas A4"}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {displayedTables.length} {displayedTables.length === 1 ? "Mesa selecionada" : "Mesas selecionadas"}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                className="h-7 w-7 text-slate-600 hover:bg-slate-100"
                title="Diminuir Zoom"
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
                title="Aumentar Zoom"
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
          <div
            id="qrcodes-preview-canvas-wrapper"
            className="flex justify-center overflow-x-auto p-4 bg-slate-100/80 rounded-2xl border border-slate-200/60 min-h-[600px]"
          >
            <div
              id="qrcodes-preview-zoom-wrapper"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
              }}
              className="space-y-8 pb-8"
            >
              {displayedTables.length === 0 ? (
                <div className="bg-white shadow-2xl transition-all mx-auto w-[210mm] min-h-[297mm] p-[8mm] flex flex-col items-center justify-center text-center">
                  <QrCodeIcon size={48} className="text-slate-300 mb-3" />
                  <h3 className="text-lg font-bold text-slate-700">Nenhuma mesa selecionada</h3>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">
                    Selecione ao menos uma mesa no painel lateral esquerdo para gerar e imprimir as plaquinhas.
                  </p>
                </div>
              ) : (
                pages.map((pageTables, pageIdx) => (
                  <div key={pageIdx} className="flex flex-col items-center">
                    {/* Folha Header Badge */}
                    <div className="no-print mb-2 flex items-center justify-between text-xs text-slate-500 font-medium px-1 w-[210mm]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">
                          Folha {pageIdx + 1} de {pages.length}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono opacity-70">
                        {pageTables.length} {pageTables.length === 1 ? "mesa" : "mesas"} nesta folha
                      </span>
                    </div>

                    {/* ── THE PRINTABLE SHEET (A4) ─────────────────── */}
                    <div
                      id={`table-qr-page-${pageIdx + 1}`}
                      data-page-index={pageIdx}
                      className="printable-table-page relative bg-white shadow-2xl transition-all mx-auto w-[210mm] h-[297mm] max-h-[297mm] p-[8mm] box-border overflow-hidden flex flex-col justify-start"
                    >
                      <div
                        className={cn(
                          "grid gap-4 w-full h-full flex-1",
                          gridDistribution === "1_PER_PAGE" && "grid-cols-1 grid-rows-1",
                          gridDistribution === "2_PER_PAGE" && "grid-cols-1 grid-rows-2",
                          gridDistribution === "4_PER_PAGE" && "grid-cols-2 grid-rows-2",
                          gridDistribution === "6_PER_PAGE" && "grid-cols-2 grid-rows-3",
                        )}
                        style={{
                          gridTemplateColumns:
                            gridDistribution === "1_PER_PAGE"
                              ? "repeat(1, minmax(0, 1fr))"
                              : gridDistribution === "2_PER_PAGE"
                                ? "repeat(1, minmax(0, 1fr))"
                                : gridDistribution === "4_PER_PAGE"
                                  ? "repeat(2, minmax(0, 1fr))"
                                  : "repeat(2, minmax(0, 1fr))",
                          gridTemplateRows:
                            gridDistribution === "1_PER_PAGE"
                              ? "repeat(1, minmax(0, 1fr))"
                              : gridDistribution === "2_PER_PAGE"
                                ? "repeat(2, minmax(0, 1fr))"
                                : gridDistribution === "4_PER_PAGE"
                                  ? "repeat(2, minmax(0, 1fr))"
                                  : "repeat(3, minmax(0, 1fr))",
                        }}
                      >
                        {pageTables.map((table) => renderTableCard(table))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
