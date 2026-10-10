"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FilterXIcon,
  FlameIcon,
  Layers3Icon,
  ListPlusIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PizzaIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UtensilsCrossedIcon,
  WheatOffIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  alternarStatusCategoriaAction,
  alternarStatusProdutoAction,
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
import { Switch } from "@/components/ui/switch";
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
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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
            <span className="ml-1 text-slate-400">(total: {totalCount})</span>
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

export function CardapioClient({ slug, cardapio }: CardapioClientProps) {
  // ── Tabs state ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("products");

  // ── Products filtering & pagination ─────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [productSort, setProductSort] = useState("NAME_ASC");
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);

  // ── Categories filtering & pagination ───────────────────
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryStatusFilter, setCategoryStatusFilter] = useState("all");
  const [categorySort, setCategorySort] = useState("ORDER_ASC");
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryPageSize, setCategoryPageSize] = useState(10);

  // ── Dialogs ─────────────────────────────────────────────
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductWithCategory | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<{ id: string; name: string } | null>(null);

  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createOptionGroupOpen, setCreateOptionGroupOpen] = useState(false);
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

  // ── Products filtering & sorting ────────────────────────
  const filteredProducts = useMemo(() => {
    return cardapio.products
      .filter((p) => {
        const matchesSearch =
          productSearch.trim() === "" ||
          p.name.toLowerCase().includes(productSearch.toLowerCase().trim()) ||
          (p.sku?.toLowerCase().includes(productSearch.toLowerCase().trim()) ?? false);

        const matchesCategory =
          categoryFilter === "all" || p.categoryId === categoryFilter;

        const matchesStatus =
          productStatusFilter === "all" ||
          (productStatusFilter === "active" && p.isActive) ||
          (productStatusFilter === "inactive" && !p.isActive) ||
          (productStatusFilter === "low_stock" &&
            p.trackInventory &&
            p.stockQuantity <= p.lowStockThreshold);

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (productSort === "NAME_ASC") return a.name.localeCompare(b.name, "pt-BR");
        if (productSort === "NAME_DESC") return b.name.localeCompare(a.name, "pt-BR");
        if (productSort === "PRICE_ASC") return a.price - b.price;
        if (productSort === "PRICE_DESC") return b.price - a.price;
        if (productSort === "STOCK_ASC") return a.stockQuantity - b.stockQuantity;
        if (productSort === "STOCK_DESC") return b.stockQuantity - a.stockQuantity;
        return 0;
      });
  }, [cardapio.products, productSearch, categoryFilter, productStatusFilter, productSort]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));
  const validProductPage = Math.min(productPage, totalProductPages);
  const paginatedProducts = useMemo(() => {
    const start = (validProductPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, validProductPage, productPageSize]);

  const isFilteringProducts =
    productSearch.trim() !== "" ||
    categoryFilter !== "all" ||
    productStatusFilter !== "all" ||
    productSort !== "NAME_ASC";

  const handleClearProductFilters = () => {
    setProductSearch("");
    setCategoryFilter("all");
    setProductStatusFilter("all");
    setProductSort("NAME_ASC");
    setProductPage(1);
  };

  // ── Categories filtering & sorting ──────────────────────
  const filteredCategories = useMemo(() => {
    return cardapio.categories
      .filter((c) => {
        const matchesSearch =
          categorySearch.trim() === "" ||
          c.name.toLowerCase().includes(categorySearch.toLowerCase().trim());

        const matchesStatus =
          categoryStatusFilter === "all" ||
          (categoryStatusFilter === "active" && c.isActive) ||
          (categoryStatusFilter === "inactive" && !c.isActive);

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (categorySort === "ORDER_ASC") return a.displayOrder - b.displayOrder;
        if (categorySort === "NAME_ASC") return a.name.localeCompare(b.name, "pt-BR");
        if (categorySort === "PRODUCTS_DESC") return b.products.length - a.products.length;
        return 0;
      });
  }, [cardapio.categories, categorySearch, categoryStatusFilter, categorySort]);

  const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / categoryPageSize));
  const validCategoryPage = Math.min(categoryPage, totalCategoryPages);
  const paginatedCategories = useMemo(() => {
    const start = (validCategoryPage - 1) * categoryPageSize;
    return filteredCategories.slice(start, start + categoryPageSize);
  }, [filteredCategories, validCategoryPage, categoryPageSize]);

  const isFilteringCategories =
    categorySearch.trim() !== "" ||
    categoryStatusFilter !== "all" ||
    categorySort !== "ORDER_ASC";

  const handleClearCategoryFilters = () => {
    setCategorySearch("");
    setCategoryStatusFilter("all");
    setCategorySort("ORDER_ASC");
    setCategoryPage(1);
  };

  // ── Status Toggle Handlers ──────────────────────────────
  const handleToggleProductStatus = (
    productId: string,
    currentStatus: boolean,
    productName: string,
  ) => {
    startTransition(async () => {
      const result = await alternarStatusProdutoAction(slug, productId, !currentStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Produto "${productName}" ${!currentStatus ? "ativado" : "pausado"} com sucesso.`,
        );
      }
    });
  };

  const handleToggleCategoryStatus = (
    categoryId: string,
    currentStatus: boolean,
    categoryName: string,
  ) => {
    startTransition(async () => {
      const result = await alternarStatusCategoriaAction(slug, categoryId, !currentStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Categoria "${categoryName}" ${!currentStatus ? "ativada" : "desativada"} com sucesso.`,
        );
      }
    });
  };

  // ── Actions ─────────────────────────────────────────────
  const handleDeleteProductConfirm = () => {
    if (!deletingProduct) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("productId", deletingProduct.id);
      await deleteProductAction(slug, formData);
      toast.success(`Produto "${deletingProduct.name}" excluído.`);
      setDeletingProduct(null);
    });
  };

  const handleDeleteCategoryConfirm = () => {
    if (!deletingCategory) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("categoryId", deletingCategory.id);
      await deleteCategoryAction(slug, formData);
      toast.success(`Categoria "${deletingCategory.name}" excluída.`);
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
              Cadastre e organize categorias, produtos, preços e grupos de adicionais do seu restaurante.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "products" && (
            <Button
              onClick={() => setCreateProductOpen(true)}
              className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <PlusIcon size={16} />
              <span>Novo Produto</span>
            </Button>
          )}

          {activeTab === "categories" && (
            <Button
              onClick={() => setCreateCategoryOpen(true)}
              className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <PlusIcon size={16} />
              <span>Nova Categoria</span>
            </Button>
          )}

          {activeTab === "additionals" && (
            <Button
              onClick={() => setCreateOptionGroupOpen(true)}
              className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <PlusIcon size={16} />
              <span>Novo Grupo Adicional</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Total Produtos */}
        <Card
          onClick={() => {
            setActiveTab("products");
            handleClearProductFilters();
          }}
          className="cursor-pointer border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
        >
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
        <Card
          onClick={() => {
            setActiveTab("categories");
            handleClearCategoryFilters();
          }}
          className="cursor-pointer border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
        >
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
        <Card
          onClick={() => {
            setActiveTab("products");
            setProductStatusFilter("active");
            setProductPage(1);
          }}
          className="cursor-pointer border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
        >
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
        <Card
          onClick={() => {
            setActiveTab("products");
            setProductStatusFilter("low_stock");
            setProductPage(1);
          }}
          className="cursor-pointer border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Alerta de Estoque
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                {lowStockProducts > 0 ? (
                  <AlertTriangleIcon size={16} />
                ) : (
                  <CheckCircle2Icon size={16} />
                )}
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {lowStockProducts}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {lowStockProducts === 0
                ? "Todos com estoque seguro"
                : `${lowStockProducts} ${lowStockProducts === 1 ? "item com saldo baixo" : "itens com saldo baixo"}`}
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
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Filtros da Tabela de Produtos */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <SearchIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    placeholder="Buscar por nome ou SKU do produto..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setProductPage(1);
                    }}
                    className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:bg-white"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch("");
                        setProductPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>

                {/* Filters Group */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Categoria */}
                  <div className="w-full sm:w-44">
                    <Select
                      value={categoryFilter}
                      onValueChange={(val) => {
                        setCategoryFilter(val);
                        setProductPage(1);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                        <SelectValue placeholder="Todas categorias" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                        <SelectItem value="all">Todas categorias</SelectItem>
                        {cardapio.categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="w-full sm:w-36">
                    <Select
                      value={productStatusFilter}
                      onValueChange={(val) => {
                        setProductStatusFilter(val);
                        setProductPage(1);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                        <SelectValue placeholder="Status..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos / Pausados</SelectItem>
                        <SelectItem value="low_stock">Estoque Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ordenação */}
                  <div className="w-full sm:w-40">
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
                        <SelectItem value="NAME_DESC">Nome (Z-A)</SelectItem>
                        <SelectItem value="PRICE_ASC">Menor Preço</SelectItem>
                        <SelectItem value="PRICE_DESC">Maior Preço</SelectItem>
                        <SelectItem value="STOCK_ASC">Menor Estoque</SelectItem>
                        <SelectItem value="STOCK_DESC">Maior Estoque</SelectItem>
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
                    ? "Tente ajustar os filtros ou o termo de busca para visualizar outros produtos."
                    : "Nenhum produto cadastrado no cardápio deste restaurante ainda. Comece criando seu primeiro item!"}
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
                    onClick={() => setCreateProductOpen(true)}
                    className="mt-4 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                  >
                    <PlusIcon size={14} />
                    Cadastrar primeiro produto
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
                        <TableHead className="w-14 pl-4 text-xs font-semibold text-slate-700">Foto</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Produto</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Categoria</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Preço</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Estoque</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="w-20 pr-4 text-right text-xs font-semibold text-slate-700">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {paginatedProducts.map((product) => {
                        const isLowStock =
                          product.trackInventory &&
                          product.stockQuantity <= product.lowStockThreshold;

                        return (
                          <TableRow
                            key={product.id}
                            className="transition-colors hover:bg-slate-50/70"
                          >
                            {/* Foto */}
                            <TableCell className="pl-4 py-3.5">
                              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-2xs">
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

                            {/* Produto + SKU + Badges */}
                            <TableCell className="py-3.5">
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900 text-sm">
                                  {product.name}
                                </span>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {product.sku && (
                                    <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                                      SKU: {product.sku}
                                    </span>
                                  )}
                                  {product.isVegan && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                      Vegano
                                    </span>
                                  )}
                                  {product.isGlutenFree && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                                      <WheatOffIcon size={10} />
                                      Sem Glúten
                                    </span>
                                  )}
                                  {product.isSpicy && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                                      <FlameIcon size={10} />
                                      Picante
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Categoria */}
                            <TableCell className="py-3.5 text-slate-600">
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                <Layers3Icon size={12} className="text-primary" />
                                {product.categoryName}
                              </span>
                            </TableCell>

                            {/* Preço */}
                            <TableCell className="py-3.5 text-right font-display text-sm font-bold text-slate-900">
                              {formatCurrency(product.price)}
                            </TableCell>

                            {/* Estoque */}
                            <TableCell className="py-3.5 text-right">
                              {product.trackInventory ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                                    isLowStock
                                      ? "border border-rose-200 bg-rose-50 text-rose-700"
                                      : "border border-primary/20 bg-primary/10 text-primary",
                                  )}
                                >
                                  {isLowStock && <AlertTriangleIcon size={12} className="text-rose-600" />}
                                  {product.stockQuantity} un
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Sem controle</span>
                              )}
                            </TableCell>

                            {/* Status Switch Interativo */}
                            <TableCell className="py-3.5 text-center">
                              <div className="inline-flex items-center justify-center gap-2">
                                <Switch
                                  checked={product.isActive}
                                  disabled={isPending}
                                  onCheckedChange={() =>
                                    handleToggleProductStatus(product.id, product.isActive, product.name)
                                  }
                                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
                                />
                                <span
                                  className={cn(
                                    "text-xs font-semibold",
                                    product.isActive ? "text-primary" : "text-slate-400",
                                  )}
                                >
                                  {product.isActive ? "Ativo" : "Pausado"}
                                </span>
                              </div>
                            </TableCell>

                            {/* Ações */}
                            <TableCell className="pr-4 py-3.5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                  >
                                    <MoreHorizontalIcon size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 rounded-xl border-slate-200 bg-white shadow-lg">
                                  <DropdownMenuItem
                                    onClick={() => setEditProduct(product)}
                                    className="cursor-pointer gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                  >
                                    <PencilIcon size={14} className="text-primary" />
                                    <span>Editar Produto</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleProductStatus(product.id, product.isActive, product.name)
                                    }
                                    className="cursor-pointer gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                  >
                                    {product.isActive ? (
                                      <>
                                        <AlertCircleIcon size={14} className="text-primary" />
                                        <span>Pausar Venda</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2Icon size={14} className="text-emerald-600" />
                                        <span>Ativar Venda</span>
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDeletingProduct({ id: product.id, name: product.name })
                                    }
                                    disabled={isPending}
                                    className="cursor-pointer gap-2 text-xs font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700 hover:bg-rose-50"
                                  >
                                    <Trash2Icon size={14} />
                                    <span>Excluir</span>
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

                {/* Mobile Cards View */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {paginatedProducts.map((product) => {
                    const isLowStock =
                      product.trackInventory &&
                      product.stockQuantity <= product.lowStockThreshold;

                    return (
                      <div key={product.id} className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-2xs">
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
                                  <span className="inline-block mt-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.2 font-mono text-[10px] font-bold text-slate-700">
                                    SKU: {product.sku}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Switch
                                  checked={product.isActive}
                                  disabled={isPending}
                                  onCheckedChange={() =>
                                    handleToggleProductStatus(product.id, product.isActive, product.name)
                                  }
                                  className="scale-90 data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
                                />
                                <span
                                  className={cn(
                                    "text-[11px] font-semibold",
                                    product.isActive ? "text-primary" : "text-slate-400",
                                  )}
                                >
                                  {product.isActive ? "Ativo" : "Pausado"}
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                <Layers3Icon size={11} className="text-primary" />
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
                                    ? "border border-rose-200 bg-rose-50 text-rose-700"
                                    : "border border-primary/20 bg-primary/10 text-primary",
                                )}
                              >
                                {isLowStock && <AlertTriangleIcon size={12} className="text-rose-600" />}
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
                              className="h-8 gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              onClick={() => setEditProduct(product)}
                            >
                              <PencilIcon size={13} className="text-primary" />
                              <span>Editar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 rounded-lg px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              onClick={() =>
                                setDeletingProduct({ id: product.id, name: product.name })
                              }
                              disabled={isPending}
                            >
                              <Trash2Icon size={13} />
                              <span>Excluir</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Shared Table Pagination */}
                <TablePagination
                  filteredCount={filteredProducts.length}
                  totalCount={cardapio.products.length}
                  isFiltering={isFilteringProducts}
                  currentPage={validProductPage}
                  totalPages={totalProductPages}
                  pageSize={productPageSize}
                  onPageSizeChange={(newSize) => {
                    setProductPageSize(newSize);
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

        {/* ── Tab 2: Categorias ───────────────────────────── */}
        <TabsContent value="categories" className="space-y-4">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Filtros de Categorias */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <SearchIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    placeholder="Buscar por nome da categoria..."
                    value={categorySearch}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      setCategoryPage(1);
                    }}
                    className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:bg-white"
                  />
                  {categorySearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategorySearch("");
                        setCategoryPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>

                {/* Filters Group */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status */}
                  <div className="w-full sm:w-36">
                    <Select
                      value={categoryStatusFilter}
                      onValueChange={(val) => {
                        setCategoryStatusFilter(val);
                        setCategoryPage(1);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                        <SelectValue placeholder="Status..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="active">Somente Ativas</SelectItem>
                        <SelectItem value="inactive">Somente Inativas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ordenação */}
                  <div className="w-full sm:w-44">
                    <Select
                      value={categorySort}
                      onValueChange={(val) => {
                        setCategorySort(val);
                        setCategoryPage(1);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                        <SelectValue placeholder="Ordenar..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                        <SelectItem value="ORDER_ASC">Ordem (#1 primeiro)</SelectItem>
                        <SelectItem value="NAME_ASC">Nome (A-Z)</SelectItem>
                        <SelectItem value="PRODUCTS_DESC">Mais Produtos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isFilteringCategories && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCategoryFilters}
                      className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <FilterXIcon size={14} />
                      <span>Limpar</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-2xl bg-primary/10 p-4 text-primary border border-primary/20">
                  <Layers3Icon size={32} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhuma categoria encontrada
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {isFilteringCategories
                    ? "Tente ajustar os filtros ou a busca para visualizar outras categorias."
                    : "Crie categorias para agrupar e organizar o cardápio do seu restaurante."}
                </p>
                {isFilteringCategories ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCategoryFilters}
                    className="mt-4 gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                  >
                    <FilterXIcon size={14} />
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setCreateCategoryOpen(true)}
                    className="mt-4 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                  >
                    <PlusIcon size={14} />
                    Criar primeira categoria
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
                        <TableHead className="w-14 pl-4 text-xs font-semibold text-slate-700">Foto</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Categoria</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-700">Ordem</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-700">Produtos</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Tipo</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="w-20 pr-4 text-right text-xs font-semibold text-slate-700">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {paginatedCategories.map((category) => (
                        <TableRow
                          key={category.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          {/* Imagem / Ícone */}
                          <TableCell className="pl-4 py-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-2xs">
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

                          {/* Nome */}
                          <TableCell className="py-3.5 font-semibold text-slate-900 text-sm">
                            {category.name}
                          </TableCell>

                          {/* Ordem */}
                          <TableCell className="py-3.5 text-center font-mono text-xs font-semibold text-slate-500">
                            #{category.displayOrder}
                          </TableCell>

                          {/* Produtos */}
                          <TableCell className="py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {category.products.length} {category.products.length === 1 ? "produto" : "produtos"}
                            </span>
                          </TableCell>

                          {/* Tipo especial */}
                          <TableCell className="py-3.5">
                            {category.isPizzaCategory ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                <PizzaIcon size={12} className="text-primary" />
                                Pizza Meio a Meio
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Padrão</span>
                            )}
                          </TableCell>

                          {/* Status Switch Interativo */}
                          <TableCell className="py-3.5 text-center">
                            <div className="inline-flex items-center justify-center gap-2">
                              <Switch
                                checked={category.isActive}
                                disabled={isPending}
                                onCheckedChange={() =>
                                    handleToggleCategoryStatus(category.id, category.isActive, category.name)
                                }
                                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
                              />
                              <span
                                className={cn(
                                  "text-xs font-semibold",
                                  category.isActive ? "text-primary" : "text-slate-400",
                                )}
                              >
                                {category.isActive ? "Ativa" : "Inativa"}
                              </span>
                            </div>
                          </TableCell>

                          {/* Ações */}
                          <TableCell className="pr-4 py-3.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                  <MoreHorizontalIcon size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 rounded-xl border-slate-200 bg-white shadow-lg">
                                <DropdownMenuItem
                                  onClick={() => setEditCategory(category)}
                                  className="cursor-pointer gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                >
                                  <PencilIcon size={14} className="text-primary" />
                                  <span>Editar Categoria</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggleCategoryStatus(category.id, category.isActive, category.name)
                                  }
                                  className="cursor-pointer gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                >
                                  {category.isActive ? (
                                    <>
                                      <AlertCircleIcon size={14} className="text-primary" />
                                      <span>Desativar Categoria</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2Icon size={14} className="text-emerald-600" />
                                      <span>Ativar Categoria</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setDeletingCategory({ id: category.id, name: category.name })
                                  }
                                  disabled={isPending}
                                  className="cursor-pointer gap-2 text-xs font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2Icon size={14} />
                                  <span>Excluir</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards View */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {paginatedCategories.map((category) => (
                    <div key={category.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-2xs">
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
                            <p className="font-semibold text-slate-900 text-sm">{category.name}</p>
                            <p className="text-xs text-slate-400 font-mono">Ordem: #{category.displayOrder}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Switch
                            checked={category.isActive}
                            disabled={isPending}
                            onCheckedChange={() =>
                              handleToggleCategoryStatus(category.id, category.isActive, category.name)
                            }
                            className="scale-90 data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
                          />
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              category.isActive ? "text-primary" : "text-slate-400",
                            )}
                          >
                            {category.isActive ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {category.products.length} {category.products.length === 1 ? "produto" : "produtos"}
                          </span>
                          {category.isPizzaCategory && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              <PizzaIcon size={11} className="text-primary" />
                              Pizza Meio a Meio
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => setEditCategory(category)}
                          >
                            <PencilIcon size={13} className="text-primary" />
                            <span>Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 rounded-lg px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                            onClick={() =>
                              setDeletingCategory({ id: category.id, name: category.name })
                            }
                            disabled={isPending}
                          >
                            <Trash2Icon size={13} />
                            <span>Excluir</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shared Table Pagination */}
                <TablePagination
                  filteredCount={filteredCategories.length}
                  totalCount={cardapio.categories.length}
                  isFiltering={isFilteringCategories}
                  currentPage={validCategoryPage}
                  totalPages={totalCategoryPages}
                  pageSize={categoryPageSize}
                  onPageSizeChange={(newSize) => {
                    setCategoryPageSize(newSize);
                    setCategoryPage(1);
                  }}
                  onPageChange={setCategoryPage}
                  itemLabelSingular="categoria"
                  itemLabelPlural="categorias"
                />
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 3: Grupos de Adicionais Globais ──────────── */}
        <TabsContent value="additionals" className="space-y-4">
          <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ListPlusIcon size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Grupos de Adicionais Globais
                  </h3>
                  <p className="text-xs text-slate-500">
                    Crie complementos e grupos de opções reutilizáveis (ex.: Molhos, Tamanhos, Pontos da Carne) e vincule-os facilmente aos produtos.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <GlobalOptionGroupsManager
                slug={slug}
                isAddingGroup={createOptionGroupOpen}
                onAddingGroupChange={setCreateOptionGroupOpen}
              />
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
