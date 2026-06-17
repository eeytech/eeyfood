"use client";

import {
  AlertTriangleIcon,
  BoxesIcon,
  PackageIcon,
  PencilIcon,
  ScanLineIcon,
  SearchIcon,
} from "lucide-react";
import { useState, useTransition } from "react";

import { updateStockAction } from "@/app/[slug]/actions";
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
import type { CardapioGestao } from "@/lib/admin-queries";

type ProductWithCategory = CardapioGestao["products"][number];

interface EstoqueClientProps {
  slug: string;
  products: ProductWithCategory[];
}

export function EstoqueClient({ slug, products }: EstoqueClientProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adjustProduct, setAdjustProduct] =
    useState<ProductWithCategory | null>(null);
  const [isPending, startTransition] = useTransition();

  const lowStockProducts = products.filter(
    (p) => p.trackInventory && p.stockQuantity <= p.lowStockThreshold,
  );

  const categories = Array.from(
    new Map(products.map((p) => [p.categoryId, p.categoryName])).entries(),
  );

  const filtered = products.filter((p) => {
    const matchesSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesCategory =
      categoryFilter === "all" || p.categoryId === categoryFilter;
    const isLow = p.trackInventory && p.stockQuantity <= p.lowStockThreshold;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "low" && isLow) ||
      (statusFilter === "ok" && p.trackInventory && !isLow) ||
      (statusFilter === "untracked" && !p.trackInventory);
    return matchesSearch && matchesCategory && matchesStatus;
  });

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

  return (
    <div className="space-y-4">
      {/* Adjust Stock Dialog */}
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
              <div className="grid grid-cols-3 gap-3 rounded-lg border bg-slate-50 p-4">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Saldo atual
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {adjustProduct.stockQuantity}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Alerta
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {adjustProduct.lowStockThreshold}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    SKU
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {adjustProduct.sku ?? "—"}
                  </p>
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">
                Produtos monitorados
              </p>
              <p className="font-display text-3xl font-semibold">
                {String(products.filter((p) => p.trackInventory).length)}
              </p>
            </div>
            <BoxesIcon className="text-primary" />
          </CardContent>
        </Card>
        <Card className="border-amber-100 bg-amber-50">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-amber-700">Baixo estoque</p>
              <p className="font-display text-3xl font-semibold text-amber-900">
                {String(lowStockProducts.length)}
              </p>
            </div>
            <AlertTriangleIcon className="text-amber-500" />
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Sem controle</p>
              <p className="font-display text-3xl font-semibold">
                {String(products.filter((p) => !p.trackInventory).length)}
              </p>
            </div>
            <ScanLineIcon className="text-slate-500" />
          </CardContent>
        </Card>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold">Estoque</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Ajuste quantidades, acompanhe alertas de ruptura e mantenha o PDV
          pronto para vender sem surpresas.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center">
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
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todas as categorias</option>
              {categories.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todos os status</option>
              <option value="low">Baixo estoque</option>
              <option value="ok">Saldo saudável</option>
              <option value="untracked">Sem controle</option>
            </select>
          </div>
          <span className="shrink-0 text-sm text-muted-foreground">
            {filtered.length}{" "}
            {filtered.length === 1 ? "produto" : "produtos"}
          </span>
        </div>

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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <PackageIcon size={32} className="text-slate-200" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum produto encontrado para os filtros selecionados.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((product) => {
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
                        <Badge
                          variant={
                            product.trackInventory ? "secondary" : "warning"
                          }
                        >
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
    </div>
  );
}
