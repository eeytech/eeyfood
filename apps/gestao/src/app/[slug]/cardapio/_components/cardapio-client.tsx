"use client";

import {
  Layers3Icon,
  ListPlusIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, useTransition } from "react";

import {
  deleteCategoryAction,
  deleteProductAction,
} from "@/app/[slug]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categorySearch, setCategorySearch] = useState("");

  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductWithCategory | null>(null);

  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoriaComProdutos | null>(null);

  const [isPending, startTransition] = useTransition();

  const filteredProducts = cardapio.products.filter((p) => {
    const matchesSearch =
      productSearch === "" ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ?? false);
    const matchesCategory =
      categoryFilter === "all" || p.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredCategories = cardapio.categories.filter(
    (c) =>
      categorySearch === "" ||
      c.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  const handleDeleteProduct = (productId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("productId", productId);
      await deleteProductAction(slug, formData);
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("categoryId", categoryId);
      await deleteCategoryAction(slug, formData);
    });
  };

  return (
    <>
      {/* Edit Product Dialog */}
      <Dialog
        open={editProduct !== null}
        onOpenChange={(open) => !open && setEditProduct(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
            <DialogDescription>{editProduct?.name}</DialogDescription>
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

      {/* Edit Category Dialog */}
      <Dialog
        open={editCategory !== null}
        onOpenChange={(open) => !open && setEditCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>{editCategory?.name}</DialogDescription>
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

      {/* Create Product Dialog */}
      <Dialog open={createProductOpen} onOpenChange={setCreateProductOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo produto</DialogTitle>
            <DialogDescription>
              Cadastre um novo produto no cardápio.
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            slug={slug}
            categories={cardapio.categories}
            onSuccess={() => setCreateProductOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
            <DialogDescription>
              Organize o cardápio criando uma nova categoria.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            slug={slug}
            onSuccess={() => setCreateCategoryOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">
            <PackageIcon size={14} />
            Produtos
            <span className="ml-1 text-xs opacity-60">
              ({cardapio.products.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Layers3Icon size={14} />
            Categorias
            <span className="ml-1 text-xs opacity-60">
              ({cardapio.categories.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="additionals">
            <ListPlusIcon size={14} />
            Adicionais
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-4">
          <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 gap-2">
                <div className="relative max-w-xs flex-1">
                  <SearchIcon
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    placeholder="Buscar produto ou SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="h-9 rounded-md pl-8"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Todas as categorias</option>
                  {cardapio.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setCreateProductOpen(true)}
              >
                <PlusIcon size={14} />
                Novo produto
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="h-9 w-9 overflow-hidden rounded-md border bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium leading-none">{product.name}</p>
                        {product.sku && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {product.sku}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.categoryName}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            product.trackInventory &&
                            product.stockQuantity <= product.lowStockThreshold
                              ? "font-medium text-rose-600"
                              : ""
                          }
                        >
                          {product.stockQuantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.isActive ? "success" : "danger"}>
                          {product.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditProduct(product)}
                          >
                            <PencilIcon size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={isPending}
                          >
                            <Trash2Icon size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Additionals Tab */}
        <TabsContent value="additionals" className="mt-4">
          <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-medium">Grupos de adicionais globais</p>
                <p className="text-xs text-muted-foreground">
                  Crie grupos reutilizáveis e vincule-os a vários produtos.
                </p>
              </div>
            </div>
            <div className="p-4">
              <GlobalOptionGroupsManager slug={slug} />
            </div>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-xs flex-1">
                <SearchIcon
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Buscar categoria..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="h-9 rounded-md pl-8"
                />
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setCreateCategoryOpen(true)}
              >
                <PlusIcon size={14} />
                Nova categoria
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Ordem</TableHead>
                  <TableHead className="text-right">Produtos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhuma categoria encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border bg-slate-50">
                          {category.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={category.imageUrl}
                              alt={category.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Layers3Icon size={14} className="text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{category.name}</p>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {category.displayOrder}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {category.products.length}
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.isActive ? "success" : "danger"}>
                          {category.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditCategory(category)}
                          >
                            <PencilIcon size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={isPending}
                          >
                            <Trash2Icon size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
