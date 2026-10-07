"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterXIcon,
  Layers3Icon,
  ListPlusIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  Trash2Icon,
  UtensilsCrossedIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  deleteCategoryAction,
  deleteProductAction,
} from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { CardapioGestao, CategoriaComProdutos } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";
import type { Product } from "@fsw/db";

import { CategoryForm } from "./category-form";
import { GlobalOptionGroupsManager } from "./global-option-groups-manager";
import { ProductForm } from "./product-form";

type ProductWithCategory = Product & { categoryId: string; categoryName: string };

interface CardapioClientProps {
  slug: string;
  cardapio: CardapioGestao;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function CardapioClient({ slug, cardapio }: CardapioClientProps) {
  // ── Tabs state ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("products");

  // ── Products filtering & pagination ─────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [productPage, setProductPage] = useState(1);
  const productPageSize = 10;

  // ── Categories filtering & pagination ───────────────────
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryStatusFilter, setCategoryStatusFilter] = useState("all");
  const [categoryPage, setCategoryPage] = useState(1);
  const categoryPageSize = 10;

  // ── Dialogs ─────────────────────────────────────────────
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductWithCategory | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<{ id: string; name: string } | null>(null);

  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoriaComProdutos | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string } | null>(null);

  const [isPending, startTransition] = useTransition();

  // ── Metrics Calculation ─────────────────────────────────
  const totalProducts = cardapio.products.length;
  const activeProducts = cardapio.products.filter((p) => p.isActive).length;
  const totalCategories = cardapio.categories.length;
  const activeCategories = cardapio.categories.filter((c) => c.isActive).length;
  const lowStockProducts = cardapio.products.filter(
    (p) => p.trackInventory && p.stockQuantity <= p.lowStockThreshold,
  ).length;

  // ── Products filtering ──────────────────────────────────
  const filteredProducts = useMemo(() => {
    return cardapio.products.filter((p) => {
      const matchesSearch =
        productSearch.trim() === "" ||
        p.name.toLowerCase().includes(productSearch.toLowerCase().trim()) ||
        (p.sku?.toLowerCase().includes(productSearch.toLowerCase().trim()) ?? false);

      const matchesCategory =
        categoryFilter === "all" || p.categoryId === categoryFilter;

      const matchesStatus =
        productStatusFilter === "all" ||
        (productStatusFilter === "active" && p.isActive) ||
        (productStatusFilter === "inactive" && !p.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [cardapio.products, productSearch, categoryFilter, productStatusFilter]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));
  const validProductPage = Math.min(productPage, totalProductPages);
  const paginatedProducts = useMemo(() => {
    const start = (validProductPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, validProductPage, productPageSize]);

  const isFilteringProducts =
    productSearch.trim() !== "" || categoryFilter !== "all" || productStatusFilter !== "all";

  const handleClearProductFilters = () => {
    setProductSearch("");
    setCategoryFilter("all");
    setProductStatusFilter("all");
    setProductPage(1);
  };

  // ── Categories filtering ────────────────────────────────
  const filteredCategories = useMemo(() => {
    return cardapio.categories.filter((c) => {
      const matchesSearch =
        categorySearch.trim() === "" ||
        c.name.toLowerCase().includes(categorySearch.toLowerCase().trim());

      const matchesStatus =
        categoryStatusFilter === "all" ||
        (categoryStatusFilter === "active" && c.isActive) ||
        (categoryStatusFilter === "inactive" && !c.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [cardapio.categories, categorySearch, categoryStatusFilter]);

  const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / categoryPageSize));
  const validCategoryPage = Math.min(categoryPage, totalCategoryPages);
  const paginatedCategories = useMemo(() => {
    const start = (validCategoryPage - 1) * categoryPageSize;
    return filteredCategories.slice(start, start + categoryPageSize);
  }, [filteredCategories, validCategoryPage, categoryPageSize]);

  const isFilteringCategories =
    categorySearch.trim() !== "" || categoryStatusFilter !== "all";

  const handleClearCategoryFilters = () => {
    setCategorySearch("");
    setCategoryStatusFilter("all");
    setCategoryPage(1);
  };

  // ── Actions ─────────────────────────────────────────────
  const handleDeleteProductConfirm = () => {
    if (!deletingProduct) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("productId", deletingProduct.id);
      await deleteProductAction(slug, formData);
      setDeletingProduct(null);
    });
  };

  const handleDeleteCategoryConfirm = () => {
    if (!deletingCategory) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("categoryId", deletingCategory.id);
      await deleteCategoryAction(slug, formData);
      setDeletingCategory(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Dialog: Editar Produto ───────────────────────── */}
      <Dialog
        open={editProduct !== null}
        onOpenChange={(open) => !open && setEditProduct(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-slate-200 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Editar produto
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editProduct?.name}
            </DialogDescription>
          </DialogHeader>
          {editProduct && (
            <ProductForm
              key={editProduct.id}
              slug={slug}
              categories={cardapio.categories}
              defaultValues={editProduct}
              onSuccess={() => setEditProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Criar Produto ────────────────────────── */}
      <Dialog open={createProductOpen} onOpenChange={setCreateProductOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-slate-200 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Novo produto
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Cadastre um novo item no cardápio do seu restaurante.
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            slug={slug}
            categories={cardapio.categories}
            onSuccess={() => setCreateProductOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar Categoria ─────────────────────── */}
      <Dialog
        open={editCategory !== null}
        onOpenChange={(open) => !open && setEditCategory(null)}
      >
        <DialogContent className="border-slate-200 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Editar categoria
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editCategory?.name}
            </DialogDescription>
          </DialogHeader>
          {editCategory && (
            <CategoryForm
              key={editCategory.id}
              slug={slug}
              defaultValues={editCategory}
              onSuccess={() => setEditCategory(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Criar Categoria ──────────────────────── */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className="border-slate-200 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Nova categoria
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Organize o cardápio criando uma nova categoria de produtos.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            slug={slug}
            onSuccess={() => setCreateCategoryOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <UtensilsCrossedIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Gestão de Cardápio
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie produtos, categorias e grupos de adicionais do seu restaurante.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/cardapio/impressao">
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <PrinterIcon size={14} />
              <span>Imprimir Cardápio</span>
            </Button>
          </Link>

          <Button
            onClick={() => setCreateCategoryOpen(true)}
            variant="outline"
            className="h-10 gap-2 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <PlusIcon size={14} />
            <span>Nova Categoria</span>
          </Button>

          <Button
            onClick={() => setCreateProductOpen(true)}
            className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            <PlusIcon size={16} />
            <span>Novo Produto</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Total Produtos */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Produtos
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <PackageIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {totalProducts}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeProducts} ativos para venda
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Categorias */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Categorias
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <Layers3Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {totalCategories}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeCategories} visíveis no cardápio
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Produtos Ativos */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Disponíveis
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {activeProducts}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalProducts - activeProducts} pausados ou inativos
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Alerta de Estoque */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Alerta de Estoque
              </span>
              <div
                className={cn(
                  "rounded-lg p-1.5",
                  lowStockProducts > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-primary/10 text-primary",
                )}
              >
                <AlertTriangleIcon size={16} />
              </div>
            </div>
            <p
              className={cn(
                "mt-2 font-display text-2xl font-bold",
                lowStockProducts > 0 ? "text-amber-700" : "text-primary",
              )}
            >
              {lowStockProducts}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {lowStockProducts === 0
                ? "Todos com estoque seguro"
                : "Itens com saldo baixo"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Pill Tabs ───────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
          <TabsTrigger
            value="products"
            className="group gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <PackageIcon size={14} />
            <span>Produtos</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 transition-colors group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
              {cardapio.products.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="categories"
            className="group gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <Layers3Icon size={14} />
            <span>Categorias</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 transition-colors group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
              {cardapio.categories.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="additionals"
            className="group gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <ListPlusIcon size={14} />
            <span>Grupos de Adicionais</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Produtos ─────────────────────────────── */}
        <TabsContent value="products" className="space-y-4">
          {/* Tabela de Produtos com Filtros Integrados */}
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Filtros de Produtos */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {/* Busca */}
                  <div className="relative">
                    <SearchIcon
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar por nome ou SKU..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setProductPage(1);
                      }}
                      className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-xs transition-colors focus:bg-white sm:text-sm"
                    />
                  </div>

                  {/* Categoria */}
                  <Select
                    value={categoryFilter}
                    onValueChange={(val) => {
                      setCategoryFilter(val);
                      setProductPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs sm:text-sm">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white">
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {cardapio.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Status */}
                  <Select
                    value={productStatusFilter}
                    onValueChange={(val) => {
                      setProductStatusFilter(val);
                      setProductPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs sm:text-sm">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white">
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Somente Ativos</SelectItem>
                      <SelectItem value="inactive">Somente Inativos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200/80 hover:bg-transparent">
                    <TableHead className="w-14 pl-4 font-semibold text-slate-700">Foto</TableHead>
                    <TableHead className="font-semibold text-slate-700">Produto</TableHead>
                    <TableHead className="font-semibold text-slate-700">Categoria</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Preço</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Estoque</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="w-20 pr-4 text-right font-semibold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <PackageIcon size={32} className="text-slate-400" />
                          <p className="text-sm font-medium">Nenhum produto encontrado</p>
                          <p className="text-xs text-slate-400">
                            {isFilteringProducts
                              ? "Tente ajustar os filtros aplicados."
                              : "Cadastre seu primeiro produto para começar."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProducts.map((product) => {
                      const isLowStock =
                        product.trackInventory &&
                        product.stockQuantity <= product.lowStockThreshold;

                      return (
                        <TableRow
                          key={product.id}
                          className="border-slate-100 transition-colors hover:bg-slate-50/70"
                        >
                          <TableCell className="pl-4 py-3">
                            <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                              {product.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <PackageIcon size={18} />
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="font-semibold text-slate-900">{product.name}</div>
                            {product.sku && (
                              <div className="font-mono text-xs text-slate-400">
                                SKU: {product.sku}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-slate-600">
                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {product.categoryName}
                            </span>
                          </TableCell>

                          <TableCell className="py-3 text-right font-display text-sm font-bold text-slate-900">
                            {formatCurrency(product.price)}
                          </TableCell>

                          <TableCell className="py-3 text-right">
                            {product.trackInventory ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                  isLowStock
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-700",
                                )}
                              >
                                {isLowStock && <AlertTriangleIcon size={12} />}
                                {product.stockQuantity} un
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3">
                            <Badge
                              variant={product.isActive ? "success" : "secondary"}
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                            >
                              {product.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>

                          <TableCell className="pr-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <MoreHorizontalIcon size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-200 bg-white">
                                <DropdownMenuItem
                                  onClick={() => setEditProduct(product)}
                                  className="cursor-pointer gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                >
                                  <PencilIcon size={14} className="text-primary" />
                                  <span>Editar Produto</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingProduct({ id: product.id, name: product.name })}
                                  disabled={isPending}
                                  className="cursor-pointer gap-2 text-xs font-semibold text-red-600 focus:bg-red-50 focus:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2Icon size={14} />
                                  <span>Excluir</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-slate-500">
                  <PackageIcon size={32} className="text-slate-400" />
                  <p className="text-sm font-medium">Nenhum produto encontrado</p>
                  <p className="text-xs text-slate-400">
                    {isFilteringProducts
                      ? "Tente ajustar os filtros aplicados."
                      : "Cadastre seu primeiro produto para começar."}
                  </p>
                </div>
              ) : (
                paginatedProducts.map((product) => {
                  const isLowStock =
                    product.trackInventory &&
                    product.stockQuantity <= product.lowStockThreshold;

                  return (
                    <div key={product.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <PackageIcon size={20} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900 truncate">
                                {product.name}
                              </p>
                              {product.sku && (
                                <p className="font-mono text-xs text-slate-400">
                                  SKU: {product.sku}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={product.isActive ? "success" : "secondary"}
                              className="rounded-full px-2 py-0.5 text-[10px] shrink-0"
                            >
                              {product.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              {product.categoryName}
                            </span>
                            <span className="font-display text-sm font-bold text-slate-900">
                              {formatCurrency(product.price)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <div>
                          {product.trackInventory ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                isLowStock
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-700",
                              )}
                            >
                              {isLowStock && <AlertTriangleIcon size={12} />}
                              Estoque: {product.stockQuantity} un
                            </span>
                          ) : (
                            <span className="text-slate-400">Sem controle de estoque</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 rounded-lg px-2.5 text-xs text-slate-600 hover:bg-slate-100"
                            onClick={() => setEditProduct(product)}
                          >
                            <PencilIcon size={14} />
                            <span>Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 rounded-lg px-2.5 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => setDeletingProduct({ id: product.id, name: product.name })}
                            disabled={isPending}
                          >
                            <Trash2Icon size={14} />
                            <span>Excluir</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé / Paginação de Produtos */}
            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>
                  Exibindo <strong className="font-semibold text-slate-900">{filteredProducts.length > 0 ? (validProductPage - 1) * productPageSize + 1 : 0}</strong> a{" "}
                  <strong className="font-semibold text-slate-900">{Math.min(validProductPage * productPageSize, filteredProducts.length)}</strong> de{" "}
                  <strong className="font-semibold text-slate-900">{filteredProducts.length}</strong> {filteredProducts.length === 1 ? "produto" : "produtos"}
                  {filteredProducts.length !== cardapio.products.length && (
                    <span className="ml-1 text-slate-400">
                      (total: {cardapio.products.length})
                    </span>
                  )}
                </span>
                {isFilteringProducts && (
                  <span className="text-[11px] font-medium text-amber-600">
                    (Filtros aplicados)
                  </span>
                )}
              </div>

              {totalProductPages > 1 && (
                <div className="flex items-center gap-2">
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
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Categorias ───────────────────────────── */}
        <TabsContent value="categories" className="space-y-4">
          {/* Tabela de Categorias com Filtros Integrados */}
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Filtros de Categorias */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="relative">
                    <SearchIcon
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar por nome da categoria..."
                      value={categorySearch}
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        setCategoryPage(1);
                      }}
                      className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-xs transition-colors focus:bg-white sm:text-sm"
                    />
                  </div>

                  <Select
                    value={categoryStatusFilter}
                    onValueChange={(val) => {
                      setCategoryStatusFilter(val);
                      setCategoryPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs sm:text-sm">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white">
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Somente Ativas</SelectItem>
                      <SelectItem value="inactive">Somente Inativas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isFilteringCategories && (
                  <Button
                    variant="ghost"
                    onClick={handleClearCategoryFilters}
                    className="h-10 gap-1.5 rounded-xl px-3 text-xs text-slate-500 hover:text-slate-900"
                  >
                    <FilterXIcon size={14} />
                    <span>Limpar</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200/80 hover:bg-transparent">
                    <TableHead className="w-14 pl-4 font-semibold text-slate-700">Ícone</TableHead>
                    <TableHead className="font-semibold text-slate-700">Categoria</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Ordem</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Produtos</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="w-20 pr-4 text-right font-semibold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <Layers3Icon size={32} className="text-slate-400" />
                          <p className="text-sm font-medium">Nenhuma categoria encontrada</p>
                          <p className="text-xs text-slate-400">
                            {isFilteringCategories
                              ? "Tente ajustar os filtros aplicados."
                              : "Crie categorias para agrupar seus produtos."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCategories.map((category) => (
                      <TableRow
                        key={category.id}
                        className="border-slate-100 transition-colors hover:bg-slate-50/70"
                      >
                        <TableCell className="pl-4 py-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                            {category.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={category.imageUrl}
                                alt={category.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Layers3Icon size={18} className="text-slate-400" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3 font-semibold text-slate-900">
                          {category.name}
                        </TableCell>

                        <TableCell className="py-3 text-right font-mono text-xs text-slate-500">
                          #{category.displayOrder}
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {category.products.length} itens
                          </span>
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge
                            variant={category.isActive ? "success" : "secondary"}
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          >
                            {category.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>

                        <TableCell className="pr-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <MoreHorizontalIcon size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-200 bg-white">
                              <DropdownMenuItem
                                onClick={() => setEditCategory(category)}
                                className="cursor-pointer gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                              >
                                <PencilIcon size={14} className="text-primary" />
                                <span>Editar Categoria</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingCategory({ id: category.id, name: category.name })}
                                disabled={isPending}
                                className="cursor-pointer gap-2 text-xs font-semibold text-red-600 focus:bg-red-50 focus:text-red-700 hover:bg-red-50"
                              >
                                <Trash2Icon size={14} />
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-slate-500">
                  <Layers3Icon size={32} className="text-slate-400" />
                  <p className="text-sm font-medium">Nenhuma categoria encontrada</p>
                  <p className="text-xs text-slate-400">
                    {isFilteringCategories
                      ? "Tente ajustar os filtros aplicados."
                      : "Crie categorias para agrupar seus produtos."}
                  </p>
                </div>
              ) : (
                paginatedCategories.map((category) => (
                  <div key={category.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {category.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={category.imageUrl}
                              alt={category.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Layers3Icon size={18} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{category.name}</p>
                          <p className="text-xs text-slate-400">Ordem: #{category.displayOrder}</p>
                        </div>
                      </div>

                      <Badge
                        variant={category.isActive ? "success" : "secondary"}
                        className="rounded-full px-2 py-0.5 text-[10px]"
                      >
                        {category.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                      <span className="text-slate-500">
                        {category.products.length} {category.products.length === 1 ? "produto" : "produtos"}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 rounded-lg px-2.5 text-xs text-slate-600 hover:bg-slate-100"
                          onClick={() => setEditCategory(category)}
                        >
                          <PencilIcon size={14} />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 rounded-lg px-2.5 text-xs text-rose-600 hover:bg-rose-50"
                          onClick={() => setDeletingCategory({ id: category.id, name: category.name })}
                          disabled={isPending}
                        >
                          <Trash2Icon size={14} />
                          <span>Excluir</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Rodapé / Paginação de Categorias */}
            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>
                  Exibindo <strong className="font-semibold text-slate-900">{filteredCategories.length > 0 ? (validCategoryPage - 1) * categoryPageSize + 1 : 0}</strong> a{" "}
                  <strong className="font-semibold text-slate-900">{Math.min(validCategoryPage * categoryPageSize, filteredCategories.length)}</strong> de{" "}
                  <strong className="font-semibold text-slate-900">{filteredCategories.length}</strong> {filteredCategories.length === 1 ? "categoria" : "categorias"}
                  {filteredCategories.length !== cardapio.categories.length && (
                    <span className="ml-1 text-slate-400">
                      (total: {cardapio.categories.length})
                    </span>
                  )}
                </span>
                {isFilteringCategories && (
                  <span className="text-[11px] font-medium text-amber-600">
                    (Filtros aplicados)
                  </span>
                )}
              </div>

              {totalCategoryPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Página <strong>{validCategoryPage}</strong> de{" "}
                    <strong>{totalCategoryPages}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoryPage((p) => Math.max(1, p - 1))}
                      disabled={validCategoryPage <= 1}
                      className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                    >
                      <ChevronLeftIcon size={14} />
                      <span>Anterior</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoryPage((p) => Math.min(totalCategoryPages, p + 1))}
                      disabled={validCategoryPage >= totalCategoryPages}
                      className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                    >
                      <span>Próxima</span>
                      <ChevronRightIcon size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Grupos de Adicionais Globais ──────────── */}
        <TabsContent value="additionals" className="space-y-4">
          <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  <ListPlusIcon size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Grupos de Adicionais Globais
                  </h3>
                  <p className="text-xs text-slate-500">
                    Crie grupos de complementos reutilizáveis (ex.: Sabores, Molhos, Pontos da Carne) e vincule-os a múltiplos produtos de uma só vez.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <GlobalOptionGroupsManager slug={slug} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Confirmar Exclusão de Produto ─────────── */}
      <ConfirmDeleteDialog
        open={Boolean(deletingProduct)}
        onOpenChange={(open) => {
          if (!open) setDeletingProduct(null);
        }}
        title="Excluir produto"
        description={
          <>
            Tem certeza que deseja remover o produto{" "}
            <strong className="text-slate-900 font-semibold">
              {deletingProduct?.name}
            </strong>
            ? Esta ação não pode ser desfeita e removerá o item do cardápio.
          </>
        }
        confirmLabel="Sim, excluir produto"
        isPending={isPending}
        onConfirm={handleDeleteProductConfirm}
      />

      {/* ── Dialog: Confirmar Exclusão de Categoria ───────── */}
      <ConfirmDeleteDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open) setDeletingCategory(null);
        }}
        title="Excluir categoria"
        description={
          <>
            Tem certeza que deseja remover a categoria{" "}
            <strong className="text-slate-900 font-semibold">
              {deletingCategory?.name}
            </strong>
            ? Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Sim, excluir categoria"
        isPending={isPending}
        onConfirm={handleDeleteCategoryConfirm}
      />
    </div>
  );
}
