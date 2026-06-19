"use client";

import {
  AlertTriangleIcon,
  BoxesIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  ScanLineIcon,
  SearchIcon,
  Trash2Icon,
  WarehouseIcon,
} from "lucide-react";
import { useState, useTransition } from "react";

import { deleteInventoryItemAction, updateStockAction } from "@/app/[slug]/actions";
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
import type { CardapioGestao } from "@/lib/admin-queries";
import type { InventoryItem, InventoryItemType } from "@fsw/db";

import { InventoryFormDialog } from "./inventory-form-dialog";

type ProductWithCategory = CardapioGestao["products"][number];

interface EstoqueClientProps {
  slug: string;
  products: ProductWithCategory[];
  inventoryItems: InventoryItem[];
}

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

export function EstoqueClient({ slug, products, inventoryItems }: EstoqueClientProps) {
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
      </Tabs>
    </div>
  );
}
