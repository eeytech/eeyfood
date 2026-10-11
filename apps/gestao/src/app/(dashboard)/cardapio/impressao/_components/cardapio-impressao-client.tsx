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
export type CategoryLayoutMode = "CONTINUOUS" | "GRID_FILL";

export interface PageCategory {
  id: string;
  name: string;
  isContinuation?: boolean;
  products: Product[];
  topProduct?: Product;
}

export interface MenuPage {
  pageIndex: number;
  categories: PageCategory[];
  isFirstPage: boolean;
  isLastPage: boolean;
}

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
  // Theme configuration
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
  const [categoryLayoutMode, setCategoryLayoutMode] = useState<CategoryLayoutMode>("CONTINUOUS");

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

  // Helper to chunk arrays
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  // ── Smart Pagination Engine ──────────────────────────────
  // Distributes categories and products across distinct A4 sheets
  // so no item is ever cut across pages in preview, print or PDF
  const pages = useMemo<MenuPage[]>(() => {
    if (displayedCategories.length === 0) {
      return [
        {
          pageIndex: 0,
          categories: [],
          isFirstPage: true,
          isLastPage: true,
        },
      ];
    }

    const isPortrait = orientation === "PORTRAIT";
    // Total usable height in pixels for A4 (portrait 1122.5px - 24mm padding ≈ 1030px; landscape 793.7px - 24mm ≈ 700px)
    const totalSheetHeight = isPortrait ? 1030 : 700;

    // Estimate Page 1 Header height
    let page1HeaderHeight = 60; // Title (h1) + pb-4 mb-4 border-b
    if (showLogo && restaurant.avatarImageUrl) page1HeaderHeight += 68; // 56px logo + 12px margin
    if (subtitle) page1HeaderHeight += 28; // Subtitle + margin
    if (showContact && (phone || address || instagram)) page1HeaderHeight += 26; // Contact info bar

    const miniHeaderHeight = 36; // Folha X de Y + border
    const footerHeight = showWifi || showFooterNote || showDigitalMenuQr ? 80 : 0;

    const getPageCapacity = (isFirst: boolean, isLast: boolean) => {
      const topH = isFirst ? page1HeaderHeight : miniHeaderHeight;
      const botH = isLast ? footerHeight : 0;
      const availCol = Math.max(180, totalSheetHeight - topH - botH);

      // Real-world content cannot pack 100% into columns due to column breaks,
      // category margins, subpixel line wraps, etc.
      const efficiency = columns === 1 ? 0.88 : columns === 2 ? 0.80 : 0.74;
      return availCol * columns * efficiency;
    };

    const getProdHeight = (prod: Product) => {
      let h = fontSize === "COMPACT" ? 34 : fontSize === "SPACIOUS" ? 48 : 40;
      if (showImages && prod.imageUrl) {
        h = Math.max(h, 52);
      }
      if (showDescriptions && prod.description) {
        const isLong = prod.description.length > 40;
        h += isLong ? 32 : 18;
      }
      if (showIngredients && prod.ingredients && prod.ingredients.length > 0) {
        const isLong = prod.ingredients.join(", ").length > 45;
        h += isLong ? 26 : 16;
      }
      return h + 10; // inter-item spacing (space-y-2.5)
    };

    const getCatOverhead = (isContinuation: boolean) => {
      return (isContinuation ? 38 : 44) + 20; // header + mb-6 spacing
    };

    const getCatHeight = (cat: { products: Product[]; isContinuation?: boolean }) => {
      return (
        getCatOverhead(Boolean(cat.isContinuation)) +
        cat.products.reduce((acc, p) => acc + getProdHeight(p), 0)
      );
    };

    // Helper for grid mode row height
    const calculateGridPageHeight = (cats: PageCategory[]) => {
      let totalH = 0;
      for (let i = 0; i < cats.length; i += columns) {
        const row = cats.slice(i, i + columns);
        const maxProds = Math.max(...row.map((c) => c.products.length));
        const rowH = Math.max(
          ...row.map((c) => {
            const diff = maxProds - c.products.length;
            const highlightCost = diff > 0 ? 85 : 0;
            return getCatHeight(c) + highlightCost;
          }),
        );
        totalH += rowH + (i > 0 ? 20 : 0);
      }
      return totalH;
    };

    // 1. Check if all items fit comfortably in a single page
    const isSinglePagePossible = () => {
      if (categoryLayoutMode === "GRID_FILL" && columns > 1) {
        const availH = (totalSheetHeight - page1HeaderHeight - footerHeight) * 0.88;
        const gridH = calculateGridPageHeight(
          displayedCategories.map((c) => ({
            id: c.id,
            name: c.name,
            products: c.products,
          })),
        );
        return gridH <= availH;
      } else {
        const singleCap = getPageCapacity(true, true);
        const totalCost = displayedCategories.reduce(
          (acc, cat) => acc + getCatHeight(cat),
          0,
        );
        return totalCost <= singleCap;
      }
    };

    if (isSinglePagePossible()) {
      return [
        {
          pageIndex: 0,
          categories: displayedCategories.map((c) => ({
            id: c.id,
            name: c.name,
            products: c.products,
            topProduct: c.products[0],
          })),
          isFirstPage: true,
          isLastPage: true,
        },
      ];
    }

    // 2. Multi-page pagination
    const resultPages: MenuPage[] = [];
    const queue = displayedCategories.map((c) => ({
      id: c.id,
      name: c.name,
      isContinuation: false,
      products: [...c.products],
      topProduct: c.products[0],
    }));

    let currentPageIndex = 0;

    while (queue.length > 0) {
      const isFirstPage = currentPageIndex === 0;

      const capacityWithFooter = getPageCapacity(isFirstPage, true);
      const capacityNoFooter = getPageCapacity(isFirstPage, false);

      const remainingEstimatedCost = queue.reduce(
        (acc, c) => acc + getCatHeight(c),
        0,
      );

      // Determine page capacity limit
      let maxPageCapacity: number;
      if (remainingEstimatedCost <= capacityWithFooter) {
        maxPageCapacity = capacityWithFooter;
      } else if (remainingEstimatedCost <= capacityNoFooter) {
        maxPageCapacity = capacityWithFooter;
      } else {
        maxPageCapacity = capacityNoFooter;
      }

      let usedCapacity = 0;
      const pageCategories: PageCategory[] = [];

      while (queue.length > 0) {
        const nextCat = queue[0];
        const overhead = getCatOverhead(Boolean(nextCat.isContinuation));
        const firstProdCost =
          nextCat.products.length > 0 ? getProdHeight(nextCat.products[0]) : 0;

        if (
          pageCategories.length > 0 &&
          usedCapacity + overhead + firstProdCost > maxPageCapacity
        ) {
          break;
        }

        usedCapacity += overhead;

        const fittedProducts: Product[] = [];
        while (nextCat.products.length > 0) {
          const prod = nextCat.products[0];
          const pCost = getProdHeight(prod);
          if (
            fittedProducts.length > 0 &&
            usedCapacity + pCost > maxPageCapacity
          ) {
            break;
          }
          fittedProducts.push(nextCat.products.shift()!);
          usedCapacity += pCost;
        }

        pageCategories.push({
          id: nextCat.id,
          name: nextCat.name,
          isContinuation: nextCat.isContinuation,
          products: fittedProducts,
          topProduct: nextCat.topProduct,
        });

        if (nextCat.products.length === 0) {
          queue.shift();
        } else {
          nextCat.isContinuation = true;
          break;
        }
      }

      resultPages.push({
        pageIndex: currentPageIndex,
        categories: pageCategories,
        isFirstPage,
        isLastPage: queue.length === 0,
      });

      currentPageIndex++;
      if (currentPageIndex > 30) break;
    }

    if (resultPages.length > 0) {
      resultPages[resultPages.length - 1].isLastPage = true;
    }

    return resultPages;
  }, [
    displayedCategories,
    columns,
    orientation,
    fontSize,
    showImages,
    showDescriptions,
    showIngredients,
    showLogo,
    restaurant.avatarImageUrl,
    subtitle,
    showContact,
    phone,
    address,
    instagram,
    showWifi,
    showFooterNote,
    showDigitalMenuQr,
    categoryLayoutMode,
  ]);

  // Trigger isolated iframe print with clean page breaks per A4 sheet
  const handlePrint = () => {
    const pageElements = document.querySelectorAll<HTMLElement>(".printable-menu-page");
    if (!pageElements.length) {
      window.print();
      return;
    }

    try {
      // Remove any existing print iframe
      const oldIframe = document.getElementById("menu-print-iframe");
      if (oldIframe) {
        oldIframe.remove();
      }

      const iframe = document.createElement("iframe");
      iframe.id = "menu-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.zIndex = "-9999";
      iframe.style.visibility = "hidden";
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
      const pagesHtml = Array.from(pageElements)
        .map((el) => el.outerHTML)
        .join("\n");

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
              .printable-menu-page {
                box-shadow: none !important;
                margin: 0 auto !important;
                border: none !important;
                width: ${orientation === "LANDSCAPE" ? "297mm" : "210mm"} !important;
                min-height: ${orientation === "LANDSCAPE" ? "210mm" : "297mm"} !important;
                height: auto !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                overflow: visible !important;
                transform: none !important;
              }
              .printable-menu-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .page-break-avoid {
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

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 500);
    } catch (err) {
      console.error("Erro ao imprimir cardápio:", err);
      window.print();
    }
  };

  // Dynamic runtime loader for html2canvas (prevents Next.js webpack compiler freezes during deploy)
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
        // Fallback to CDN if needed
        const cdnScript = document.createElement("script");
        cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        cdnScript.onload = () => resolve((window as any).html2canvas);
        cdnScript.onerror = () => reject(new Error("Não foi possível carregar o renderizador de PDF."));
        document.body.appendChild(cdnScript);
      };
      document.body.appendChild(script);
    });
  };

  // Generate vector & canvas high-fidelity multi-page PDF where each A4 page matches 1:1 with preview
  const handleDownloadPdf = async () => {
    const pageElements = document.querySelectorAll<HTMLElement>(".printable-menu-page");
    if (!pageElements.length) {
      toast.error("Visualização do cardápio não encontrada.");
      return;
    }

    const zoomWrapper = document.getElementById("menu-preview-zoom-wrapper");
    const prevTransform = zoomWrapper?.style.transform;

    try {
      setIsExportingPdf(true);
      toast.info(`Gerando PDF com ${pageElements.length} folha(s) em alta qualidade...`);

      // Temporarily remove zoom transformation for 1:1 scale rendering
      if (zoomWrapper) {
        zoomWrapper.style.transform = "none";
      }

      const { jsPDF } = await import("jspdf");
      const html2canvas = await loadHtml2Canvas();

      if (!html2canvas) {
        throw new Error("Renderizador não carregado.");
      }

      const isLandscape = orientation === "LANDSCAPE";
      const doc = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
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
          scale: 2, // High resolution (retina/print quality)
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: null,
          imageTimeout: 15000,
          onclone: (_clonedDoc: Document, clonedEl: HTMLElement) => {
            clonedEl.style.transform = "none";
            clonedEl.style.boxShadow = "none";
            clonedEl.style.margin = "0";
          },
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        doc.addImage(imgData, "JPEG", 0, 0, pdfWidthMm, pdfHeightMm, undefined, "FAST");
      }

      const fileName = `cardapio-${slug || "restaurante"}.pdf`;
      doc.save(fileName);
      toast.success(`Cardápio baixado em PDF com ${pageElements.length} folha(s) com sucesso!`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Ocorreu um erro ao gerar o PDF.");
    } finally {
      if (zoomWrapper && prevTransform !== undefined) {
        zoomWrapper.style.transform = prevTransform;
      }
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

  // Product card renderer
  const renderProductCard = (product: Product) => (
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
  );

  return (
    <div className="space-y-6">
      {/* ── Scoped Print Stylesheet ────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: ${orientation === "LANDSCAPE" ? "A4 landscape" : "A4 portrait"};
            margin: 0 !important;
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
          .printable-menu-page {
            transform: none !important;
            width: ${orientation === "LANDSCAPE" ? "297mm" : "210mm"} !important;
            min-height: ${orientation === "LANDSCAPE" ? "210mm" : "297mm"} !important;
            height: auto !important;
            margin: 0 auto !important;
            padding: 12mm !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          .printable-menu-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
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
                className="font-semibold text-xs shadow-xs"
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

      {/* ── Main Studio Layout (Grid) ─────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Left Configuration Sidebar (4 cols) ─────────── */}
        <div className="no-print space-y-5 lg:col-span-4">
          <Card className="border-slate-200/90 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Settings2Icon size={16} style={{ color: currentThemeConfig.hex }} />
                <span>Configurações do Cardápio</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs defaultValue="design" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="design" className="text-xs">
                    Design
                  </TabsTrigger>
                  <TabsTrigger value="content" className="text-xs">
                    Textos
                  </TabsTrigger>
                  <TabsTrigger value="items" className="text-xs">
                    Itens ({totalFilteredProducts})
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: DESIGN & FORMAT */}
                <TabsContent value="design" className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <PaletteIcon size={14} style={{ color: currentThemeConfig.hex }} />
                        <Label className="text-xs font-semibold text-slate-700">Tema Visual</Label>
                      </div>
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: currentThemeConfig.hex }}
                      >
                        {TEMPLATE_OPTIONS.find((t) => t.id === template)?.title}
                      </span>
                    </div>

                    {/* Visual cards for each template with theme-colored icons */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {TEMPLATE_OPTIONS.map((opt) => {
                        const isSelected = template === opt.id;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTemplate(opt.id)}
                            className={cn(
                              "group relative flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-all",
                              isSelected
                                ? "bg-slate-50/80 shadow-xs"
                                : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                            )}
                            style={{
                              borderColor: isSelected ? currentThemeConfig.hex : undefined,
                              boxShadow: isSelected ? `0 0 0 1px ${currentThemeConfig.hex}25` : undefined,
                            }}
                          >
                            <div className="flex w-full items-center justify-between">
                              <div
                                className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                                style={{
                                  backgroundColor: isSelected
                                    ? `${currentThemeConfig.hex}18`
                                    : `${currentThemeConfig.hex}10`,
                                  color: currentThemeConfig.hex,
                                }}
                              >
                                <Icon size={15} style={{ color: currentThemeConfig.hex }} />
                              </div>
                              {isSelected ? (
                                <span
                                  className="flex h-4 w-4 items-center justify-center rounded-full text-white shadow-xs"
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
                                  isSelected ? "font-bold" : "text-slate-700",
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

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Distribuição & Espaços Vazios</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCategoryLayoutMode("CONTINUOUS")}
                        className={cn(
                          "flex flex-col text-left p-2.5 rounded-xl border transition-all text-xs",
                          categoryLayoutMode === "CONTINUOUS"
                            ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        <span className="font-semibold flex items-center gap-1">
                          Colunas Fluídas
                        </span>
                        <span
                          className={cn(
                            "text-[10px] mt-0.5 leading-tight",
                            categoryLayoutMode === "CONTINUOUS" ? "text-slate-300" : "text-slate-500",
                          )}
                        >
                          Categorias fluem sem vazios
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCategoryLayoutMode("GRID_FILL")}
                        className={cn(
                          "flex flex-col text-left p-2.5 rounded-xl border transition-all text-xs",
                          categoryLayoutMode === "GRID_FILL"
                            ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        <span className="font-semibold flex items-center gap-1">
                          Grade + Destaque
                        </span>
                        <span
                          className={cn(
                            "text-[10px] mt-0.5 leading-tight",
                            categoryLayoutMode === "GRID_FILL" ? "text-slate-300" : "text-slate-500",
                          )}
                        >
                          Preenche com Mais Vendido
                        </span>
                      </button>
                    </div>
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-700">Pré-visualização</span>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-mono">
                {orientation === "LANDSCAPE" ? "A4 Paisagem" : "A4 Retrato"} • {columns} {columns === 1 ? "Coluna" : "Colunas"}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] font-medium",
                  pages.length === 1
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200",
                )}
              >
                {pages.length} {pages.length === 1 ? "Folha A4" : "Folhas A4"}
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
              className="space-y-8 pb-8"
            >
              {pages.map((page, pageIdx) => {
                const hasAllThreeFooter = Boolean(
                  showWifi &&
                    (wifiSsid || wifiPassword) &&
                    showFooterNote &&
                    Boolean(footerNote) &&
                    showDigitalMenuQr,
                );

                return (
                  <div key={pageIdx} className="flex flex-col items-center">
                    {/* Folha Header Badge */}
                    <div
                      className={cn(
                        "no-print mb-2 flex items-center justify-between text-xs text-slate-500 font-medium px-1",
                        orientation === "PORTRAIT" ? "w-[210mm]" : "w-[297mm]",
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="font-semibold text-slate-700">
                          Folha {pageIdx + 1} de {pages.length}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono opacity-70">
                        {page.categories.reduce((acc, c) => acc + c.products.length, 0)} itens nesta folha
                      </span>
                    </div>

                    {/* ── THE PRINTABLE MENU PAGE CONTAINER ───────────── */}
                    <div
                      id={pageIdx === 0 ? "menu-preview-container" : `menu-preview-page-${pageIdx + 1}`}
                      data-page-index={pageIdx}
                      className={cn(
                        "printable-menu-page relative bg-white shadow-2xl transition-all mx-auto flex flex-col justify-between",
                        // A4 proportions
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

                      <div className="flex-1 flex flex-col min-h-0">
                        {/* ── Header: Full on Page 1, Compact on Page 2+ ── */}
                        {pageIdx === 0 ? (
                          <div className="relative text-center pb-4 mb-4 border-b border-current/15 shrink-0">
                            {showLogo && restaurant.avatarImageUrl && (
                              <div
                                className="mx-auto mb-2.5 h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-sm border border-black/10"
                                style={{ width: 56, height: 56 }}
                              >
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
                              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] opacity-70">
                                {phone && <span>📞 {phone}</span>}
                                {address && <span>📍 {address}</span>}
                                {instagram && <span>📷 {instagram}</span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative flex items-center justify-between pb-2 mb-3 border-b border-current/15 text-[11px] opacity-70 shrink-0">
                            <span className="font-semibold uppercase tracking-wider">{title}</span>
                            <span>Folha {pageIdx + 1} de {pages.length}</span>
                          </div>
                        )}

                        {/* ── Menu Products Layout (Continuous vs Grid Fill) ── */}
                        <div className="flex-1 min-h-0">
                          {categoryLayoutMode === "CONTINUOUS" ? (
                            /* Continuous Columns Mode: Categories flow smoothly across columns */
                            <div
                              className={cn(
                                columns === 1 && "space-y-5",
                                columns === 2 && "columns-2 gap-8 [column-fill:_balance]",
                                columns === 3 && "columns-3 gap-6 [column-fill:_balance]",
                              )}
                            >
                              {page.categories.map((category) => (
                                <div
                                  key={`${category.id}-${category.isContinuation ? "cont" : "start"}`}
                                  className="mb-6 w-full space-y-3 break-inside-auto"
                                >
                                  {/* Category Header */}
                                  <div className="border-b border-current/20 pb-1.5 flex items-center justify-between break-inside-avoid break-after-avoid">
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
                                      {category.isContinuation && (
                                        <span className="text-[10px] font-normal opacity-70 ml-1.5 lowercase">
                                          (continuação)
                                        </span>
                                      )}
                                    </h2>
                                    <span className="text-[10px] opacity-50 font-mono">
                                      {category.products.length}
                                    </span>
                                  </div>

                                  {/* Products List in this Category */}
                                  <div className="space-y-2.5">
                                    {category.products.map((product) => renderProductCard(product))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Grid Fill Mode: balances rows and fills empty slots with Destaque / Mais Vendido */
                            <div className="space-y-5">
                              {chunkArray(page.categories, columns).map((rowCats, rowIdx) => {
                                const maxProductsInRow = Math.max(
                                  ...rowCats.map((c) => c.products.length),
                                );

                                return (
                                  <div
                                    key={rowIdx}
                                    className={cn(
                                      "grid gap-x-8 gap-y-5",
                                      columns === 1 && "grid-cols-1",
                                      columns === 2 && "grid-cols-2",
                                      columns === 3 && "grid-cols-3",
                                    )}
                                  >
                                    {rowCats.map((category) => {
                                      const diff = maxProductsInRow - category.products.length;
                                      const topProduct =
                                        category.topProduct || category.products[0];

                                      return (
                                        <div
                                          key={`${category.id}-${category.isContinuation ? "cont" : "start"}`}
                                          className="page-break-avoid flex flex-col justify-between space-y-3"
                                        >
                                          <div className="space-y-3">
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
                                                {category.isContinuation && (
                                                  <span className="text-[10px] font-normal opacity-70 ml-1.5 lowercase">
                                                    (continuação)
                                                  </span>
                                                )}
                                              </h2>
                                              <span className="text-[10px] opacity-50 font-mono">
                                                {category.products.length}
                                              </span>
                                            </div>

                                            {/* Products List */}
                                            <div className="space-y-2.5">
                                              {category.products.map((product) =>
                                                renderProductCard(product),
                                              )}
                                            </div>
                                          </div>

                                          {/* Destaque / Mais Vendido Card to fill empty slots */}
                                          {diff > 0 && topProduct && (
                                            <div className="pt-2 mt-auto">
                                              <div
                                                className={cn(
                                                  "rounded-xl border p-2.5 transition-all text-xs space-y-2",
                                                  template === "MODERN_DARK" &&
                                                    "border-amber-400/25 bg-amber-400/[0.04] text-slate-100",
                                                  template === "BISTRO_ELEGANT" &&
                                                    "border-amber-900/20 bg-amber-950/[0.03] text-stone-900",
                                                  template === "MINIMAL_CLEAN" &&
                                                    "border-slate-200 bg-slate-50 text-slate-900",
                                                  template === "FAST_CASUAL" &&
                                                    "border-amber-300/80 bg-amber-50/70 text-stone-900",
                                                )}
                                              >
                                                <div className="flex items-center justify-between gap-2">
                                                  <span
                                                    className={cn(
                                                      "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                      template === "MODERN_DARK" &&
                                                        "bg-amber-400/15 text-amber-300",
                                                      template === "BISTRO_ELEGANT" &&
                                                        "bg-amber-900/10 text-amber-900 font-serif",
                                                      template === "MINIMAL_CLEAN" &&
                                                        "bg-slate-200 text-slate-800",
                                                      template === "FAST_CASUAL" &&
                                                        "bg-amber-500/15 text-amber-700",
                                                    )}
                                                  >
                                                    <SparklesIcon size={10} />
                                                    ⭐ Mais Vendido de {category.name}
                                                  </span>
                                                  {showPrices && (
                                                    <span
                                                      className={cn(
                                                        "font-bold text-xs shrink-0",
                                                        template === "MODERN_DARK" &&
                                                          "text-amber-400",
                                                        template === "BISTRO_ELEGANT" &&
                                                          "text-amber-950 font-serif",
                                                      )}
                                                    >
                                                      {formatPrice(topProduct.price)}
                                                    </span>
                                                  )}
                                                </div>

                                                <div className="flex items-center gap-2.5">
                                                  {showImages && topProduct.imageUrl && (
                                                    <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-black/10 bg-slate-100">
                                                      <Image
                                                        src={topProduct.imageUrl}
                                                        alt={topProduct.name}
                                                        fill
                                                        className="object-cover"
                                                      />
                                                    </div>
                                                  )}
                                                  <div className="min-w-0 flex-1">
                                                    <span className="font-semibold text-xs block leading-tight truncate">
                                                      {topProduct.name}
                                                    </span>
                                                    <span className="text-[10px] opacity-70 block line-clamp-1 mt-0.5 leading-relaxed">
                                                      {topProduct.description ||
                                                        "O prato favorito e mais pedido pelos nossos clientes!"}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Footer Elements: Only on the Last Page ── */}
                      {page.isLastPage && (showWifi || showFooterNote || showDigitalMenuQr) && (
                        <div className="page-break-avoid mt-auto pt-3 border-t border-current/15 flex flex-row items-center justify-between gap-3 shrink-0">
                          {/* Left: Wi-Fi Box (expanded laterally when all 3 are displayed) */}
                          {showWifi && (wifiSsid || wifiPassword) && (
                            <div
                              className={cn(
                                "flex items-center gap-2.5 rounded-xl border border-current/15 px-3 py-1.5 text-[11px] opacity-80 transition-all",
                                hasAllThreeFooter
                                  ? "flex-[1.4] min-w-[210px] px-3.5 py-2"
                                  : "shrink-0",
                              )}
                            >
                              <WifiIcon size={16} className="shrink-0 text-current opacity-90" />
                              <div className="min-w-0 flex-1 flex flex-col justify-center text-[10.5px] leading-snug space-y-0.5">
                                {wifiSsid && (
                                  <div className="truncate">
                                    <span className="opacity-70">Rede: </span>
                                    <strong className="font-semibold">{wifiSsid}</strong>
                                  </div>
                                )}
                                {wifiPassword && (
                                  <div className="truncate">
                                    <span className="opacity-70">Senha: </span>
                                    <strong className="font-semibold">{wifiPassword}</strong>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Middle / Center: Disclaimer Note (Taxa de 10% / Avisos - reduced laterally when all 3 displayed) */}
                          {showFooterNote && footerNote && (
                            <div
                              className={cn(
                                "text-[9.5px] opacity-65 text-center leading-tight italic",
                                hasAllThreeFooter
                                  ? "flex-initial max-w-[200px] px-2 py-0.5 line-clamp-3"
                                  : "max-w-md mx-auto",
                              )}
                            >
                              {footerNote}
                            </div>
                          )}

                          {/* Right: Digital Menu QR Code (maintains exact same dimensions) */}
                          {showDigitalMenuQr && (
                            <div className="flex items-center gap-2 shrink-0 border border-current/15 rounded-xl p-1.5 bg-white text-slate-900 shadow-xs">
                              <div className="bg-white p-0.5 rounded-lg">
                                <QRCodeSVG
                                  value={digitalMenuUrl}
                                  size={44}
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
