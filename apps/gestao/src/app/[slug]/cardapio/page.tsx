import { ImagePlusIcon, Layers3Icon, PackagePlusIcon, Trash2Icon } from "lucide-react";
import { notFound } from "next/navigation";

import {
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
  deleteProductAction,
  updateCategoryAction,
  updateProductAction,
} from "@/app/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { buscarCardapioGestao } from "@/lib/admin-queries";

interface CardapioPageProps {
  params: Promise<{ slug: string }>;
}

const CardapioPage = async ({ params }: CardapioPageProps) => {
  const { slug } = await params;
  const cardapio = await buscarCardapioGestao(slug);

  if (!cardapio) {
    return notFound();
  }

  return (
    <main className="space-y-4">
      <Card className="overflow-hidden border-white/80 bg-white/90">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="font-display text-3xl">
              Gestão de cardápio
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Cadastre categorias e produtos, ajuste preços e mantenha o menu do
              app de vendas sempre pronto para operar.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{String(cardapio.categories.length)} categorias</span>
            <span>{String(cardapio.products.length)} produtos</span>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Layers3Icon size={20} />
                Nova categoria
              </CardTitle>
              <CardDescription>
                Organize o cardápio com ordem de exibição, imagem e ativação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createCategoryAction.bind(null, slug)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="new-category-name" className="text-sm font-medium">
                    Nome da categoria
                  </label>
                  <Input id="new-category-name" name="name" placeholder="Ex.: Lanches especiais" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="new-category-order" className="text-sm font-medium">
                      Ordem
                    </label>
                    <Input id="new-category-order" name="displayOrder" type="number" min="0" defaultValue="0" required />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium">
                    <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
                    Categoria ativa
                  </label>
                </div>
                <div className="space-y-2">
                  <label htmlFor="new-category-image-url" className="text-sm font-medium">
                    URL da imagem
                  </label>
                  <Input id="new-category-image-url" name="imageUrl" placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <label htmlFor="new-category-image-file" className="text-sm font-medium">
                    Upload da imagem
                  </label>
                  <Input id="new-category-image-file" name="imageFile" type="file" accept="image/*" />
                </div>
                <SubmitButton className="w-full rounded-full" pendingText="Criando categoria...">
                  Criar categoria
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <PackagePlusIcon size={20} />
                Novo produto
              </CardTitle>
              <CardDescription>
                Cadastre produto com preço de venda, custo, ingredientes e estoque inicial.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createProductAction.bind(null, slug)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="new-product-name" className="text-sm font-medium">
                    Nome do produto
                  </label>
                  <Input id="new-product-name" name="name" placeholder="Ex.: Combo Big Burger" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="new-product-description" className="text-sm font-medium">
                    Descrição
                  </label>
                  <Textarea id="new-product-description" name="description" placeholder="Descreva o produto para o cliente..." required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="new-product-price" className="text-sm font-medium">
                      Preço de venda
                    </label>
                    <Input id="new-product-price" name="price" type="number" step="0.01" min="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-product-cost-price" className="text-sm font-medium">
                      Preço de custo
                    </label>
                    <Input id="new-product-cost-price" name="costPrice" type="number" step="0.01" min="0" defaultValue="0" required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="new-product-category" className="text-sm font-medium">
                      Categoria
                    </label>
                    <select id="new-product-category" name="menuCategoryId" className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm" required>
                      <option value="">Selecione uma categoria</option>
                      {cardapio.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-product-sku" className="text-sm font-medium">
                      SKU
                    </label>
                    <Input id="new-product-sku" name="sku" placeholder="Ex.: LAN-001" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="new-product-ingredients" className="text-sm font-medium">
                    Ingredientes
                  </label>
                  <Input id="new-product-ingredients" name="ingredients" placeholder="Separados por vírgula" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="new-product-image-url" className="text-sm font-medium">
                      URL da imagem
                    </label>
                    <Input id="new-product-image-url" name="imageUrl" placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-product-image-file" className="text-sm font-medium">
                      Upload da imagem
                    </label>
                    <Input id="new-product-image-file" name="imageFile" type="file" accept="image/*" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="new-product-stock" className="text-sm font-medium">
                      Estoque inicial
                    </label>
                    <Input id="new-product-stock" name="stockQuantity" type="number" min="0" defaultValue="0" required />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-product-threshold" className="text-sm font-medium">
                      Alerta de estoque baixo
                    </label>
                    <Input id="new-product-threshold" name="lowStockThreshold" type="number" min="0" defaultValue="0" required />
                  </div>
                </div>
                <div className="grid gap-3">
                  <label className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium">
                    <input type="checkbox" name="trackInventory" defaultChecked className="h-4 w-4" />
                    Controlar estoque deste produto
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium">
                    <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
                    Produto ativo para vendas
                  </label>
                </div>
                <SubmitButton className="w-full rounded-full" pendingText="Criando produto...">
                  Criar produto
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="text-2xl">Categorias cadastradas</CardTitle>
              <CardDescription>
                Atualize nomes, imagens, ordem de destaque e disponibilidade do cardápio.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {cardapio.categories.map((category) => (
                <Card key={category.id} className="border-slate-200 bg-slate-50/80">
                  <CardContent className="p-5">
                    <form action={updateCategoryAction.bind(null, slug)} className="space-y-4">
                      <input type="hidden" name="categoryId" value={category.id} />
                      <div className="grid gap-4 xl:grid-cols-[140px_minmax(0,1fr)]">
                        <div className="space-y-3">
                          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[24px] border bg-white">
                            {category.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                                <ImagePlusIcon size={18} />
                                Sem imagem
                              </div>
                            )}
                          </div>
                          <label className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-medium">
                            <input type="checkbox" name="isActive" defaultChecked={category.isActive} className="h-4 w-4" />
                            Ativa
                          </label>
                        </div>

                        <div className="grid gap-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Nome</label>
                              <Input name="name" defaultValue={category.name} required />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Ordem</label>
                              <Input name="displayOrder" type="number" min="0" defaultValue={String(category.displayOrder)} required />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">URL da imagem</label>
                            <Input name="imageUrl" defaultValue={category.imageUrl ?? ""} placeholder="https://..." />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Trocar imagem por upload</label>
                            <Input name="imageFile" type="file" accept="image/*" />
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <SubmitButton pendingText="Salvando categoria...">
                              Salvar categoria
                            </SubmitButton>
                          </div>
                        </div>
                      </div>
                    </form>

                    <form action={deleteCategoryAction.bind(null, slug)} className="mt-4">
                      <input type="hidden" name="categoryId" value={category.id} />
                      <Button type="submit" variant="outline" className="rounded-full text-rose-700">
                        <Trash2Icon size={16} />
                        Excluir categoria
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="text-2xl">Produtos cadastrados</CardTitle>
              <CardDescription>
                Edite rapidamente preço, custo, estoque inicial e visibilidade de venda.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {cardapio.products.map((product) => (
                <Card key={product.id} className="border-slate-200 bg-slate-50/80">
                  <CardContent className="p-5">
                    <form action={updateProductAction.bind(null, slug)} className="space-y-4">
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="currentImageUrl" value={product.imageUrl} />
                      <div className="grid gap-4 xl:grid-cols-[160px_minmax(0,1fr)]">
                        <div className="space-y-3">
                          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[28px] border bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          </div>
                          <label className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-medium">
                            <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="h-4 w-4" />
                            Produto ativo
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-medium">
                            <input type="checkbox" name="trackInventory" defaultChecked={product.trackInventory} className="h-4 w-4" />
                            Controlar estoque
                          </label>
                        </div>

                        <div className="grid gap-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Nome</label>
                              <Input name="name" defaultValue={product.name} required />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Categoria</label>
                              <select name="menuCategoryId" defaultValue={product.categoryId} className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm" required>
                                {cardapio.categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Descrição</label>
                            <Textarea name="description" defaultValue={product.description} required />
                          </div>
                          <div className="grid gap-4 lg:grid-cols-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Venda</label>
                              <Input name="price" type="number" step="0.01" min="0.01" defaultValue={String(product.price)} required />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Custo</label>
                              <Input name="costPrice" type="number" step="0.01" min="0" defaultValue={String(product.costPrice)} required />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Estoque</label>
                              <Input name="stockQuantity" type="number" min="0" defaultValue={String(product.stockQuantity)} required />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Alerta</label>
                              <Input name="lowStockThreshold" type="number" min="0" defaultValue={String(product.lowStockThreshold)} required />
                            </div>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">SKU</label>
                              <Input name="sku" defaultValue={product.sku ?? ""} placeholder="Ex.: LAN-001" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Ingredientes</label>
                              <Input name="ingredients" defaultValue={product.ingredients.join(", ")} placeholder="Separados por vírgula" />
                            </div>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">URL da imagem</label>
                              <Input name="imageUrl" defaultValue={product.imageUrl} placeholder="https://..." />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Trocar imagem por upload</label>
                              <Input name="imageFile" type="file" accept="image/*" />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <SubmitButton pendingText="Salvando produto...">
                              Salvar produto
                            </SubmitButton>
                          </div>
                        </div>
                      </div>
                    </form>

                    <form action={deleteProductAction.bind(null, slug)} className="mt-4">
                      <input type="hidden" name="productId" value={product.id} />
                      <Button type="submit" variant="outline" className="rounded-full text-rose-700">
                        <Trash2Icon size={16} />
                        Excluir produto
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default CardapioPage;
