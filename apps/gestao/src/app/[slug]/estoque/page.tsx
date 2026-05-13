import { AlertTriangleIcon, BoxesIcon, ScanLineIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { updateStockAction } from "@/app/[slug]/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { buscarCardapioGestao } from "@/lib/admin-queries";

interface EstoquePageProps {
  params: Promise<{ slug: string }>;
}

const EstoquePage = async ({ params }: EstoquePageProps) => {
  const { slug } = await params;
  const cardapio = await buscarCardapioGestao(slug);

  if (!cardapio) {
    return notFound();
  }

  const lowStockProducts = cardapio.products.filter(
    (product) => product.trackInventory && product.stockQuantity <= product.lowStockThreshold,
  );

  return (
    <main className="space-y-4">
      <Card className="overflow-hidden border-white/80 bg-white/90">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="font-display text-3xl">Estoque</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Ajuste quantidades, acompanhe alertas de ruptura e mantenha o PDV
              pronto para vender sem surpresas.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{String(cardapio.products.length)} SKUs ativos no cadastro</span>
            <span>{String(lowStockProducts.length)} alertas de baixo estoque</span>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Produtos monitorados</p>
              <p className="font-display text-3xl font-semibold">
                {String(cardapio.products.filter((product) => product.trackInventory).length)}
              </p>
            </div>
            <BoxesIcon className="text-primary" />
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Baixo estoque</p>
              <p className="font-display text-3xl font-semibold">
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
                {String(cardapio.products.filter((product) => !product.trackInventory).length)}
              </p>
            </div>
            <ScanLineIcon className="text-slate-500" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="text-2xl">Ajustes rápidos de estoque</CardTitle>
          <CardDescription>
            Atualize quantidade disponível e ponto de alerta. Cada alteração gera
            um registro de movimentação quando houver diferença de saldo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {cardapio.products.map((product) => {
            const isLowStock =
              product.trackInventory &&
              product.stockQuantity <= product.lowStockThreshold;

            return (
              <Card key={product.id} className="border-slate-200 bg-slate-50/80">
                <CardContent className="p-5">
                  <form action={updateStockAction.bind(null, slug)} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
                    <input type="hidden" name="productId" value={product.id} />

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">{product.categoryName}</p>
                          <h3 className="text-xl font-semibold">{product.name}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={product.trackInventory ? "secondary" : "warning"}>
                            {product.trackInventory ? "Monitorado" : "Sem controle"}
                          </Badge>
                          {isLowStock ? (
                            <Badge variant="danger">Baixo estoque</Badge>
                          ) : (
                            <Badge variant="success">Saldo saudável</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-[24px] border bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Saldo atual
                          </p>
                          <p className="mt-2 text-2xl font-semibold">
                            {String(product.stockQuantity)}
                          </p>
                        </div>
                        <div className="rounded-[24px] border bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Alerta
                          </p>
                          <p className="mt-2 text-2xl font-semibold">
                            {String(product.lowStockThreshold)}
                          </p>
                        </div>
                        <div className="rounded-[24px] border bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            SKU
                          </p>
                          <p className="mt-2 text-lg font-semibold">
                            {product.sku || "Não informado"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nova quantidade</label>
                          <Input name="stockQuantity" type="number" min="0" defaultValue={String(product.stockQuantity)} required />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Novo alerta</label>
                          <Input name="lowStockThreshold" type="number" min="0" defaultValue={String(product.lowStockThreshold)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Motivo do ajuste</label>
                        <Input name="reason" placeholder="Ex.: Reposição do fornecedor, contagem de estoque..." required />
                      </div>
                      <SubmitButton className="rounded-full" pendingText="Atualizando estoque...">
                        Atualizar estoque
                      </SubmitButton>
                    </div>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
};

export default EstoquePage;
