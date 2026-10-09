"use client";

import {
  AlertTriangleIcon,
  BoxesIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DollarSignIcon,
  FilterXIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  WarehouseIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  criarLoteAction,
  deleteInventoryItemAction,
  registrarPerdaAction,
  updateStockAction,
} from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CardapioGestao, LoteComInsumo, PerdaComInsumo } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";
import type { InventoryItem, InventoryItemType, InventoryLossReason } from "@fsw/db";

import { InventoryFormDialog } from "./inventory-form-dialog";

type ProductWithCategory = CardapioGestao["products"][number];

interface EstoqueClientProps {
  slug: string;
  products: ProductWithCategory[];
  inventoryItems: InventoryItem[];
  lotes: LoteComInsumo[];
  perdas: PerdaComInsumo[];
}

const LOSS_REASON_LABELS: Record<InventoryLossReason, string> = {
  VENCIDO: "Vencido",
  DANIFICADO: "Danificado",
  ESTRAGADO: "Estragado",
  OUTROS: "Outros",
};

const TYPE_LABELS: Record<InventoryItemType, string> = {
  INSUMO: "Insumo",
  EMBALAGEM: "Embalagem",
  EQUIPAMENTO: "Equipamento",
  LIMPEZA: "Limpeza",
  OUTROS: "Outros",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// ── Shared Table Pagination ──────────────────────────────────────────────────
function TablePagination({
  filteredCount,
  totalCount,
  isFiltering,
  currentPage,
  totalPages,
  pageSize,
  onPageSizeChange,
  onPageChange,
  itemLabelSingular,
  itemLabelPlural,
}: {
  filteredCount: number;
  totalCount: number;
  isFiltering: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
  itemLabelSingular: string;
  itemLabelPlural: string;
}) {
  const startIndex = filteredCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, filteredCount);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          Exibindo <strong className="font-semibold text-slate-900">{startIndex}</strong> a{" "}
          <strong className="font-semibold text-slate-900">{endIndex}</strong> de{" "}
          <strong className="font-semibold text-slate-900">{filteredCount}</strong>{" "}
          {filteredCount === 1 ? itemLabelSingular : itemLabelPlural}
          {filteredCount !== totalCount && (
            <span className="ml-1 text-slate-400">
              (total: {totalCount})
            </span>
          )}
        </span>
        {isFiltering && (
          <span className="text-[11px] font-medium text-amber-600">
            (Filtros aplicados)
          </span>
        )}
        <span className="hidden sm:inline text-slate-300">|</span>
        <div className="flex items-center gap-1.5">
          <span>Exibir</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="h-8 w-16 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span>por página</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="text-xs text-slate-500 mr-1">
          Página <strong className="font-semibold text-primary">{currentPage}</strong> de{" "}
          <strong className="font-semibold text-slate-900">{totalPages}</strong>
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/30 disabled:opacity-40 transition-all"
            title="Primeira página"
          >
            <ChevronsLeftIcon size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/30 disabled:opacity-40 transition-all"
            title="Página anterior"
          >
            <ChevronLeftIcon size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/30 disabled:opacity-40 transition-all"
            title="Próxima página"
          >
            <ChevronRightIcon size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/30 disabled:opacity-40 transition-all"
            title="Última página"
          >
            <ChevronsRightIcon size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EstoqueClient({
  slug,
  products,
  inventoryItems,
  lotes,
  perdas,
}: EstoqueClientProps) {
  const [activeTab, setActiveTab] = useState("cardapio");

  // ── Produto Cardápio state ─────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productTrackFilter, setProductTrackFilter] = useState("all");
  const [productSort, setProductSort] = useState("NAME_ASC");
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);
  const [adjustProduct, setAdjustProduct] = useState<ProductWithCategory | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Inventário state ───────────────────────────────────────────────────────
  const [invSearch, setInvSearch] = useState("");
  const [invTypeFilter, setInvTypeFilter] = useState("all");
  const [invStatusFilter, setInvStatusFilter] = useState("all");
  const [invSort, setInvSort] = useState("NAME_ASC");
  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(10);
  const [invFormOpen, setInvFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<InventoryItem | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  // ── Lotes state ────────────────────────────────────────────────────────────
  const [batchSearch, setBatchSearch] = useState("");
  const [batchStatusFilter, setBatchStatusFilter] = useState("all");
  const [batchSort, setBatchSort] = useState("EXP_ASC");
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [isBatchPending, startBatchTransition] = useTransition();
  const [batchPage, setBatchPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(10);

  // ── Perdas state ───────────────────────────────────────────────────────────
  const [lossSearch, setLossSearch] = useState("");
  const [lossReasonFilter, setLossReasonFilter] = useState("all");
  const [lossSort, setLossSort] = useState("DATE_DESC");
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [isLossPending, startLossTransition] = useTransition();
  const [lossPage, setLossPage] = useState(1);
  const [lossPageSize, setLossPageSize] = useState(10);

  // ── Batch/expiry helpers ───────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const getBatchStatus = (expirationDate: string | null) => {
    if (!expirationDate) return "ok";
    const exp = new Date(expirationDate);
    if (exp < today) return "expired";
    if (exp <= sevenDaysLater) return "warning";
    return "ok";
  };

  // ── Metrics Calculation ────────────────────────────────────────────────────
  const lowStockProducts = products.filter(
    (p) => p.trackInventory && p.stockQuantity <= p.lowStockThreshold,
  );
  const lowStockInv = inventoryItems.filter(
    (i) => i.currentQuantity <= i.lowStockThreshold && i.lowStockThreshold > 0,
  );
  const totalLowStockAlerts = lowStockProducts.length + lowStockInv.length;

  const expiringBatches = lotes.filter((l) => getBatchStatus(l.expirationDate) !== "ok");
  const totalFinancialLoss = perdas.reduce((acc, p) => acc + p.financialLoss, 0);

  const categories = Array.from(
    new Map(products.map((p) => [p.categoryId, p.categoryName])).entries(),
  );

  // ── Cardápio Products Filtering & Pagination ───────────────────────────────
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          search.trim() === "" ||
          p.name.toLowerCase().includes(search.toLowerCase().trim()) ||
          (p.sku?.toLowerCase().includes(search.toLowerCase().trim()) ?? false);

        const matchesCategory =
          categoryFilter === "all" || p.categoryId === categoryFilter;

        const matchesTrack =
          productTrackFilter === "all" ||
          (productTrackFilter === "tracked" && p.trackInventory) ||
          (productTrackFilter === "low" && p.trackInventory && p.stockQuantity <= p.lowStockThreshold) ||
          (productTrackFilter === "untracked" && !p.trackInventory);

        return matchesSearch && matchesCategory && matchesTrack;
      })
      .sort((a, b) => {
        if (productSort === "NAME_ASC") return a.name.localeCompare(b.name);
        if (productSort === "STOCK_ASC") return a.stockQuantity - b.stockQuantity;
        if (productSort === "STOCK_DESC") return b.stockQuantity - a.stockQuantity;
        return 0;
      });
  }, [products, search, categoryFilter, productTrackFilter, productSort]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));
  const validProductPage = Math.min(productPage, totalProductPages);
  const paginatedProducts = useMemo(() => {
    const start = (validProductPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, validProductPage, productPageSize]);

  const isFilteringProducts =
    search.trim() !== "" ||
    categoryFilter !== "all" ||
    productTrackFilter !== "all" ||
    productSort !== "NAME_ASC";

  const handleClearProductFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setProductTrackFilter("all");
    setProductSort("NAME_ASC");
    setProductPage(1);
  };

  // ── Inventário Filtering & Pagination ──────────────────────────────────────
  const filteredInv = useMemo(() => {
    return inventoryItems
      .filter((item) => {
        const matchesSearch =
          invSearch.trim() === "" ||
          item.name.toLowerCase().includes(invSearch.toLowerCase().trim()) ||
          (item.description?.toLowerCase().includes(invSearch.toLowerCase().trim()) ?? false) ||
          (item.sku?.toLowerCase().includes(invSearch.toLowerCase().trim()) ?? false);

        const matchesType = invTypeFilter === "all" || item.type === invTypeFilter;

        const isLow =
          item.lowStockThreshold > 0 && item.currentQuantity <= item.lowStockThreshold;
        const matchesStatus =
          invStatusFilter === "all" ||
          (invStatusFilter === "low" && isLow) ||
          (invStatusFilter === "normal" && !isLow);

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        if (invSort === "NAME_ASC") return a.name.localeCompare(b.name);
        if (invSort === "STOCK_ASC") return a.currentQuantity - b.currentQuantity;
        if (invSort === "STOCK_DESC") return b.currentQuantity - a.currentQuantity;
        return 0;
      });
  }, [inventoryItems, invSearch, invTypeFilter, invStatusFilter, invSort]);

  const totalInvPages = Math.max(1, Math.ceil(filteredInv.length / invPageSize));
  const validInvPage = Math.min(invPage, totalInvPages);
  const paginatedInv = useMemo(() => {
    const start = (validInvPage - 1) * invPageSize;
    return filteredInv.slice(start, start + invPageSize);
  }, [filteredInv, validInvPage, invPageSize]);

  const isFilteringInv =
    invSearch.trim() !== "" ||
    invTypeFilter !== "all" ||
    invStatusFilter !== "all" ||
    invSort !== "NAME_ASC";

  const handleClearInvFilters = () => {
    setInvSearch("");
    setInvTypeFilter("all");
    setInvStatusFilter("all");
    setInvSort("NAME_ASC");
    setInvPage(1);
  };

  // ── Lotes Filtering & Pagination ───────────────────────────────────────────
  const filteredBatches = useMemo(() => {
    return lotes
      .filter((lote) => {
        const matchesSearch =
          batchSearch.trim() === "" ||
          lote.inventoryItemName.toLowerCase().includes(batchSearch.toLowerCase().trim()) ||
          (lote.batchCode?.toLowerCase().includes(batchSearch.toLowerCase().trim()) ?? false);

        const status = getBatchStatus(lote.expirationDate);
        const matchesStatus =
          batchStatusFilter === "all" ||
          (batchStatusFilter === "expired" && status === "expired") ||
          (batchStatusFilter === "warning" && status === "warning") ||
          (batchStatusFilter === "ok" && status === "ok");

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (batchSort === "EXP_ASC") {
          if (!a.expirationDate) return 1;
          if (!b.expirationDate) return -1;
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        }
        if (batchSort === "EXP_DESC") {
          if (!a.expirationDate) return 1;
          if (!b.expirationDate) return -1;
          return new Date(b.expirationDate).getTime() - new Date(a.expirationDate).getTime();
        }
        if (batchSort === "QTY_DESC") return b.quantity - a.quantity;
        return 0;
      });
  }, [lotes, batchSearch, batchStatusFilter, batchSort]);

  const totalBatchPages = Math.max(1, Math.ceil(filteredBatches.length / batchPageSize));
  const validBatchPage = Math.min(batchPage, totalBatchPages);
  const paginatedBatches = useMemo(() => {
    const start = (validBatchPage - 1) * batchPageSize;
    return filteredBatches.slice(start, start + batchPageSize);
  }, [filteredBatches, validBatchPage, batchPageSize]);

  const isFilteringBatches =
    batchSearch.trim() !== "" ||
    batchStatusFilter !== "all" ||
    batchSort !== "EXP_ASC";

  const handleClearBatchFilters = () => {
    setBatchSearch("");
    setBatchStatusFilter("all");
    setBatchSort("EXP_ASC");
    setBatchPage(1);
  };

  // ── Perdas Filtering & Pagination ──────────────────────────────────────────
  const filteredLosses = useMemo(() => {
    return perdas
      .filter((perda) => {
        const matchesSearch =
          lossSearch.trim() === "" ||
          perda.inventoryItemName.toLowerCase().includes(lossSearch.toLowerCase().trim()) ||
          (perda.notes?.toLowerCase().includes(lossSearch.toLowerCase().trim()) ?? false);

        const matchesReason =
          lossReasonFilter === "all" || perda.reason === lossReasonFilter;

        return matchesSearch && matchesReason;
      })
      .sort((a, b) => {
        if (lossSort === "DATE_DESC") {
          return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
        }
        if (lossSort === "LOSS_DESC") {
          return b.financialLoss - a.financialLoss;
        }
        return 0;
      });
  }, [perdas, lossSearch, lossReasonFilter, lossSort]);

  const totalLossPages = Math.max(1, Math.ceil(filteredLosses.length / lossPageSize));
  const validLossPage = Math.min(lossPage, totalLossPages);
  const paginatedLosses = useMemo(() => {
    const start = (validLossPage - 1) * lossPageSize;
    return filteredLosses.slice(start, start + lossPageSize);
  }, [filteredLosses, validLossPage, lossPageSize]);

  const isFilteringLosses =
    lossSearch.trim() !== "" ||
    lossReasonFilter !== "all" ||
    lossSort !== "DATE_DESC";

  const handleClearLossFilters = () => {
    setLossSearch("");
    setLossReasonFilter("all");
    setLossSort("DATE_DESC");
    setLossPage(1);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAdjust = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjustProduct) return;
    const formData = new FormData(e.currentTarget);
    formData.set("productId", adjustProduct.id);
    startTransition(async () => {
      await updateStockAction(slug, formData);
      toast.success("Estoque do produto atualizado com sucesso!");
      setAdjustProduct(null);
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmItem) return;
    const id = deleteConfirmItem.id;
    startDeleteTransition(async () => {
      await deleteInventoryItemAction(slug, id);
      toast.success("Item de inventário excluído com sucesso.");
      setDeleteConfirmItem(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Dialog: Ajustar Estoque de Produto ─────────────── */}
      <Dialog
        open={adjustProduct !== null}
        onOpenChange={(open) => !open && setAdjustProduct(null)}
      >
        <DialogContent className="border-slate-200 bg-white shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Ajustar Saldo de Estoque
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {adjustProduct?.categoryName} · {adjustProduct?.name}
            </DialogDescription>
          </DialogHeader>

          {adjustProduct && (
            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                    Saldo atual
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-slate-900">
                    {adjustProduct.stockQuantity}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                    Alerta
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-amber-700">
                    {adjustProduct.lowStockThreshold}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                    SKU
                  </p>
                  <p className="mt-1 font-mono text-xs font-semibold text-slate-700 truncate">
                    {adjustProduct.sku ?? "—"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="stock-qty" className="text-xs font-semibold text-slate-700">
                    Nova Quantidade
                  </Label>
                  <Input
                    id="stock-qty"
                    name="stockQuantity"
                    type="number"
                    min="0"
                    defaultValue={String(adjustProduct.stockQuantity)}
                    required
                    className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stock-threshold" className="text-xs font-semibold text-slate-700">
                    Novo Limite de Alerta
                  </Label>
                  <Input
                    id="stock-threshold"
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    defaultValue={String(adjustProduct.lowStockThreshold)}
                    required
                    className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock-reason" className="text-xs font-semibold text-slate-700">
                  Motivo da Alteração
                </Label>
                <Input
                  id="stock-reason"
                  name="reason"
                  placeholder="Ex.: Reposição de mercadorias, contagem física..."
                  required
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustProduct(null)}
                  className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-10 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                >
                  {isPending ? "Atualizando..." : "Salvar Saldo"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Exclusão de Insumo ────────── */}
      <ConfirmDeleteDialog
        open={deleteConfirmItem !== null}
        onOpenChange={(open) => !open && setDeleteConfirmItem(null)}
        title="Excluir Insumo"
        description={
          <>
            Tem certeza que deseja excluir{" "}
            <strong className="text-slate-900 font-semibold">
              {deleteConfirmItem?.name}
            </strong>
            ? Esta ação removerá o insumo do controle de estoque.
          </>
        }
        confirmLabel="Sim, excluir insumo"
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />

      {/* ── Dialog: Registrar Perda ──────────────────────── */}
      <Dialog open={lossDialogOpen} onOpenChange={setLossDialogOpen}>
        <DialogContent className="border-slate-200 bg-white shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Registrar Perda ou Desperdício
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              O saldo do item será reduzido e o impacto financeiro registrado no relatório.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startLossTransition(async () => {
                const result = await registrarPerdaAction(slug, formData);
                if (result.success) {
                  toast.success("Desperdício registrado com sucesso.");
                  setLossDialogOpen(false);
                } else {
                  toast.error(result.error ?? "Erro ao registrar perda.");
                }
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="loss-item" className="text-xs font-semibold text-slate-700">
                Insumo
              </Label>
              <select
                id="loss-item"
                name="inventoryItemId"
                required
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selecione o insumo...</option>
                {inventoryItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (Atual: {i.currentQuantity} {i.unitOfMeasure})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="loss-reason" className="text-xs font-semibold text-slate-700">
                  Motivo
                </Label>
                <select
                  id="loss-reason"
                  name="reason"
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="VENCIDO">Vencido</option>
                  <option value="DANIFICADO">Danificado</option>
                  <option value="ESTRAGADO">Estragado</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loss-qty" className="text-xs font-semibold text-slate-700">
                  Qtd. Perdida
                </Label>
                <Input
                  id="loss-qty"
                  name="quantity"
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                  placeholder="Ex.: 2.5"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loss-cost" className="text-xs font-semibold text-slate-700">
                Custo Total do Prejuízo (R$)
              </Label>
              <Input
                id="loss-cost"
                name="unitCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex.: 35.00"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loss-notes" className="text-xs font-semibold text-slate-700">
                Observações
              </Label>
              <Input
                id="loss-notes"
                name="notes"
                placeholder="Ex.: Embalagem rasgada no descarregamento..."
                className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLossDialogOpen(false)}
                className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLossPending}
                className="h-10 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
              >
                {isLossPending ? "Registrando..." : "Registrar Desperdício"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Registrar Lote ───────────────────────── */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="border-slate-200 bg-white shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Registrar Lote e Entrada
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Dê entrada em um lote de insumos para acompanhar validade e custo unitário.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startBatchTransition(async () => {
                const result = await criarLoteAction(slug, formData);
                if (result.success) {
                  toast.success("Lote registrado e estoque atualizado.");
                  setBatchDialogOpen(false);
                } else {
                  toast.error(result.error ?? "Erro ao registrar lote.");
                }
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="batch-item" className="text-xs font-semibold text-slate-700">
                Insumo
              </Label>
              <select
                id="batch-item"
                name="inventoryItemId"
                required
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selecione o insumo...</option>
                {inventoryItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unitOfMeasure})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="batch-qty" className="text-xs font-semibold text-slate-700">
                  Quantidade
                </Label>
                <Input
                  id="batch-qty"
                  name="quantity"
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                  placeholder="Ex.: 10"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch-cost" className="text-xs font-semibold text-slate-700">
                  Custo Unitário (R$)
                </Label>
                <Input
                  id="batch-cost"
                  name="unitCost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex.: 4.50"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="batch-mfg" className="text-xs font-semibold text-slate-700">
                  Data de Fabricação
                </Label>
                <DatePicker id="batch-mfg" name="manufacturingDate" placeholder="Selecione data" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch-exp" className="text-xs font-semibold text-slate-700">
                  Data de Validade
                </Label>
                <DatePicker id="batch-exp" name="expirationDate" placeholder="Selecione validade" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-code" className="text-xs font-semibold text-slate-700">
                Código do Lote
              </Label>
              <Input
                id="batch-code"
                name="batchCode"
                placeholder="Ex.: LOT-2024-001"
                className="h-10 rounded-xl border-slate-200 bg-white font-mono text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBatchDialogOpen(false)}
                className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isBatchPending}
                className="h-10 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
              >
                {isBatchPending ? "Registrando..." : "Registrar Lote"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Criar/Editar Item de Inventário ───────── */}
      <InventoryFormDialog
        slug={slug}
        item={editingItem}
        open={invFormOpen}
        onOpenChange={setInvFormOpen}
      />

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <BoxesIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Controle de Estoque e Insumos
            </h1>
            <p className="text-sm text-slate-500">
              Monitore o saldo dos produtos do cardápio, gerencie insumos e controle validades e perdas.
            </p>
          </div>
        </div>

        {activeTab === "inventario" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setEditingItem(null);
                setInvFormOpen(true);
              }}
              className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <PlusIcon size={16} />
              <span>Novo Insumo</span>
            </Button>
          </div>
        )}

        {activeTab === "lotes" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setBatchDialogOpen(true)}
              className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <PlusIcon size={16} />
              <span>Novo Lote</span>
            </Button>
          </div>
        )}

        {activeTab === "perdas" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setLossDialogOpen(true)}
              className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <AlertTriangleIcon size={16} />
              <span>Registrar Perda</span>
            </Button>
          </div>
        )}
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Itens no Inventário */}
        <Card
          onClick={() => setActiveTab("inventario")}
          className="cursor-pointer border-slate-200/80 bg-white shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Itens no Inventário
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <WarehouseIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {inventoryItems.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              + {products.filter((p) => p.trackInventory).length} produtos rastreados
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Alertas de Baixo Estoque */}
        <Card
          onClick={() => {
            setActiveTab("inventario");
            setInvStatusFilter("low");
            setInvPage(1);
          }}
          className="cursor-pointer border-slate-200/80 bg-white shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Estoque Baixo
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <AlertTriangleIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {totalLowStockAlerts}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalLowStockAlerts === 0
                ? "Nenhum item em falta"
                : `${totalLowStockAlerts} ${totalLowStockAlerts === 1 ? "item abaixo do mínimo" : "itens abaixo do mínimo"}`}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Validades & Lotes em Risco */}
        <Card
          onClick={() => {
            setActiveTab("lotes");
            setBatchStatusFilter("warning");
            setBatchPage(1);
          }}
          className="cursor-pointer border-slate-200/80 bg-white shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Alerta de Validade
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <CalendarIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {expiringBatches.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {expiringBatches.length === 0
                ? "Lotes dentro do prazo"
                : `${expiringBatches.length} ${expiringBatches.length === 1 ? "lote em risco" : "lotes em risco"}`}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Prejuízo Acumulado */}
        <Card
          onClick={() => setActiveTab("perdas")}
          className="cursor-pointer border-slate-200/80 bg-white shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Perdas Acumuladas
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <DollarSignIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {formatCurrency(totalFinancialLoss)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {perdas.length === 1 ? "1 registro de desperdício" : `${perdas.length} registros de desperdício`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Pill Tabs ───────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
          <TabsTrigger
            value="cardapio"
            className="group gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <PackageIcon size={14} />
            <span>Produtos do Cardápio</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 transition-colors group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
              {products.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="inventario"
            className="group gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <WarehouseIcon size={14} />
            <span>Inventário e Bastidores</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 transition-colors group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
              {inventoryItems.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="lotes"
            className="group gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <CalendarIcon size={14} />
            <span>Lotes e Validade</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 transition-colors group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
              {lotes.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="perdas"
            className="group gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <AlertTriangleIcon size={14} />
            <span>Perdas e Descartes</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 transition-colors group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
              {perdas.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Produtos do Cardápio ─────────────────── */}
        <TabsContent value="cardapio" className="space-y-4">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Filtros de Produtos */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-4">
                  {/* Busca */}
                  <div className="relative">
                    <SearchIcon
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar por nome ou SKU..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setProductPage(1);
                      }}
                      className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:text-sm"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setProductPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XIcon size={14} />
                      </button>
                    )}
                  </div>

                  {/* Categoria */}
                  <Select
                    value={categoryFilter}
                    onValueChange={(val) => {
                      setCategoryFilter(val);
                      setProductPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categories.map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Controle de estoque */}
                  <Select
                    value={productTrackFilter}
                    onValueChange={(val) => {
                      setProductTrackFilter(val);
                      setProductPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Controle de estoque" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="all">Todos os produtos</SelectItem>
                      <SelectItem value="tracked">Monitorados</SelectItem>
                      <SelectItem value="low">Baixo Estoque</SelectItem>
                      <SelectItem value="untracked">Sem Controle</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Ordenação */}
                  <Select
                    value={productSort}
                    onValueChange={(val) => {
                      setProductSort(val);
                      setProductPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Ordenar..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="NAME_ASC">Nome (A-Z)</SelectItem>
                      <SelectItem value="STOCK_ASC">Menor Saldo</SelectItem>
                      <SelectItem value="STOCK_DESC">Maior Saldo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isFilteringProducts && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearProductFilters}
                    className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <FilterXIcon size={14} />
                    <span>Limpar</span>
                  </Button>
                )}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-2xl bg-primary/10 p-4 text-primary border border-primary/20">
                  <PackageIcon size={32} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhum produto encontrado
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {isFilteringProducts
                    ? "Tente ajustar os filtros de busca para visualizar os produtos."
                    : "Nenhum produto cadastrado no cardápio deste restaurante."}
                </p>
                {isFilteringProducts ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearProductFilters}
                    className="mt-4 gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                  >
                    <FilterXIcon size={14} />
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingItem(null);
                      setInvFormOpen(true);
                    }}
                    className="mt-4 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                  >
                    <PlusIcon size={14} />
                    Cadastrar insumo
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="pl-4 text-xs font-semibold text-slate-700">Produto</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Categoria</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">SKU</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Saldo Atual</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Alerta Mínimo</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Rastreio</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="w-20 pr-4 text-right text-xs font-semibold text-slate-700">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {paginatedProducts.map((product) => {
                        const isLow =
                          product.trackInventory &&
                          product.stockQuantity <= product.lowStockThreshold;

                        return (
                          <TableRow
                            key={product.id}
                            className="transition-colors hover:bg-slate-50/70"
                          >
                            <TableCell className="pl-4 py-3.5 font-semibold text-slate-900">
                              {product.name}
                            </TableCell>

                            <TableCell className="py-3.5 text-slate-600">
                              <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                {product.categoryName}
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 font-mono text-xs text-slate-500">
                              {product.sku ? (
                                <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
                                  {product.sku}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>

                            <TableCell
                              className={cn(
                                "py-3.5 text-right font-display text-sm font-bold",
                                isLow ? "text-rose-600" : "text-slate-900",
                              )}
                            >
                              {product.stockQuantity} un
                            </TableCell>

                            <TableCell className="py-3.5 text-right text-xs text-slate-500">
                              {product.lowStockThreshold} un
                            </TableCell>

                            <TableCell className="py-3.5">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                  product.trackInventory
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-slate-100 text-slate-600 border border-slate-200",
                                )}
                              >
                                {product.trackInventory ? "Monitorado" : "Sem controle"}
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5">
                              {product.trackInventory ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                  {isLow ? "Baixo Estoque" : "Saudável"}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </TableCell>

                            <TableCell className="pr-4 py-3.5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                  >
                                    <MoreHorizontalIcon size={16} />
                                    <span className="sr-only">Opções</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-44 rounded-xl border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                                >
                                  <DropdownMenuItem
                                    onClick={() => setAdjustProduct(product)}
                                    className="gap-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-900"
                                  >
                                    <PencilIcon size={14} className="text-primary" />
                                    Ajustar saldo
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {paginatedProducts.map((product) => {
                    const isLow =
                      product.trackInventory &&
                      product.stockQuantity <= product.lowStockThreshold;

                    return (
                      <div key={product.id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.categoryName}</p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
                              product.trackInventory
                                ? "border-primary/20 bg-primary/10 text-primary"
                                : "border-slate-200 bg-slate-100 text-slate-600",
                            )}
                          >
                            {product.trackInventory
                              ? isLow
                                ? "Baixo"
                                : "Saudável"
                              : "Sem controle"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <span className="text-slate-500">
                            Saldo: <strong className={isLow ? "text-rose-600" : "text-slate-900"}>{product.stockQuantity} un</strong> (Alerta: {product.lowStockThreshold} un)
                          </span>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/10"
                            onClick={() => setAdjustProduct(product)}
                          >
                            <PencilIcon size={13} />
                            Ajustar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <TablePagination
                  filteredCount={filteredProducts.length}
                  totalCount={products.length}
                  isFiltering={isFilteringProducts}
                  currentPage={validProductPage}
                  totalPages={totalProductPages}
                  pageSize={productPageSize}
                  onPageSizeChange={(sz) => {
                    setProductPageSize(sz);
                    setProductPage(1);
                  }}
                  onPageChange={setProductPage}
                  itemLabelSingular="produto"
                  itemLabelPlural="produtos"
                />
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 2: Inventário e Bastidores ─────────────── */}
        <TabsContent value="inventario" className="space-y-4">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Filtros de Inventário */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-4">
                  {/* Busca */}
                  <div className="relative">
                    <SearchIcon
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar item ou SKU..."
                      value={invSearch}
                      onChange={(e) => {
                        setInvSearch(e.target.value);
                        setInvPage(1);
                      }}
                      className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:text-sm"
                    />
                    {invSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setInvSearch("");
                          setInvPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XIcon size={14} />
                      </button>
                    )}
                  </div>

                  {/* Tipo */}
                  <Select
                    value={invTypeFilter}
                    onValueChange={(val) => {
                      setInvTypeFilter(val);
                      setInvPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {(Object.keys(TYPE_LABELS) as InventoryItemType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Status */}
                  <Select
                    value={invStatusFilter}
                    onValueChange={(val) => {
                      setInvStatusFilter(val);
                      setInvPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Status de estoque" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="low">Estoque Baixo</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Ordenação */}
                  <Select
                    value={invSort}
                    onValueChange={(val) => {
                      setInvSort(val);
                      setInvPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Ordenar..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="NAME_ASC">Nome (A-Z)</SelectItem>
                      <SelectItem value="STOCK_ASC">Menor Saldo</SelectItem>
                      <SelectItem value="STOCK_DESC">Maior Saldo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isFilteringInv && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearInvFilters}
                    className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <FilterXIcon size={14} />
                    <span>Limpar</span>
                  </Button>
                )}
              </div>
            </div>

            {filteredInv.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-2xl bg-primary/10 p-4 text-primary border border-primary/20">
                  <WarehouseIcon size={32} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhum item encontrado
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {isFilteringInv
                    ? "Tente ajustar os filtros de busca para visualizar os insumos."
                    : "Cadastre insumos, embalagens e equipamentos para controlar o consumo interno."}
                </p>
                {isFilteringInv ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearInvFilters}
                    className="mt-4 gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                  >
                    <FilterXIcon size={14} />
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingItem(null);
                      setInvFormOpen(true);
                    }}
                    className="mt-4 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                  >
                    <PlusIcon size={14} />
                    Cadastrar primeiro insumo
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="pl-4 text-xs font-semibold text-slate-700">Insumo</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Tipo</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">SKU</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Qtd. Atual</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Alerta Mínimo</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Unidade</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="w-20 pr-4 text-right text-xs font-semibold text-slate-700">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {paginatedInv.map((item) => {
                        const isLow =
                          item.lowStockThreshold > 0 &&
                          item.currentQuantity <= item.lowStockThreshold;

                        return (
                          <TableRow
                            key={item.id}
                            className="transition-colors hover:bg-slate-50/70"
                          >
                            <TableCell className="pl-4 py-3.5 font-semibold text-slate-900">
                              <div>
                                <p className="font-semibold text-slate-900">{item.name}</p>
                                {item.description && (
                                  <p className="truncate max-w-xs text-xs text-slate-400 mt-0.5">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5">
                              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                {TYPE_LABELS[item.type]}
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 font-mono text-xs text-slate-500">
                              {item.sku ? (
                                <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
                                  {item.sku}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>

                            <TableCell
                              className={cn(
                                "py-3.5 text-right font-display text-sm font-bold",
                                isLow ? "text-rose-600" : "text-slate-900",
                              )}
                            >
                              {item.currentQuantity}
                            </TableCell>

                            <TableCell className="py-3.5 text-right text-xs text-slate-500">
                              {item.lowStockThreshold > 0 ? item.lowStockThreshold : "—"}
                            </TableCell>

                            <TableCell className="py-3.5 font-mono text-xs font-semibold text-slate-600">
                              {item.unitOfMeasure}
                            </TableCell>

                            <TableCell className="py-3.5">
                              {item.lowStockThreshold > 0 ? (
                                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                  {isLow ? "Estoque Baixo" : "Normal"}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </TableCell>

                            <TableCell className="pr-4 py-3.5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                  >
                                    <MoreHorizontalIcon size={16} />
                                    <span className="sr-only">Opções</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-44 rounded-xl border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                                >
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingItem(item);
                                      setInvFormOpen(true);
                                    }}
                                    className="gap-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-900"
                                  >
                                    <PencilIcon size={14} className="text-primary" />
                                    Editar dados
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-slate-100" />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteConfirmItem(item)}
                                    className="gap-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-700"
                                  >
                                    <Trash2Icon size={14} />
                                    Excluir insumo
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {paginatedInv.map((item) => (
                    <div key={item.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <span className="inline-block mt-0.5 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {TYPE_LABELS[item.type]}
                          </span>
                        </div>
                        <span className="font-display font-bold text-slate-900">
                          {item.currentQuantity} {item.unitOfMeasure}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-semibold text-primary hover:bg-primary/10"
                          onClick={() => {
                            setEditingItem(item);
                            setInvFormOpen(true);
                          }}
                        >
                          <PencilIcon size={13} className="mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          onClick={() => setDeleteConfirmItem(item)}
                        >
                          <Trash2Icon size={13} className="mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <TablePagination
                  filteredCount={filteredInv.length}
                  totalCount={inventoryItems.length}
                  isFiltering={isFilteringInv}
                  currentPage={validInvPage}
                  totalPages={totalInvPages}
                  pageSize={invPageSize}
                  onPageSizeChange={(sz) => {
                    setInvPageSize(sz);
                    setInvPage(1);
                  }}
                  onPageChange={setInvPage}
                  itemLabelSingular="item"
                  itemLabelPlural="itens"
                />
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 3: Lotes e Validade ─────────────────────── */}
        <TabsContent value="lotes" className="space-y-4">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Filtros de Lotes */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {/* Busca */}
                  <div className="relative">
                    <SearchIcon
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar por insumo ou lote..."
                      value={batchSearch}
                      onChange={(e) => {
                        setBatchSearch(e.target.value);
                        setBatchPage(1);
                      }}
                      className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:text-sm"
                    />
                    {batchSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setBatchSearch("");
                          setBatchPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XIcon size={14} />
                      </button>
                    )}
                  </div>

                  {/* Status de Validade */}
                  <Select
                    value={batchStatusFilter}
                    onValueChange={(val) => {
                      setBatchStatusFilter(val);
                      setBatchPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Status de validade" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="all">Todos os lotes</SelectItem>
                      <SelectItem value="expired">Vencidos</SelectItem>
                      <SelectItem value="warning">Vence em breve (&le; 7 dias)</SelectItem>
                      <SelectItem value="ok">No prazo</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Ordenação */}
                  <Select
                    value={batchSort}
                    onValueChange={(val) => {
                      setBatchSort(val);
                      setBatchPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Ordenar..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="EXP_ASC">Validade mais próxima</SelectItem>
                      <SelectItem value="EXP_DESC">Validade mais distante</SelectItem>
                      <SelectItem value="QTY_DESC">Maior Quantidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isFilteringBatches && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearBatchFilters}
                    className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <FilterXIcon size={14} />
                    <span>Limpar</span>
                  </Button>
                )}
              </div>
            </div>

            {filteredBatches.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-2xl bg-primary/10 p-4 text-primary border border-primary/20">
                  <CalendarIcon size={32} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhum lote registrado
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {isFilteringBatches
                    ? "Tente ajustar os filtros de busca para visualizar os lotes."
                    : "Cadastre novos lotes ou dê entrada importando XML de notas fiscais eletrônicas."}
                </p>
                {isFilteringBatches ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearBatchFilters}
                    className="mt-4 gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                  >
                    <FilterXIcon size={14} />
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setBatchDialogOpen(true)}
                    className="mt-4 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                  >
                    <PlusIcon size={14} />
                    Registrar primeiro lote
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="pl-4 text-xs font-semibold text-slate-700">Insumo</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Cód. Lote</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Quantidade</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Unidade</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Fabricação</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Validade</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="w-28 pr-4 text-right text-xs font-semibold text-slate-700">Custo Unit.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {paginatedBatches.map((lote) => {
                        const status = getBatchStatus(lote.expirationDate);

                        return (
                          <TableRow
                            key={lote.id}
                            className="transition-colors hover:bg-slate-50/70"
                          >
                            <TableCell className="pl-4 py-3.5 font-semibold text-slate-900">
                              {lote.inventoryItemName}
                            </TableCell>

                            <TableCell className="py-3.5 font-mono text-xs text-slate-500">
                              {lote.batchCode ? (
                                <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
                                  {lote.batchCode}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>

                            <TableCell className="py-3.5 text-right font-display text-sm font-bold text-slate-900">
                              {lote.quantity}
                            </TableCell>

                            <TableCell className="py-3.5 font-mono text-xs text-slate-600">
                              {lote.inventoryItemUnit}
                            </TableCell>

                            <TableCell className="py-3.5 text-xs text-slate-500">
                              {lote.manufacturingDate
                                ? new Date(lote.manufacturingDate).toLocaleDateString("pt-BR")
                                : "—"}
                            </TableCell>

                            <TableCell className="py-3.5 text-xs font-semibold text-primary">
                              {lote.expirationDate
                                ? new Date(lote.expirationDate).toLocaleDateString("pt-BR")
                                : "—"}
                            </TableCell>

                            <TableCell className="py-3.5">
                              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                {status === "expired"
                                  ? "Vencido"
                                  : status === "warning"
                                    ? "Vence em breve"
                                    : "No prazo"}
                              </span>
                            </TableCell>

                            <TableCell className="pr-4 py-3.5 text-right font-display text-sm font-bold text-slate-900">
                              {lote.unitCost != null ? formatCurrency(lote.unitCost) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {paginatedBatches.map((lote) => {
                    const status = getBatchStatus(lote.expirationDate);
                    return (
                      <div key={lote.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{lote.inventoryItemName}</p>
                            <p className="font-mono text-xs text-slate-400">Lote: {lote.batchCode ?? "—"}</p>
                          </div>
                          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {status === "expired" ? "Vencido" : status === "warning" ? "Vence em breve" : "No prazo"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                          <span>Qtd: <strong>{lote.quantity} {lote.inventoryItemUnit}</strong></span>
                          <span>Validade: <strong className="text-primary">{lote.expirationDate ? new Date(lote.expirationDate).toLocaleDateString("pt-BR") : "—"}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <TablePagination
                  filteredCount={filteredBatches.length}
                  totalCount={lotes.length}
                  isFiltering={isFilteringBatches}
                  currentPage={validBatchPage}
                  totalPages={totalBatchPages}
                  pageSize={batchPageSize}
                  onPageSizeChange={(sz) => {
                    setBatchPageSize(sz);
                    setBatchPage(1);
                  }}
                  onPageChange={setBatchPage}
                  itemLabelSingular="lote"
                  itemLabelPlural="lotes"
                />
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 4: Perdas & Descartes ───────────────────── */}
        <TabsContent value="perdas" className="space-y-4">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Filtros de Perdas */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {/* Busca */}
                  <div className="relative">
                    <SearchIcon
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar por insumo ou observação..."
                      value={lossSearch}
                      onChange={(e) => {
                        setLossSearch(e.target.value);
                        setLossPage(1);
                      }}
                      className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:text-sm"
                    />
                    {lossSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setLossSearch("");
                          setLossPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XIcon size={14} />
                      </button>
                    )}
                  </div>

                  {/* Motivo */}
                  <Select
                    value={lossReasonFilter}
                    onValueChange={(val) => {
                      setLossReasonFilter(val);
                      setLossPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Motivo da perda" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="all">Todos os motivos</SelectItem>
                      {(Object.keys(LOSS_REASON_LABELS) as InventoryLossReason[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {LOSS_REASON_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Ordenação */}
                  <Select
                    value={lossSort}
                    onValueChange={(val) => {
                      setLossSort(val);
                      setLossPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Ordenar..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="DATE_DESC">Mais recentes</SelectItem>
                      <SelectItem value="LOSS_DESC">Maior prejuízo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isFilteringLosses && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearLossFilters}
                    className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <FilterXIcon size={14} />
                    <span>Limpar</span>
                  </Button>
                )}
              </div>
            </div>

            {filteredLosses.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-2xl bg-primary/10 p-4 text-primary border border-primary/20">
                  <CheckCircle2Icon size={32} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhum registro de perda
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {isFilteringLosses
                    ? "Tente ajustar os filtros de busca para visualizar os registros."
                    : "Excelente! Nenhuma ocorrência de perda ou descarte de estoque."}
                </p>
                {isFilteringLosses ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearLossFilters}
                    className="mt-4 gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                  >
                    <FilterXIcon size={14} />
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setLossDialogOpen(true)}
                    className="mt-4 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                  >
                    <AlertTriangleIcon size={14} />
                    Registrar perda
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="pl-4 text-xs font-semibold text-slate-700">Insumo</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Motivo</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Qtd. Perdida</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Unidade</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Prejuízo Financeiro</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Observação</TableHead>
                        <TableHead className="w-32 pr-4 text-right text-xs font-semibold text-slate-700">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {paginatedLosses.map((perda) => (
                        <TableRow
                          key={perda.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <TableCell className="pl-4 py-3.5 font-semibold text-slate-900">
                            {perda.inventoryItemName}
                          </TableCell>

                          <TableCell className="py-3.5">
                            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {LOSS_REASON_LABELS[perda.reason]}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 text-right font-display text-sm font-bold text-slate-900">
                            {perda.quantity}
                          </TableCell>

                          <TableCell className="py-3.5 font-mono text-xs text-slate-600">
                            {perda.inventoryItemUnit}
                          </TableCell>

                          <TableCell className="py-3.5 text-right font-display text-sm font-bold text-slate-900">
                            {formatCurrency(perda.financialLoss)}
                          </TableCell>

                          <TableCell className="py-3.5 text-xs text-slate-500 max-w-xs truncate">
                            {perda.notes ?? "—"}
                          </TableCell>

                          <TableCell className="pr-4 py-3.5 text-right text-xs text-slate-500">
                            {new Date(perda.occurredAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {paginatedLosses.map((perda) => (
                    <div key={perda.id} className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{perda.inventoryItemName}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(perda.occurredAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {LOSS_REASON_LABELS[perda.reason]}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500">
                          Qtd: {perda.quantity} {perda.inventoryItemUnit}
                        </span>
                        <span className="font-display font-bold text-slate-900">
                          Prejuízo: {formatCurrency(perda.financialLoss)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <TablePagination
                  filteredCount={filteredLosses.length}
                  totalCount={perdas.length}
                  isFiltering={isFilteringLosses}
                  currentPage={validLossPage}
                  totalPages={totalLossPages}
                  pageSize={lossPageSize}
                  onPageSizeChange={(sz) => {
                    setLossPageSize(sz);
                    setLossPage(1);
                  }}
                  onPageChange={setLossPage}
                  itemLabelSingular="registro"
                  itemLabelPlural="registros"
                />
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
