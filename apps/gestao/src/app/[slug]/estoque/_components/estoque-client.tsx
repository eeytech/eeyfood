"use client";

import {
  AlertTriangleIcon,
  BoxesIcon,
  CalendarIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  ScanLineIcon,
  SearchIcon,
  Trash2Icon,
  TriangleAlertIcon,
  WarehouseIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { criarLoteAction, deleteInventoryItemAction, registrarPerdaAction, updateStockAction } from "@/app/[slug]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const TYPE_VARIANTS: Record<InventoryItemType, "default" | "secondary" | "success" | "warning" | "danger"> = {
  INSUMO: "default",
  EMBALAGEM: "secondary",
  EQUIPAMENTO: "success",
  LIMPEZA: "warning",
  OUTROS: "secondary",
};

export function EstoqueClient({ slug, products, inventoryItems, lotes, perdas }: EstoqueClientProps) {
  // ── Produto Cardápio state ─────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [adjustProduct, setAdjustProduct] = useState<ProductWithCategory | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Inventário state ───────────────────────────────────────────────────────
  const [invSearch, setInvSearch] = useState("");
  const [invTypeFilter, setInvTypeFilter] = useState("all");
  const [invFormOpen, setInvFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<InventoryItem | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  // ── Perdas state ───────────────────────────────────────────────────────────
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [isLossPending, startLossTransition] = useTransition();

  // ── Lotes state ────────────────────────────────────────────────────────────
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [isBatchPending, startBatchTransition] = useTransition();

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

  // ── Produto Cardápio helpers ──────────────────────────────────────────────
  const lowStockProducts = products.filter(
    (p) => p.trackInventory && p.stockQuantity <= p.lowStockThreshold,
  );

  const categories = Array.from(
    new Map(products.map((p) => [p.categoryId, p.categoryName])).entries(),
  );

  const filterBySearch = (list: ProductWithCategory[]) =>
    list.filter((p) => {
      const matchesSearch =
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesCategory =
        categoryFilter === "all" || p.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });

  const allFiltered = filterBySearch(products);
  const lowFiltered = filterBySearch(lowStockProducts);
  const untrackedFiltered = filterBySearch(products.filter((p) => !p.trackInventory));

  const handleAdjust = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjustProduct) return;
    const formData = new FormData(e.currentTarget);
    formData.set("productId", adjustProduct.id);
    startTransition(async () => {
      await updateStockAction(slug, formData);
      setAdjustProduct(null);
    });
  };

  // ── Inventário helpers ────────────────────────────────────────────────────
  const filteredInv = inventoryItems.filter((item) => {
    const matchesSearch =
      invSearch === "" ||
      item.name.toLowerCase().includes(invSearch.toLowerCase()) ||
      (item.sku?.toLowerCase().includes(invSearch.toLowerCase()) ?? false);
    const matchesType = invTypeFilter === "all" || item.type === invTypeFilter;
    return matchesSearch && matchesType;
  });

  const lowStockInv = inventoryItems.filter(
    (i) => i.currentQuantity <= i.lowStockThreshold && i.lowStockThreshold > 0,
  );

  const handleDeleteConfirm = () => {
    if (!deleteConfirmItem) return;
    const id = deleteConfirmItem.id;
    startDeleteTransition(async () => {
      await deleteInventoryItemAction(slug, id);
      setDeleteConfirmItem(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Adjust Product Stock Dialog */}
      <Dialog
        open={adjustProduct !== null}
        onOpenChange={(open) => !open && setAdjustProduct(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar estoque</DialogTitle>
            <DialogDescription>
              {adjustProduct?.categoryName} · {adjustProduct?.name}
            </DialogDescription>
          </DialogHeader>
          {adjustProduct && (
            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="grid grid-cols-3 gap-3 rounded-lg border bg-slate-50 p-3">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Saldo atual</p>
                  <p className="mt-1 text-xl font-semibold">{adjustProduct.stockQuantity}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Alerta</p>
                  <p className="mt-1 text-xl font-semibold">{adjustProduct.lowStockThreshold}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">SKU</p>
                  <p className="mt-1 text-base font-semibold">{adjustProduct.sku ?? "—"}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="stock-qty">Nova quantidade</Label>
                  <Input
                    id="stock-qty"
                    name="stockQuantity"
                    type="number"
                    min="0"
                    defaultValue={String(adjustProduct.stockQuantity)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stock-threshold">Novo alerta</Label>
                  <Input
                    id="stock-threshold"
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    defaultValue={String(adjustProduct.lowStockThreshold)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock-reason">Motivo do ajuste</Label>
                <Input
                  id="stock-reason"
                  name="reason"
                  placeholder="Ex.: Reposição do fornecedor, contagem de estoque..."
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Atualizando..." : "Atualizar estoque"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Inventory Item Dialog */}
      <Dialog
        open={deleteConfirmItem !== null}
        onOpenChange={(open) => !open && setDeleteConfirmItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover item</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{deleteConfirmItem?.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmItem(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? "Removendo..." : "Remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Form Dialog */}
      <InventoryFormDialog
        slug={slug}
        item={editingItem}
        open={invFormOpen}
        onOpenChange={(open) => {
          setInvFormOpen(open);
          if (!open) setEditingItem(null);
        }}
      />

      {/* Loss Registration Dialog */}
      <Dialog open={lossDialogOpen} onOpenChange={setLossDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Desperdício</DialogTitle>
            <DialogDescription>
              Informe o insumo perdido. O estoque será reduzido e a despesa será lançada no financeiro.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startLossTransition(async () => {
                const result = await registrarPerdaAction(slug, fd);
                if (result.success) {
                  toast.success("Perda registrada e estoque atualizado.");
                  setLossDialogOpen(false);
                } else {
                  toast.error(result.error ?? "Erro ao registrar perda.");
                }
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="loss-item">Insumo *</Label>
              <select
                id="loss-item"
                name="inventoryItemId"
                required
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
              >
                <option value="">Selecione o insumo...</option>
                {inventoryItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unitOfMeasure}) — Qtd atual: {i.currentQuantity}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="loss-qty">Quantidade perdida *</Label>
                <Input id="loss-qty" name="quantity" type="number" min="0.001" step="0.001" required placeholder="Ex.: 2.5" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loss-reason">Motivo *</Label>
                <select
                  id="loss-reason"
                  name="reason"
                  required
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                >
                  {(Object.keys(LOSS_REASON_LABELS) as InventoryLossReason[]).map((r) => (
                    <option key={r} value={r}>{LOSS_REASON_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loss-notes">Observação</Label>
              <Input id="loss-notes" name="notes" placeholder="Detalhe opcional sobre a perda..." />
            </div>
            <Button type="submit" className="w-full" disabled={isLossPending}>
              {isLossPending ? "Registrando..." : "Registrar Perda"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch Registration Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Lote</DialogTitle>
            <DialogDescription>
              Cadastre um novo lote de estoque com validade e custo. O custo médio do insumo será recalculado.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startBatchTransition(async () => {
                const result = await criarLoteAction(slug, fd);
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
              <Label htmlFor="batch-item">Insumo *</Label>
              <select
                id="batch-item"
                name="inventoryItemId"
                required
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
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
                <Label htmlFor="batch-qty">Quantidade *</Label>
                <Input id="batch-qty" name="quantity" type="number" min="0.001" step="0.001" required placeholder="Ex.: 10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch-cost">Custo unitário</Label>
                <Input id="batch-cost" name="unitCost" type="number" min="0" step="0.01" placeholder="Ex.: 4.50" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="batch-mfg">Fabricação</Label>
                <Input id="batch-mfg" name="manufacturingDate" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch-exp">Validade</Label>
                <Input id="batch-exp" name="expirationDate" type="date" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="batch-code">Código do lote</Label>
              <Input id="batch-code" name="batchCode" placeholder="Ex.: LOT-2024-001" />
            </div>
            <Button type="submit" className="w-full" disabled={isBatchPending}>
              {isBatchPending ? "Registrando..." : "Registrar Lote"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Page Header */}
      <div>
        <h1 className="font-display text-xl font-semibold">Estoque</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Controle o estoque dos produtos do cardápio e gerencie insumos, embalagens e materiais internos.
        </p>
      </div>

      {/* Outer Tabs */}
      <Tabs defaultValue="cardapio">
        <TabsList>
          <TabsTrigger value="cardapio" className="gap-1.5">
            <PackageIcon size={14} />
            Produtos do Cardápio
          </TabsTrigger>
          <TabsTrigger value="inventario" className="gap-1.5">
            <WarehouseIcon size={14} />
            Inventário e Bastidores
            {lowStockInv.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-px text-[10px] font-bold text-white">
                {lowStockInv.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="lotes" className="gap-1.5">
            <CalendarIcon size={14} />
            Lotes e Validade
            {lotes.filter((l) => getBatchStatus(l.expirationDate) !== "ok").length > 0 && (
              <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-px text-[10px] font-bold text-white">
                {lotes.filter((l) => getBatchStatus(l.expirationDate) !== "ok").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="perdas" className="gap-1.5">
            <TriangleAlertIcon size={14} />
            Perdas
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Produtos do Cardápio ─────────────────────────────────── */}
        <TabsContent value="cardapio" className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-white/80 bg-white/90">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Produtos monitorados</p>
                  <p className="font-display text-xl font-semibold">
                    {products.filter((p) => p.trackInventory).length}
                  </p>
                </div>
                <BoxesIcon className="text-primary" size={20} />
              </CardContent>
            </Card>
            <Card className="border-amber-100 bg-amber-50">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-amber-700">Baixo estoque</p>
                  <p className="font-display text-xl font-semibold text-amber-900">
                    {lowStockProducts.length}
                  </p>
                </div>
                <AlertTriangleIcon className="text-amber-500" size={20} />
              </CardContent>
            </Card>
            <Card className="border-white/80 bg-white/90">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Sem controle</p>
                  <p className="font-display text-xl font-semibold">
                    {products.filter((p) => !p.trackInventory).length}
                  </p>
                </div>
                <ScanLineIcon className="text-slate-500" size={20} />
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-xs flex-1">
              <SearchIcon
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Buscar produto ou SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 rounded-md pl-8"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-white px-3 text-sm"
            >
              <option value="all">Todas as categorias</option>
              {categories.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Inner Tabs */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Todos ({allFiltered.length})</TabsTrigger>
              <TabsTrigger value="low">
                <AlertTriangleIcon size={13} />
                Baixo Estoque ({lowFiltered.length})
              </TabsTrigger>
              <TabsTrigger value="untracked">Sem Controle ({untrackedFiltered.length})</TabsTrigger>
            </TabsList>

            {[
              { value: "all", data: allFiltered },
              { value: "low", data: lowFiltered },
              { value: "untracked", data: untrackedFiltered },
            ].map(({ value, data }) => (
              <TabsContent key={value} value={value} className="mt-3">
                <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                          <TableHead className="text-right">Alerta</TableHead>
                          <TableHead>Controle</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-16 text-right">Ajustar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <PackageIcon size={24} className="text-slate-200" />
                                <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.map((product) => {
                            const isLow =
                              product.trackInventory &&
                              product.stockQuantity <= product.lowStockThreshold;

                            return (
                              <TableRow key={product.id}>
                                <TableCell>
                                  <span className="font-medium">{product.name}</span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {product.categoryName}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {product.sku ?? "—"}
                                </TableCell>
                                <TableCell
                                  className={`text-right font-semibold ${isLow ? "text-rose-600" : ""}`}
                                >
                                  {product.stockQuantity}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {product.lowStockThreshold}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={product.trackInventory ? "secondary" : "warning"}>
                                    {product.trackInventory ? "Monitorado" : "Sem controle"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {product.trackInventory ? (
                                    <Badge variant={isLow ? "danger" : "success"}>
                                      {isLow ? "Baixo" : "Saudável"}
                                    </Badge>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setAdjustProduct(product)}
                                    >
                                      <PencilIcon size={14} />
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
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* ── Tab: Inventário e Bastidores ──────────────────────────────── */}
        <TabsContent value="inventario" className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-white/80 bg-white/90">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Itens cadastrados</p>
                  <p className="font-display text-xl font-semibold">{inventoryItems.length}</p>
                </div>
                <WarehouseIcon className="text-primary" size={20} />
              </CardContent>
            </Card>
            <Card className="border-amber-100 bg-amber-50">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-amber-700">Baixo estoque</p>
                  <p className="font-display text-xl font-semibold text-amber-900">
                    {lowStockInv.length}
                  </p>
                </div>
                <AlertTriangleIcon className="text-amber-500" size={20} />
              </CardContent>
            </Card>
            <Card className="border-white/80 bg-white/90">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tipos distintos</p>
                  <p className="font-display text-xl font-semibold">
                    {new Set(inventoryItems.map((i) => i.type)).size}
                  </p>
                </div>
                <BoxesIcon className="text-slate-500" size={20} />
              </CardContent>
            </Card>
          </div>

          {/* Filters + New */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative max-w-xs flex-1">
              <SearchIcon
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Buscar item ou SKU..."
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                className="h-9 rounded-md pl-8"
              />
            </div>
            <select
              value={invTypeFilter}
              onChange={(e) => setInvTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-white px-3 text-sm"
            >
              <option value="all">Todos os tipos</option>
              {(Object.keys(TYPE_LABELS) as InventoryItemType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditingItem(null);
                setInvFormOpen(true);
              }}
            >
              <PlusIcon size={15} />
              Novo item
            </Button>
          </div>

          {/* Inventory Table */}
          <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qtd. atual</TableHead>
                    <TableHead className="text-right">Alerta</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInv.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <WarehouseIcon size={28} className="text-slate-200" />
                          <p className="text-sm text-muted-foreground">
                            {inventoryItems.length === 0
                              ? 'Nenhum item cadastrado. Clique em "Novo item" para começar.'
                              : "Nenhum item encontrado com os filtros atuais."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInv.map((item) => {
                      const isLow =
                        item.lowStockThreshold > 0 &&
                        item.currentQuantity <= item.lowStockThreshold;

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{item.name}</span>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={TYPE_VARIANTS[item.type]}>
                              {TYPE_LABELS[item.type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {item.sku ?? "—"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${isLow ? "text-rose-600" : ""}`}
                          >
                            {item.currentQuantity}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.lowStockThreshold > 0 ? item.lowStockThreshold : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {item.unitOfMeasure}
                          </TableCell>
                          <TableCell>
                            {isLow ? (
                              <Badge variant="danger">Baixo</Badge>
                            ) : (
                              <Badge variant="success">Saudável</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
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
                                className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
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
          </div>
        </TabsContent>
        {/* ── Tab: Lotes e Validade ─────────────────────────────────── */}
        <TabsContent value="lotes" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Card className="border-rose-100 bg-rose-50">
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <AlertTriangleIcon className="text-rose-500" size={16} />
                  <div>
                    <p className="text-xs text-rose-700">Vencidos</p>
                    <p className="font-display font-semibold text-rose-900">
                      {lotes.filter((l) => getBatchStatus(l.expirationDate) === "expired").length}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-100 bg-amber-50">
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <AlertTriangleIcon className="text-amber-500" size={16} />
                  <div>
                    <p className="text-xs text-amber-700">Vence em 7 dias</p>
                    <p className="font-display font-semibold text-amber-900">
                      {lotes.filter((l) => getBatchStatus(l.expirationDate) === "warning").length}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/80 bg-white/90">
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <BoxesIcon className="text-slate-500" size={16} />
                  <div>
                    <p className="text-xs text-muted-foreground">Total de lotes</p>
                    <p className="font-display font-semibold">{lotes.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setBatchDialogOpen(true)}>
              <PlusIcon size={14} />
              Novo Lote
            </Button>
          </div>

          {lotes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <CalendarIcon size={32} className="text-slate-200" />
              <p className="text-sm text-muted-foreground">Nenhum lote cadastrado. Importe uma NF-e ou registre manualmente.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Cód. Lote</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Fabricação</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => {
                      const status = getBatchStatus(lote.expirationDate);
                      return (
                        <TableRow key={lote.id} className={status === "expired" ? "bg-rose-50/50" : status === "warning" ? "bg-amber-50/50" : ""}>
                          <TableCell className="font-medium">{lote.inventoryItemName}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{lote.batchCode ?? "—"}</TableCell>
                          <TableCell className="text-right font-semibold">{lote.quantity}</TableCell>
                          <TableCell className="font-mono text-xs">{lote.inventoryItemUnit}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {lote.manufacturingDate ? new Date(lote.manufacturingDate).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell className={`text-sm font-medium ${status === "expired" ? "text-rose-600" : status === "warning" ? "text-amber-600" : ""}`}>
                            {lote.expirationDate ? new Date(lote.expirationDate).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell>
                            {status === "expired" && <Badge variant="danger">Vencido</Badge>}
                            {status === "warning" && <Badge variant="warning">Vence em breve</Badge>}
                            {status === "ok" && <Badge variant="success">OK</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            {lote.unitCost != null
                              ? lote.unitCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Perdas ────────────────────────────────────────────── */}
        <TabsContent value="perdas" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Card className="border-rose-100 bg-rose-50">
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <TriangleAlertIcon className="text-rose-500" size={16} />
                  <div>
                    <p className="text-xs text-rose-700">Prejuízo total</p>
                    <p className="font-display font-semibold text-rose-900">
                      {perdas.reduce((acc, p) => acc + p.financialLoss, 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/80 bg-white/90">
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <BoxesIcon className="text-slate-500" size={16} />
                  <div>
                    <p className="text-xs text-muted-foreground">Registros</p>
                    <p className="font-display font-semibold">{perdas.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setLossDialogOpen(true)}>
              <PlusIcon size={14} />
              Registrar Desperdício
            </Button>
          </div>

          {perdas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <TriangleAlertIcon size={32} className="text-slate-200" />
              <p className="text-sm text-muted-foreground">Nenhuma perda registrada.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Qtd. Perdida</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Prejuízo</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perdas.map((perda) => (
                      <TableRow key={perda.id}>
                        <TableCell className="font-medium">{perda.inventoryItemName}</TableCell>
                        <TableCell>
                          <Badge variant={perda.reason === "VENCIDO" ? "danger" : "warning"}>
                            {LOSS_REASON_LABELS[perda.reason]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-rose-600">{perda.quantity}</TableCell>
                        <TableCell className="font-mono text-xs">{perda.inventoryItemUnit}</TableCell>
                        <TableCell className="text-right font-semibold text-rose-600">
                          {perda.financialLoss.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{perda.notes ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(perda.occurredAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
