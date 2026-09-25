"use client";

import {
  AlertTriangleIcon,
  BoxesIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterXIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  ScanLineIcon,
  SearchIcon,
  Trash2Icon,
  WarehouseIcon,
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
  DropdownMenuLabel,
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
  const [productPage, setProductPage] = useState(1);
  const productPageSize = 10;
  const [adjustProduct, setAdjustProduct] = useState<ProductWithCategory | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Inventário state ───────────────────────────────────────────────────────
  const [invSearch, setInvSearch] = useState("");
  const [invTypeFilter, setInvTypeFilter] = useState("all");
  const [invPage, setInvPage] = useState(1);
  const invPageSize = 10;
  const [invFormOpen, setInvFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<InventoryItem | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  // ── Perdas state ───────────────────────────────────────────────────────────
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [isLossPending, startLossTransition] = useTransition();
  const [lossPage, setLossPage] = useState(1);
  const lossPageSize = 10;

  // ── Lotes state ────────────────────────────────────────────────────────────
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [isBatchPending, startBatchTransition] = useTransition();
  const [batchPage, setBatchPage] = useState(1);
  const batchPageSize = 10;

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
    return products.filter((p) => {
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
    });
  }, [products, search, categoryFilter, productTrackFilter]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));
  const validProductPage = Math.min(productPage, totalProductPages);
  const paginatedProducts = useMemo(() => {
    const start = (validProductPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, validProductPage, productPageSize]);

  const isFilteringProducts =
    search.trim() !== "" || categoryFilter !== "all" || productTrackFilter !== "all";

  const handleClearProductFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setProductTrackFilter("all");
    setProductPage(1);
  };

  // ── Inventário Filtering & Pagination ──────────────────────────────────────
  const filteredInv = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch =
        invSearch.trim() === "" ||
        item.name.toLowerCase().includes(invSearch.toLowerCase().trim()) ||
        (item.sku?.toLowerCase().includes(invSearch.toLowerCase().trim()) ?? false);

      const matchesType = invTypeFilter === "all" || item.type === invTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [inventoryItems, invSearch, invTypeFilter]);

  const totalInvPages = Math.max(1, Math.ceil(filteredInv.length / invPageSize));
  const validInvPage = Math.min(invPage, totalInvPages);
  const paginatedInv = useMemo(() => {
    const start = (validInvPage - 1) * invPageSize;
    return filteredInv.slice(start, start + invPageSize);
  }, [filteredInv, validInvPage, invPageSize]);

  const isFilteringInv = invSearch.trim() !== "" || invTypeFilter !== "all";

  const handleClearInvFilters = () => {
    setInvSearch("");
    setInvTypeFilter("all");
    setInvPage(1);
  };

  // ── Lotes Pagination ───────────────────────────────────────────────────────
  const totalBatchPages = Math.max(1, Math.ceil(lotes.length / batchPageSize));
  const validBatchPage = Math.min(batchPage, totalBatchPages);
  const paginatedBatches = useMemo(() => {
    const start = (validBatchPage - 1) * batchPageSize;
    return lotes.slice(start, start + batchPageSize);
  }, [lotes, validBatchPage, batchPageSize]);

  // ── Perdas Pagination ──────────────────────────────────────────────────────
  const totalLossPages = Math.max(1, Math.ceil(perdas.length / lossPageSize));
  const validLossPage = Math.min(lossPage, totalLossPages);
  const paginatedLosses = useMemo(() => {
    const start = (validLossPage - 1) * lossPageSize;
    return perdas.slice(start, start + lossPageSize);
  }, [perdas, validLossPage, lossPageSize]);

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
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
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
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
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
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustProduct(null)}
                  className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-10 rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  {isPending ? "Atualizando..." : "Salvar Saldo"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Exclusão de Insumo ────────── */}
      <Dialog
        open={deleteConfirmItem !== null}
        onOpenChange={(open) => !open && setDeleteConfirmItem(null)}
      >
        <DialogContent className="border-slate-200 bg-white shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Excluir item de inventário
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Tem certeza que deseja excluir <strong>{deleteConfirmItem?.name}</strong>?
              Esta ação removerá o insumo do controle de estoque.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmItem(null)}
              className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="h-10 rounded-full text-xs font-semibold"
            >
              {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
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
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
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
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLossDialogOpen(false)}
                className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isLossPending}
                className="h-10 rounded-full px-5 text-xs font-semibold"
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
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
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
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
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
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-sm focus:bg-white"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBatchDialogOpen(false)}
                className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isBatchPending}
                className="h-10 rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <BoxesIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Controle de Estoque & Insumos
            </h1>
            <p className="text-sm text-slate-500">
              Monitore o saldo dos produtos do cardápio, gerencie insumos e controle validades e perdas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setLossDialogOpen(true)}
            className="h-10 gap-2 rounded-full border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100"
          >
            <AlertTriangleIcon size={14} />
            <span>Registrar Perda</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setBatchDialogOpen(true)}
            className="h-10 gap-2 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <PlusIcon size={14} />
            <span>Novo Lote</span>
          </Button>

          <Button
            onClick={() => {
              setEditingItem(null);
              setInvFormOpen(true);
            }}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <PlusIcon size={16} />
            <span>Novo Insumo</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Insumos & Produtos */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Itens no Inventário
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <WarehouseIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {inventoryItems.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              + {products.filter((p) => p.trackInventory).length} produtos rastreados
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Alertas de Baixo Estoque */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Estoque Baixo
              </span>
              <div
                className={cn(
                  "rounded-lg p-1.5",
                  totalLowStockAlerts > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700",
                )}
              >
                <AlertTriangleIcon size={16} />
              </div>
            </div>
            <p
              className={cn(
                "mt-2 font-display text-2xl font-bold",
                totalLowStockAlerts > 0 ? "text-amber-700" : "text-emerald-700",
              )}
            >
              {totalLowStockAlerts}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalLowStockAlerts === 0 ? "Nenhum item em falta" : "Abaixo da quantidade mínima"}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Validades & Lotes em Risco */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Alerta de Validade
              </span>
              <div
                className={cn(
                  "rounded-lg p-1.5",
                  expiringBatches.length > 0
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-700",
                )}
              >
                <CalendarIcon size={16} />
              </div>
            </div>
            <p
              className={cn(
                "mt-2 font-display text-2xl font-bold",
                expiringBatches.length > 0 ? "text-rose-700" : "text-emerald-700",
              )}
            >
              {expiringBatches.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {expiringBatches.length === 0 ? "Lotes dentro do prazo" : "Vencidos ou vencendo em 7 dias"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Prejuízo Acumulado */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Perdas Acumuladas
              </span>
              <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {formatCurrency(totalFinancialLoss)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {perdas.length} registros de desperdício
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Pill Tabs ───────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
          <TabsTrigger
            value="cardapio"
            className="gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <PackageIcon size={14} />
            <span>Produtos do Cardápio</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              {products.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="inventario"
            className="gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <WarehouseIcon size={14} />
            <span>Inventário e Bastidores</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                lowStockInv.length > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200/80 text-slate-700",
              )}
            >
              {inventoryItems.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="lotes"
            className="gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <CalendarIcon size={14} />
            <span>Lotes e Validade</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                expiringBatches.length > 0
                  ? "bg-rose-100 text-rose-800"
                  : "bg-slate-200/80 text-slate-700",
              )}
            >
              {lotes.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="perdas"
            className="gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <AlertTriangleIcon size={14} />
            <span>Perdas & Descartes</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              {perdas.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Produtos do Cardápio ─────────────────── */}
        <TabsContent value="cardapio" className="space-y-4">
          {/* Card de Filtros */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div className="relative">
                    <SearchIcon
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar por nome ou SKU..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setProductPage(1);
                      }}
                      className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 text-xs transition-colors focus:bg-white sm:text-sm"
                    />
                  </div>

                  <Select
                    value={categoryFilter}
                    onValueChange={(val) => {
                      setCategoryFilter(val);
                      setProductPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs sm:text-sm">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white">
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categories.map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={productTrackFilter}
                    onValueChange={(val) => {
                      setProductTrackFilter(val);
                      setProductPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs sm:text-sm">
                      <SelectValue placeholder="Controle de estoque" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white">
                      <SelectItem value="all">Todos os produtos</SelectItem>
                      <SelectItem value="tracked">Rastreados</SelectItem>
                      <SelectItem value="low">Baixo Estoque</SelectItem>
                      <SelectItem value="untracked">Sem Controle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  {isFilteringProducts && (
                    <Button
                      variant="ghost"
                      onClick={handleClearProductFilters}
                      className="h-10 gap-1.5 rounded-xl px-3 text-xs text-slate-500 hover:text-slate-900"
                    >
                      <FilterXIcon size={14} />
                      <span>Limpar</span>
                    </Button>
                  )}

                  <span className="text-xs font-medium text-slate-500">
                    {filteredProducts.length}{" "}
                    {filteredProducts.length === 1 ? "produto" : "produtos"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Produtos */}
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200/80 hover:bg-transparent">
                    <TableHead className="pl-4 font-semibold text-slate-700">Produto</TableHead>
                    <TableHead className="font-semibold text-slate-700">Categoria</TableHead>
                    <TableHead className="font-semibold text-slate-700">SKU</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Saldo Atual</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Alerta Mínimo</TableHead>
                    <TableHead className="font-semibold text-slate-700">Rastreio</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="w-20 pr-4 text-right font-semibold text-slate-700">Ajustar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <PackageIcon size={32} className="text-slate-400" />
                          <p className="text-sm font-medium">Nenhum produto encontrado</p>
                          <p className="text-xs text-slate-400">
                            Tente ajustar os filtros de busca aplicados.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProducts.map((product) => {
                      const isLow =
                        product.trackInventory &&
                        product.stockQuantity <= product.lowStockThreshold;

                      return (
                        <TableRow
                          key={product.id}
                          className="border-slate-100 transition-colors hover:bg-slate-50/70"
                        >
                          <TableCell className="pl-4 py-3 font-semibold text-slate-900">
                            {product.name}
                          </TableCell>

                          <TableCell className="py-3 text-slate-600">
                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {product.categoryName}
                            </span>
                          </TableCell>

                          <TableCell className="py-3 font-mono text-xs text-slate-500">
                            {product.sku ?? "—"}
                          </TableCell>

                          <TableCell
                            className={cn(
                              "py-3 text-right font-display text-sm font-bold",
                              isLow ? "text-rose-600" : "text-slate-900",
                            )}
                          >
                            {product.stockQuantity} un
                          </TableCell>

                          <TableCell className="py-3 text-right text-xs text-slate-500">
                            {product.lowStockThreshold} un
                          </TableCell>

                          <TableCell className="py-3">
                            <Badge
                              variant={product.trackInventory ? "secondary" : "warning"}
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                            >
                              {product.trackInventory ? "Monitorado" : "Sem controle"}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3">
                            {product.trackInventory ? (
                              <Badge
                                variant={isLow ? "danger" : "success"}
                                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              >
                                {isLow ? "Baixo Estoque" : "Saudável"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="pr-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                              onClick={() => setAdjustProduct(product)}
                            >
                              <PencilIcon size={14} />
                              <span>Ajustar</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Nenhum produto encontrado.</div>
              ) : (
                paginatedProducts.map((product) => {
                  const isLow =
                    product.trackInventory &&
                    product.stockQuantity <= product.lowStockThreshold;

                  return (
                    <div key={product.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.categoryName}</p>
                        </div>
                        <Badge
                          variant={
                            product.trackInventory
                              ? isLow
                                ? "danger"
                                : "success"
                              : "secondary"
                          }
                          className="rounded-full text-[10px]"
                        >
                          {product.trackInventory
                            ? isLow
                              ? "Baixo"
                              : "Saudável"
                            : "Sem controle"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500">
                          Saldo: <strong>{product.stockQuantity} un</strong> (Alerta: {product.lowStockThreshold} un)
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setAdjustProduct(product)}
                        >
                          <PencilIcon size={13} className="mr-1" />
                          Ajustar
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalProductPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-6">
                <span className="text-xs text-slate-500">
                  Página <strong>{validProductPage}</strong> de{" "}
                  <strong>{totalProductPages}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    disabled={validProductPage <= 1}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <ChevronLeftIcon size={14} />
                    <span>Anterior</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                    disabled={validProductPage >= totalProductPages}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <span>Próxima</span>
                    <ChevronRightIcon size={14} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 2: Inventário e Bastidores ─────────────── */}
        <TabsContent value="inventario" className="space-y-4">
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="relative">
                    <SearchIcon
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar item ou SKU..."
                      value={invSearch}
                      onChange={(e) => {
                        setInvSearch(e.target.value);
                        setInvPage(1);
                      }}
                      className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 text-xs transition-colors focus:bg-white sm:text-sm"
                    />
                  </div>

                  <Select
                    value={invTypeFilter}
                    onValueChange={(val) => {
                      setInvTypeFilter(val);
                      setInvPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs sm:text-sm">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white">
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {(Object.keys(TYPE_LABELS) as InventoryItemType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  {isFilteringInv && (
                    <Button
                      variant="ghost"
                      onClick={handleClearInvFilters}
                      className="h-10 gap-1.5 rounded-xl px-3 text-xs text-slate-500 hover:text-slate-900"
                    >
                      <FilterXIcon size={14} />
                      <span>Limpar</span>
                    </Button>
                  )}

                  <span className="text-xs font-medium text-slate-500">
                    {filteredInv.length}{" "}
                    {filteredInv.length === 1 ? "item" : "itens"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200/80 hover:bg-transparent">
                    <TableHead className="pl-4 font-semibold text-slate-700">Nome</TableHead>
                    <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                    <TableHead className="font-semibold text-slate-700">SKU</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Qtd. Atual</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Alerta Mínimo</TableHead>
                    <TableHead className="font-semibold text-slate-700">Unidade</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="w-24 pr-4 text-right font-semibold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInv.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <WarehouseIcon size={32} className="text-slate-400" />
                          <p className="text-sm font-medium">Nenhum item encontrado</p>
                          <p className="text-xs text-slate-400">
                            Cadastre insumos e embalagens para controlar o consumo interno.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedInv.map((item) => {
                      const isLow =
                        item.lowStockThreshold > 0 &&
                        item.currentQuantity <= item.lowStockThreshold;

                      return (
                        <TableRow
                          key={item.id}
                          className="border-slate-100 transition-colors hover:bg-slate-50/70"
                        >
                          <TableCell className="pl-4 py-3 font-semibold text-slate-900">
                            {item.name}
                            {item.description && (
                              <p className="text-xs font-normal text-slate-400 truncate max-w-xs">
                                {item.description}
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {TYPE_LABELS[item.type]}
                            </span>
                          </TableCell>

                          <TableCell className="py-3 font-mono text-xs text-slate-500">
                            {item.sku ?? "—"}
                          </TableCell>

                          <TableCell
                            className={cn(
                              "py-3 text-right font-display text-sm font-bold",
                              isLow ? "text-rose-600" : "text-slate-900",
                            )}
                          >
                            {item.currentQuantity}
                          </TableCell>

                          <TableCell className="py-3 text-right text-xs text-slate-500">
                            {item.lowStockThreshold > 0 ? item.lowStockThreshold : "—"}
                          </TableCell>

                          <TableCell className="py-3 font-mono text-xs font-semibold text-slate-600">
                            {item.unitOfMeasure}
                          </TableCell>

                          <TableCell className="py-3">
                            {item.lowStockThreshold > 0 ? (
                              <Badge
                                variant={isLow ? "danger" : "success"}
                                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              >
                                {isLow ? "Estoque Baixo" : "Normal"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="pr-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                onClick={() => {
                                  setEditingItem(item);
                                  setInvFormOpen(true);
                                }}
                              >
                                <PencilIcon size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => setDeleteConfirmItem(item)}
                              >
                                <Trash2Icon size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedInv.map((item) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{TYPE_LABELS[item.type]}</p>
                    </div>
                    <span className="font-display font-bold text-slate-900">
                      {item.currentQuantity} {item.unitOfMeasure}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setEditingItem(item);
                        setInvFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => setDeleteConfirmItem(item)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {totalInvPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-6">
                <span className="text-xs text-slate-500">
                  Página <strong>{validInvPage}</strong> de{" "}
                  <strong>{totalInvPages}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                    disabled={validInvPage <= 1}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <ChevronLeftIcon size={14} />
                    <span>Anterior</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInvPage((p) => Math.min(totalInvPages, p + 1))}
                    disabled={validInvPage >= totalInvPages}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <span>Próxima</span>
                    <ChevronRightIcon size={14} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 3: Lotes e Validade ─────────────────────── */}
        <TabsContent value="lotes" className="space-y-4">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200/80 hover:bg-transparent">
                    <TableHead className="pl-4 font-semibold text-slate-700">Insumo</TableHead>
                    <TableHead className="font-semibold text-slate-700">Cód. Lote</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Quantidade</TableHead>
                    <TableHead className="font-semibold text-slate-700">Unidade</TableHead>
                    <TableHead className="font-semibold text-slate-700">Fabricação</TableHead>
                    <TableHead className="font-semibold text-slate-700">Validade</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="w-24 pr-4 text-right font-semibold text-slate-700">Custo Unit.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <CalendarIcon size={32} className="text-slate-400" />
                          <p className="text-sm font-medium">Nenhum lote registrado</p>
                          <p className="text-xs text-slate-400">
                            Cadastre novos lotes ou dê entrada importando XML de notas fiscais.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedBatches.map((lote) => {
                      const status = getBatchStatus(lote.expirationDate);

                      return (
                        <TableRow
                          key={lote.id}
                          className={cn(
                            "border-slate-100 transition-colors hover:bg-slate-50/70",
                            status === "expired" ? "bg-rose-50/40" : status === "warning" ? "bg-amber-50/40" : "",
                          )}
                        >
                          <TableCell className="pl-4 py-3 font-semibold text-slate-900">
                            {lote.inventoryItemName}
                          </TableCell>

                          <TableCell className="py-3 font-mono text-xs text-slate-500">
                            {lote.batchCode ?? "—"}
                          </TableCell>

                          <TableCell className="py-3 text-right font-display text-sm font-bold text-slate-900">
                            {lote.quantity}
                          </TableCell>

                          <TableCell className="py-3 font-mono text-xs text-slate-600">
                            {lote.inventoryItemUnit}
                          </TableCell>

                          <TableCell className="py-3 text-xs text-slate-500">
                            {lote.manufacturingDate
                              ? new Date(lote.manufacturingDate).toLocaleDateString("pt-BR")
                              : "—"}
                          </TableCell>

                          <TableCell
                            className={cn(
                              "py-3 text-xs font-semibold",
                              status === "expired"
                                ? "text-rose-600"
                                : status === "warning"
                                  ? "text-amber-600"
                                  : "text-slate-700",
                            )}
                          >
                            {lote.expirationDate
                              ? new Date(lote.expirationDate).toLocaleDateString("pt-BR")
                              : "—"}
                          </TableCell>

                          <TableCell className="py-3">
                            {status === "expired" && (
                              <Badge variant="danger" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                                Vencido
                              </Badge>
                            )}
                            {status === "warning" && (
                              <Badge variant="warning" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                                Vence em breve
                              </Badge>
                            )}
                            {status === "ok" && (
                              <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                                No prazo
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="pr-4 py-3 text-right font-display text-xs font-semibold text-slate-700">
                            {lote.unitCost != null ? formatCurrency(lote.unitCost) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
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
                      <Badge
                        variant={status === "expired" ? "danger" : status === "warning" ? "warning" : "success"}
                        className="rounded-full text-[10px]"
                      >
                        {status === "expired" ? "Vencido" : status === "warning" ? "Vence em breve" : "OK"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Qtd: <strong>{lote.quantity} {lote.inventoryItemUnit}</strong></span>
                      <span>Validade: {lote.expirationDate ? new Date(lote.expirationDate).toLocaleDateString("pt-BR") : "—"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalBatchPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-6">
                <span className="text-xs text-slate-500">
                  Página <strong>{validBatchPage}</strong> de{" "}
                  <strong>{totalBatchPages}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBatchPage((p) => Math.max(1, p - 1))}
                    disabled={validBatchPage <= 1}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <ChevronLeftIcon size={14} />
                    <span>Anterior</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBatchPage((p) => Math.min(totalBatchPages, p + 1))}
                    disabled={validBatchPage >= totalBatchPages}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <span>Próxima</span>
                    <ChevronRightIcon size={14} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 4: Perdas & Descartes ───────────────────── */}
        <TabsContent value="perdas" className="space-y-4">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200/80 hover:bg-transparent">
                    <TableHead className="pl-4 font-semibold text-slate-700">Insumo</TableHead>
                    <TableHead className="font-semibold text-slate-700">Motivo</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Qtd. Perdida</TableHead>
                    <TableHead className="font-semibold text-slate-700">Unidade</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Prejuízo Financeiro</TableHead>
                    <TableHead className="font-semibold text-slate-700">Observação</TableHead>
                    <TableHead className="w-28 pr-4 font-semibold text-slate-700">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLosses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <CheckCircle2Icon size={32} className="text-emerald-500" />
                          <p className="text-sm font-medium">Nenhum desperdício registrado</p>
                          <p className="text-xs text-slate-400">
                            Excelente! Nenhuma ocorrência de perda ou descarte de estoque.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLosses.map((perda) => (
                      <TableRow
                        key={perda.id}
                        className="border-slate-100 transition-colors hover:bg-slate-50/70"
                      >
                        <TableCell className="pl-4 py-3 font-semibold text-slate-900">
                          {perda.inventoryItemName}
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge
                            variant={perda.reason === "VENCIDO" ? "danger" : "warning"}
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          >
                            {LOSS_REASON_LABELS[perda.reason]}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 text-right font-display text-sm font-bold text-rose-600">
                          {perda.quantity}
                        </TableCell>

                        <TableCell className="py-3 font-mono text-xs text-slate-600">
                          {perda.inventoryItemUnit}
                        </TableCell>

                        <TableCell className="py-3 text-right font-display text-sm font-bold text-rose-600">
                          {formatCurrency(perda.financialLoss)}
                        </TableCell>

                        <TableCell className="py-3 text-xs text-slate-500 max-w-xs truncate">
                          {perda.notes ?? "—"}
                        </TableCell>

                        <TableCell className="pr-4 py-3 text-xs text-slate-500">
                          {new Date(perda.occurredAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                    <Badge
                      variant={perda.reason === "VENCIDO" ? "danger" : "warning"}
                      className="rounded-full text-[10px]"
                    >
                      {LOSS_REASON_LABELS[perda.reason]}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">
                      Qtd: {perda.quantity} {perda.inventoryItemUnit}
                    </span>
                    <span className="font-display font-bold text-rose-600">
                      Prejuízo: {formatCurrency(perda.financialLoss)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {totalLossPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-6">
                <span className="text-xs text-slate-500">
                  Página <strong>{validLossPage}</strong> de{" "}
                  <strong>{totalLossPages}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLossPage((p) => Math.max(1, p - 1))}
                    disabled={validLossPage <= 1}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <ChevronLeftIcon size={14} />
                    <span>Anterior</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLossPage((p) => Math.min(totalLossPages, p + 1))}
                    disabled={validLossPage >= totalLossPages}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <span>Próxima</span>
                    <ChevronRightIcon size={14} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
