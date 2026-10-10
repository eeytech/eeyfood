"use client";

import type { MenuCategory, Product, Restaurant } from "@fsw/db";
import {
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  FlameIcon,
  LeafIcon,
  MoonIcon,
  PaletteIcon,
  PrinterIcon,
  SearchIcon,
  Settings2Icon,
  SparklesIcon,
  UtensilsCrossedIcon,
  WheatOffIcon,
  WifiIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import Image from "next/image";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CategoriaComProdutos extends MenuCategory {
  products: Product[];
}

interface CardapioImpressaoClientProps {
  slug: string;
  restaurant: Restaurant;
  initialCategories: CategoriaComProdutos[];
}

type TemplateTheme = "MODERN_DARK" | "BISTRO_ELEGANT" | "MINIMAL_CLEAN" | "FAST_CASUAL";
type ColumnCount = 1 | 2 | 3;
type PageOrientation = "PORTRAIT" | "LANDSCAPE";
type FontSizeScale = "COMPACT" | "NORMAL" | "SPACIOUS";

interface TemplateOption {
  id: TemplateTheme;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: "BISTRO_ELEGANT",
    title: "Bistrô Elegante",
    badge: "Fundo Marfim",
    description: "Moldura dupla nobre, tipografia clássica e elegância",
    icon: SparklesIcon,
  },
  {
    id: "MODERN_DARK",
    title: "Dark & Gold",
    badge: "Fundo Escuro",
    description: "Visual noturno refinado com acentos dourados",
    icon: MoonIcon,
  },
  {
    id: "MINIMAL_CLEAN",
    title: "Minimalista Clean",
    badge: "Branco Puro",
    description: "Alto contraste, leitura clara e economia de tinta",
    icon: FileTextIcon,
  },
  {
    id: "FAST_CASUAL",
    title: "Fast Casual",
    badge: "Vibrante & Food",
    description: "Estilo dinâmico, moderno e convidativo",
    icon: UtensilsCrossedIcon,
  },
];

export function CardapioImpressaoClient({
  slug,
  restaurant,
  initialCategories,
}: CardapioImpressaoClientProps) {
  // Active theme configuration
  const { currentThemeConfig } = useTheme();

  // Sales URL for QR code
  const defaultSalesUrl =
    process.env.NEXT_PUBLIC_VENDAS_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://cardapio.digital");
  const [salesBaseUrl, setSalesBaseUrl] = useState(defaultSalesUrl);

  // Template & Theme
  const [template, setTemplate] = useState<TemplateTheme>("BISTRO_ELEGANT");
  const [columns, setColumns] = useState<ColumnCount>(2);
  const [orientation, setOrientation] = useState<PageOrientation>("PORTRAIT");
  const [fontSize, setFontSize] = useState<FontSizeScale>("NORMAL");

  // Visual toggles
  const [showPrices, setShowPrices] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [showImages, setShowImages] = useState(true);
  const [showIngredients, setShowIngredients] = useState(true);
  const [showDietaryBadges, setShowDietaryBadges] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [showWifi, setShowWifi] = useState(true);
  const [showFooterNote, setShowFooterNote] = useState(true);
  const [showDigitalMenuQr, setShowDigitalMenuQr] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);

  // Custom text content
  const [title, setTitle] = useState(restaurant.name || "Cardápio");
  const [subtitle, setSubtitle] = useState(
    restaurant.description || "Sabores preparados com ingredientes selecionados e dedicação",
  );
  const [phone, setPhone] = useState(restaurant.phone || "");
  const [address, setAddress] = useState(restaurant.address || "");
  const [instagram, setInstagram] = useState("@" + restaurant.slug);
  const [wifiSsid, setWifiSsid] = useState(`${restaurant.name} Clientes`);
  const [wifiPassword, setWifiPassword] = useState("Restaurante123");
  const [footerNote, setFooterNote] = useState(
    "Taxa de serviço de 10% opcional conforme legislação vigente. Avisos sobre alergias alimentares: consulte nossos atendentes.",
  );

  // Category and Product selection
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(() => {
    return new Set(initialCategories.map((c) => c.id));
  });

  const [excludedProductIds, setExcludedProductIds] = useState<Set<string>>(new Set());

  // Search filter inside editor
  const [searchFilter, setSearchFilter] = useState("");

  // Preview zoom
  const [zoomLevel, setZoomLevel] = useState(100);

  // Is downloading PDF
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Active items calculation
  const displayedCategories = useMemo(() => {
    return initialCategories
      .filter((cat) => selectedCategoryIds.has(cat.id))
      .map((cat) => {
        let products = cat.products.filter((prod) => !excludedProductIds.has(prod.id));

        if (onlyActive) {
          products = products.filter((prod) => prod.isActive);
        }

        if (searchFilter.trim()) {
          const q = searchFilter.toLowerCase().trim();
          products = products.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              (p.description && p.description.toLowerCase().includes(q)),
          );
        }

        return {
          ...cat,
          products,
        };
      })
      .filter((cat) => cat.products.length > 0);
  }, [initialCategories, selectedCategoryIds, excludedProductIds, onlyActive, searchFilter]);

  const totalFilteredProducts = useMemo(() => {
    return displayedCategories.reduce((acc, cat) => acc + cat.products.length, 0);
  }, [displayedCategories]);

  // Handlers for category toggles
  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const toggleAllCategories = (select: boolean) => {
    if (select) {
      setSelectedCategoryIds(new Set(initialCategories.map((c) => c.id)));
    } else {
      setSelectedCategoryIds(new Set());
    }
  };

  const toggleProduct = (prodId: string) => {
    setExcludedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(prodId)) {
        next.delete(prodId);
      } else {
        next.add(prodId);
      }
      return next;
    });
  };

  // Trigger isolated iframe print (prevents blank pages caused by parent overflow or hidden containers)
  const handlePrint = () => {
    const previewElement = document.getElementById("menu-preview-container");
    if (!previewElement) {
      window.print();
      return;
    }

    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.zIndex = "-9999";
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

      const pageOrientationCss = orientation === "LANDSCAPE" ? "A4 landscape" : "A4 portrait";

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <title>Imprimir Cardápio - ${title}</title>
            ${styles}
            <style>
              @page {
                size: ${pageOrientationCss};
                margin: 6mm;
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
              #menu-preview-container {
                box-shadow: none !important;
                margin: 0 auto !important;
                width: 100% !important;
                max-width: 100% !important;
                transform: none !important;
              }
              .page-break-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            </style>
          </head>
          <body>
            ${previewElement.outerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Print error:", e);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      }, 350);
    } catch (err) {
      console.error(err);
      window.print();
    }
  };

  // Generate vector/raster PDF matching the preview exactly with html2canvas and jsPDF
  const handleDownloadPdf = async () => {
    const element = document.getElementById("menu-preview-container");
    if (!element) {
      toast.error("Elemento do cardápio não encontrado para download.");
      return;
    }

    try {
      setIsExportingPdf(true);
      toast.info("Gerando PDF em alta qualidade idêntico à pré-visualização...");

      // Temporarily reset zoom transform on wrapper so html2canvas renders at exact 100% scale
      const zoomWrapper = document.getElementById("menu-preview-zoom-wrapper");
      const prevTransform = zoomWrapper?.style.transform;
      if (zoomWrapper) {
        zoomWrapper.style.transform = "none";
      }

      const [{ jsPDF }, html2canvasModule] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const html2canvas = html2canvasModule.default || html2canvasModule;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null,
      });

      // Restore zoom wrapper style
      if (zoomWrapper && prevTransform !== undefined) {
        zoomWrapper.style.transform = prevTransform;
      }

      const isLandscape = orientation === "LANDSCAPE";
      const pdfWidthMm = isLandscape ? 297 : 210;
      const pdfHeightMm = isLandscape ? 210 : 297;

      const totalHeightMm = (canvas.height / canvas.width) * pdfWidthMm;

      const doc = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const isDark = template === "MODERN_DARK";
      const bgFillColor = isDark
        ? "#020617"
        : template === "BISTRO_ELEGANT"
          ? "#faf7f2"
          : template === "FAST_CASUAL"
            ? "#fffdf7"
            : "#ffffff";

      // If it fits into 1 page (with 4mm tolerance)
      if (totalHeightMm <= pdfHeightMm + 4) {
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        doc.addImage(imgData, "JPEG", 0, 0, pdfWidthMm, totalHeightMm, undefined, "FAST");
      } else {
        // Multi-page slicing according to A4 aspect ratio
        const pageHeightPx = Math.floor(canvas.width * (pdfHeightMm / pdfWidthMm));
        const sliceCanvas = document.createElement("canvas");
        const sliceCtx = sliceCanvas.getContext("2d");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = pageHeightPx;

        let yOffsetPx = 0;
        let pageIndex = 0;

        while (yOffsetPx < canvas.height) {
          if (pageIndex > 0) {
            doc.addPage();
          }

          const currentSliceHeight = Math.min(pageHeightPx, canvas.height - yOffsetPx);

          if (sliceCtx) {
            sliceCtx.fillStyle = bgFillColor;
            sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            sliceCtx.drawImage(
              canvas,
              0,
              yOffsetPx,
              canvas.width,
              currentSliceHeight,
              0,
              0,
              canvas.width,
              currentSliceHeight,
            );
          }

          const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
          doc.addImage(sliceData, "JPEG", 0, 0, pdfWidthMm, pdfHeightMm, undefined, "FAST");

          yOffsetPx += pageHeightPx;
          pageIndex++;
        }
      }

      const fileName = `cardapio-${slug || "restaurante"}.pdf`;
      doc.save(fileName);
      toast.success("Cardápio baixado em PDF com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Ocorreu um erro ao gerar o PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Formatter for currency
  const formatPrice = (val: number | string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(val));
  };

  // URL for digital menu
  const digitalMenuUrl = `${salesBaseUrl.replace(/\/$/, "")}/menu?slug=${slug}`;

  return (
    <div className="space-y-6">
      {/* ── Scoped Print Stylesheet ────────────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${orientation === "LANDSCAPE" ? "A4 landscape" : "A4 portrait"};
            margin: 6mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide non-print dashboard elements */
          aside,
          nav,
          header,
          .no-print,
          button,
          [data-sidebar] {
            display: none !important;
          }
          /* Reset container hierarchy */
          main,
          div {
            overflow: visible !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            display: block !important;
          }
          .lg\\:col-span-8 {
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #menu-preview-canvas-wrapper {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          #menu-preview-zoom-wrapper {
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          #menu-preview-container {
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            box-shadow: none !important;
          }
          .page-break-avoid {
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
          <Link href="/cardapio">
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
                Impressão de Cardápio
              </h1>
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary font-medium"
                style={{
                  borderColor: `${currentThemeConfig.hex}40`,
                  backgroundColor: `${currentThemeConfig.hex}15`,
                  color: currentThemeConfig.hex,
                }}
              >
                Pronto para Imprimir
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Personalize o layout, oculte ou edite itens e gere um cardápio profissional pronto para impressão ou download em PDF.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            variant="outline"
            className="h-10 gap-2 rounded-full border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <DownloadIcon size={15} />
            <span>{isExportingPdf ? "Gerando..." : "Baixar PDF"}</span>
          </Button>

          <Button
            onClick={handlePrint}
            className="h-10 gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
            style={{ backgroundColor: currentThemeConfig.hex }}
          >
            <PrinterIcon size={16} />
            <span>Imprimir Cardápio</span>
          </Button>
        </div>
      </div>

      {/* ── Main Studio Layout (Grid) ───────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Left Configuration Sidebar (4 cols) ─────────── */}
        <div className="no-print space-y-5 lg:col-span-4">
          <Card className="border-slate-200/90 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Settings2Icon
                  size={16}
                  className="text-primary"
                  style={{ color: currentThemeConfig.hex }}
                />
                <span>Configurações do Cardápio</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs defaultValue="design" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="design" className="text-xs data-[state=active]:text-primary">
                    Design
                  </TabsTrigger>
                  <TabsTrigger value="content" className="text-xs data-[state=active]:text-primary">
                    Textos
                  </TabsTrigger>
                  <TabsTrigger value="items" className="text-xs data-[state=active]:text-primary">
                    Itens ({totalFilteredProducts})
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: DESIGN & FORMAT */}
                <TabsContent value="design" className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <PaletteIcon
                          size={15}
                          className="text-primary"
                          style={{ color: currentThemeConfig.hex }}
                        />
                        <span>Tema Visual</span>
                      </Label>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${currentThemeConfig.hex}15`,
                          color: currentThemeConfig.hex,
                        }}
                      >
                        {currentThemeConfig.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {TEMPLATE_OPTIONS.map((opt) => {
                        const isSelected = template === opt.id;
                        const IconComp = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTemplate(opt.id)}
                            className={cn(
                              "group relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all duration-150 focus:outline-none",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                                : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70",
                            )}
                            style={
                              isSelected
                                ? {
                                    borderColor: currentThemeConfig.hex,
                                    backgroundColor: `${currentThemeConfig.hex}0f`,
                                    boxShadow: `0 0 0 1px ${currentThemeConfig.hex}40`,
                                  }
                                : undefined
                            }
                          >
                            <div className="flex items-center justify-between w-full mb-1.5">
                              <div
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                                  isSelected
                                    ? "bg-primary/15 text-primary"
                                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/60",
                                )}
                                style={
                                  isSelected
                                    ? {
                                        backgroundColor: `${currentThemeConfig.hex}20`,
                                        color: currentThemeConfig.hex,
                                      }
                                    : undefined
                                }
                              >
                                <IconComp
                                  size={15}
                                  style={isSelected ? { color: currentThemeConfig.hex } : undefined}
                                />
                              </div>

                              {isSelected ? (
                                <span
                                  className="flex h-4 w-4 items-center justify-center rounded-full text-white"
                                  style={{ backgroundColor: currentThemeConfig.hex }}
                                >
                                  <CheckIcon size={10} strokeWidth={3} />
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {opt.badge}
                                </span>
                              )}
                            </div>

                            <div className="w-full">
                              <p
                                className={cn(
                                  "text-xs font-semibold leading-tight",
                                  isSelected ? "text-slate-900 font-bold" : "text-slate-700",
                                )}
                                style={isSelected ? { color: currentThemeConfig.hex } : undefined}
                              >
                                {opt.title}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-500 leading-tight line-clamp-1">
                                {opt.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <Select
                      value={template}
                      onValueChange={(val) => setTemplate(val as TemplateTheme)}
                    >
                      <SelectTrigger className="mt-1 h-8 rounded-lg border-slate-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BISTRO_ELEGANT">
                          🍷 Bistrô Elegante (Fundo Marfim e Moldura)
                        </SelectItem>
                        <SelectItem value="MODERN_DARK">
                          🌙 Dark e Gold (Fundo Escuro e Dourado)
                        </SelectItem>
                        <SelectItem value="MINIMAL_CLEAN">
                          📄 Minimalista Clean (Branco Puro e Alto Contraste)
                        </SelectItem>
                        <SelectItem value="FAST_CASUAL">
                          🍔 Fast Casual (Acentos Laranja e Vibrante)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Colunas</Label>
                      <Select
                        value={String(columns)}
                        onValueChange={(val) => setColumns(Number(val) as ColumnCount)}
                      >
                        <SelectTrigger className="mt-1.5 h-9 rounded-lg border-slate-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Coluna (Vertical)</SelectItem>
                          <SelectItem value="2">2 Colunas (Clássico)</SelectItem>
                          <SelectItem value="3">3 Colunas (Compacto)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-slate-700">Orientação</Label>
                      <Select
                        value={orientation}
                        onValueChange={(val) => setOrientation(val as PageOrientation)}
                      >
                        <SelectTrigger className="mt-1.5 h-9 rounded-lg border-slate-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PORTRAIT">Retrato (A4 Vertical)</SelectItem>
                          <SelectItem value="LANDSCAPE">Paisagem (A4 Horizontal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Espaçamento / Densidade</Label>
                    <Select
                      value={fontSize}
                      onValueChange={(val) => setFontSize(val as FontSizeScale)}
                    >
                      <SelectTrigger className="mt-1.5 h-9 rounded-lg border-slate-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPACT">Compacto (Mais itens na folha)</SelectItem>
                        <SelectItem value="NORMAL">Normal (Recomendado)</SelectItem>
                        <SelectItem value="SPACIOUS">Espaçoso (Mais respiro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <Label className="text-xs font-semibold text-slate-900 block">
                      Elementos Visuais no Cardápio
                    </Label>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-price" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Exibir Preços dos Produtos
                      </Label>
                      <Switch id="toggle-price" checked={showPrices} onCheckedChange={setShowPrices} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-desc" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Exibir Descrições dos Pratos
                      </Label>
                      <Switch id="toggle-desc" checked={showDescriptions} onCheckedChange={setShowDescriptions} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-ing" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Exibir Lista de Ingredientes
                      </Label>
                      <Switch id="toggle-ing" checked={showIngredients} onCheckedChange={setShowIngredients} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="toggle-img" className="text-xs text-slate-600 font-normal cursor-pointer block">
                          Exibir Fotos dos Pratos
                        </Label>
                        <span className="text-[10px] text-slate-400">Desative para economizar tinta</span>
                      </div>
                      <Switch id="toggle-img" checked={showImages} onCheckedChange={setShowImages} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-diet" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Badges (Vegano, Sem Glúten, Pimenta)
                      </Label>
                      <Switch id="toggle-diet" checked={showDietaryBadges} onCheckedChange={setShowDietaryBadges} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-logo" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Logotipo no Cabeçalho
                      </Label>
                      <Switch id="toggle-logo" checked={showLogo} onCheckedChange={setShowLogo} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-contact" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Contato e Endereço
                      </Label>
                      <Switch id="toggle-contact" checked={showContact} onCheckedChange={setShowContact} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-wifi" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Box de Wi-Fi para Clientes
                      </Label>
                      <Switch id="toggle-wifi" checked={showWifi} onCheckedChange={setShowWifi} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="toggle-qr" className="text-xs text-slate-600 font-normal cursor-pointer block">
                          QR Code do Cardápio Digital
                        </Label>
                        <span className="text-[10px] text-slate-400">Clientes pedem pelo celular</span>
                      </div>
                      <Switch id="toggle-qr" checked={showDigitalMenuQr} onCheckedChange={setShowDigitalMenuQr} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-footer" className="text-xs text-slate-600 font-normal cursor-pointer">
                        Nota de Rodapé / Taxa de Serviço
                      </Label>
                      <Switch id="toggle-footer" checked={showFooterNote} onCheckedChange={setShowFooterNote} />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: TEXTS & INFO */}
                <TabsContent value="content" className="space-y-3.5">
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Título Principal</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 h-8 rounded-lg text-xs"
                      placeholder="Nome do Restaurante ou Cardápio"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Subtítulo / Slogan</Label>
                    <Input
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="mt-1 h-8 rounded-lg text-xs"
                      placeholder="Ex: Culinária artesanal e autêntica"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Telefone / Whats</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1 h-8 rounded-lg text-xs"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Instagram</Label>
                      <Input
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="mt-1 h-8 rounded-lg text-xs"
                        placeholder="@seurestaurante"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Endereço</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="mt-1 h-8 rounded-lg text-xs"
                      placeholder="Rua, Número - Bairro"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Rede Wi-Fi</Label>
                      <Input
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        className="mt-1 h-8 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Senha Wi-Fi</Label>
                      <Input
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        className="mt-1 h-8 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <Label className="text-xs font-medium text-slate-700">Nota de Rodapé</Label>
                    <Textarea
                      value={footerNote}
                      onChange={(e) => setFooterNote(e.target.value)}
                      className="mt-1 min-h-[60px] rounded-lg text-xs"
                      placeholder="Avisos legais, taxas ou agradecimento"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">URL Base do Cardápio Online</Label>
                    <Input
                      value={salesBaseUrl}
                      onChange={(e) => setSalesBaseUrl(e.target.value)}
                      className="mt-1 h-8 rounded-lg text-xs"
                      placeholder="https://sua-loja.com"
                    />
                  </div>
                </TabsContent>

                {/* TAB 3: CATEGORIES & PRODUCT SELECTION */}
                <TabsContent value="items" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAllCategories(true)}
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        Marcar todas
                      </Button>
                      <span className="text-slate-300">|</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAllCategories(false)}
                        className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Desmarcar
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor="filter-active-only" className="text-xs text-slate-600 cursor-pointer">
                        Ativos no app
                      </Label>
                      <Switch
                        id="filter-active-only"
                        checked={onlyActive}
                        onCheckedChange={setOnlyActive}
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <SearchIcon size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Buscar prato ou categoria..."
                      className="h-8 pl-8 text-xs rounded-lg border-slate-200"
                    />
                  </div>

                  <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
                    {initialCategories.map((cat) => {
                      const isCatChecked = selectedCategoryIds.has(cat.id);
                      return (
                        <div
                          key={cat.id}
                          className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isCatChecked}
                                onChange={() => toggleCategory(cat.id)}
                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                              />
                              <span>{cat.name}</span>
                            </label>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                              {cat.products.length} itens
                            </Badge>
                          </div>

                          {isCatChecked && cat.products.length > 0 && (
                            <div className="pl-6 space-y-1 pt-1 border-t border-slate-200/50">
                              {cat.products.map((prod) => {
                                const isProdChecked = !excludedProductIds.has(prod.id);
                                return (
                                  <label
                                    key={prod.id}
                                    className="flex items-center justify-between text-[11px] text-slate-600 hover:text-slate-900 cursor-pointer py-0.5"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <input
                                        type="checkbox"
                                        checked={isProdChecked}
                                        onChange={() => toggleProduct(prod.id)}
                                        className="h-3 w-3 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                      />
                                      <span className={cn(!isProdChecked && "line-through text-slate-400")}>
                                        {prod.name}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono ml-2 shrink-0">
                                      {formatPrice(prod.price)}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
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
          {/* Zoom & Helper Toolbar */}
          <div className="no-print flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Pré-visualização da Folha</span>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-mono">
                {orientation === "LANDSCAPE" ? "A4 Paisagem" : "A4 Retrato"} • {columns} {columns === 1 ? "Coluna" : "Colunas"}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
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

          {/* Interactive Scaled Preview Wrapper */}
          <div
            id="menu-preview-canvas-wrapper"
            className="flex justify-center overflow-x-auto p-4 bg-slate-100/80 rounded-2xl border border-slate-200/60 min-h-[600px]"
          >
            <div
              id="menu-preview-zoom-wrapper"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
              }}
            >
              {/* ── THE PRINTABLE MENU CONTAINER ───────────── */}
              <div
                id="menu-preview-container"
                className={cn(
                  "relative bg-white shadow-2xl transition-all mx-auto",
                  // A4 proportions (in mm converted to approximate px)
                  orientation === "PORTRAIT"
                    ? "w-[210mm] min-h-[297mm] p-[12mm]"
                    : "w-[297mm] min-h-[210mm] p-[12mm]",
                  // Template themes
                  template === "MODERN_DARK" && "bg-slate-950 text-slate-100 border border-slate-800",
                  template === "BISTRO_ELEGANT" && "bg-[#faf7f2] text-stone-900 border-2 border-stone-800/20",
                  template === "MINIMAL_CLEAN" && "bg-white text-slate-900 border border-slate-200",
                  template === "FAST_CASUAL" && "bg-[#fffdf7] text-stone-900 border border-amber-200",
                  // Font size scale
                  fontSize === "COMPACT" && "text-xs",
                  fontSize === "NORMAL" && "text-sm",
                  fontSize === "SPACIOUS" && "text-base",
                )}
              >
                {/* Bistro Decorative Inner Border */}
                {template === "BISTRO_ELEGANT" && (
                  <div className="pointer-events-none absolute inset-[4mm] border border-amber-800/30 rounded-sm" />
                )}

                {/* ── Header ───────────────────────────────── */}
                <div className="relative text-center pb-5 mb-5 border-b border-current/15">
                  {showLogo && restaurant.avatarImageUrl && (
                    <div className="mx-auto mb-2.5 h-14 w-14 overflow-hidden rounded-2xl shadow-sm border border-black/10">
                      <Image
                        src={restaurant.avatarImageUrl}
                        alt={restaurant.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <h1
                    className={cn(
                      "font-bold uppercase tracking-wider",
                      template === "BISTRO_ELEGANT"
                        ? "font-serif text-3xl tracking-widest text-amber-950"
                        : template === "MODERN_DARK"
                          ? "text-3xl text-amber-400 font-display"
                          : "text-2xl font-bold tracking-tight",
                    )}
                  >
                    {title}
                  </h1>

                  {subtitle && (
                    <p
                      className={cn(
                        "mt-1 max-w-xl mx-auto text-xs italic opacity-75 leading-relaxed",
                        template === "BISTRO_ELEGANT" && "font-serif",
                      )}
                    >
                      {subtitle}
                    </p>
                  )}

                  {/* Contact info bar */}
                  {showContact && (phone || address || instagram) && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] opacity-70">
                      {phone && <span>📞 {phone}</span>}
                      {address && <span>📍 {address}</span>}
                      {instagram && <span>📷 {instagram}</span>}
                    </div>
                  )}
                </div>

                {/* ── Menu Products Layout (Columns) ───────── */}
                <div
                  className={cn(
                    "grid gap-x-8 gap-y-6",
                    columns === 1 && "grid-cols-1",
                    columns === 2 && "grid-cols-2",
                    columns === 3 && "grid-cols-3",
                  )}
                >
                  {displayedCategories.map((category) => (
                    <div key={category.id} className="page-break-avoid space-y-3.5">
                      {/* Category Header */}
                      <div className="border-b border-current/20 pb-1.5 flex items-center justify-between">
                        <h2
                          className={cn(
                            "font-bold uppercase tracking-wider text-sm",
                            template === "BISTRO_ELEGANT"
                              ? "font-serif text-amber-900 border-l-2 border-amber-900 pl-2"
                              : template === "MODERN_DARK"
                                ? "text-amber-400"
                                : "text-slate-900",
                          )}
                        >
                          {category.name}
                        </h2>
                        <span className="text-[10px] opacity-50 font-mono">
                          {category.products.length}
                        </span>
                      </div>

                      {/* Products List in this Category */}
                      <div className="space-y-3">
                        {category.products.map((product) => (
                          <div key={product.id} className="page-break-avoid group">
                            <div className="flex items-start justify-between gap-3">
                              {/* Left: Optional Photo + Title + Desc */}
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                {showImages && product.imageUrl && (
                                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-slate-100">
                                    <Image
                                      src={product.imageUrl}
                                      alt={product.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold leading-tight text-xs sm:text-sm">
                                      {product.name}
                                    </span>

                                    {/* Dietary Badges */}
                                    {showDietaryBadges && (
                                      <span className="inline-flex items-center gap-1 shrink-0">
                                        {product.isVegan && (
                                          <span title="Vegano" className="text-emerald-600">
                                            <LeafIcon size={11} />
                                          </span>
                                        )}
                                        {product.isGlutenFree && (
                                          <span title="Sem Glúten" className="text-amber-600">
                                            <WheatOffIcon size={11} />
                                          </span>
                                        )}
                                        {product.isSpicy && (
                                          <span title="Apimentado" className="text-rose-500">
                                            <FlameIcon size={11} />
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  {showDescriptions && product.description && (
                                    <p className="mt-0.5 text-[11px] opacity-70 leading-relaxed line-clamp-2">
                                      {product.description}
                                    </p>
                                  )}

                                  {showIngredients &&
                                    product.ingredients &&
                                    product.ingredients.length > 0 && (
                                      <p className="mt-0.5 text-[10px] opacity-60 italic">
                                        Ingredientes: {product.ingredients.join(", ")}
                                      </p>
                                    )}
                                </div>
                              </div>

                              {/* Right: Dotted Leader + Price */}
                              {showPrices && (
                                <div className="shrink-0 text-right font-bold text-xs sm:text-sm">
                                  <span
                                    className={cn(
                                      template === "MODERN_DARK" && "text-amber-400",
                                      template === "BISTRO_ELEGANT" && "text-amber-950 font-serif",
                                    )}
                                  >
                                    {formatPrice(product.price)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Footer Elements ───────────────────────── */}
                <div className="page-break-avoid mt-8 pt-4 border-t border-current/15 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Left: Wi-Fi Box */}
                  {showWifi && (wifiSsid || wifiPassword) && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-current/15 px-3 py-1.5 text-[11px] opacity-80">
                      <WifiIcon size={14} className="shrink-0" />
                      <div>
                        {wifiSsid && <span className="font-semibold">Rede: {wifiSsid}</span>}
                        {wifiPassword && <span className="ml-2">Senha: {wifiPassword}</span>}
                      </div>
                    </div>
                  )}

                  {/* Middle / Center: Disclaimer Note */}
                  {showFooterNote && footerNote && (
                    <div className="text-[10px] opacity-60 text-center max-w-md mx-auto leading-tight italic">
                      {footerNote}
                    </div>
                  )}

                  {/* Right: Digital Menu QR Code */}
                  {showDigitalMenuQr && (
                    <div className="flex items-center gap-2 shrink-0 border border-current/15 rounded-xl p-1.5 bg-white text-slate-900">
                      <div className="bg-white p-1 rounded-lg">
                        <QRCodeSVG
                          value={digitalMenuUrl}
                          size={46}
                          level="M"
                        />
                      </div>
                      <div className="text-[10px] leading-tight pr-1">
                        <span className="font-bold block">Pedir pelo Celular</span>
                        <span className="opacity-70 text-[9px]">Aponte a câmera</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
