import { BarChart3Icon, PackageSearchIcon, TrendingUpIcon, WalletCardsIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { gerarRelatorioBasico } from "@/lib/admin-queries";

interface RelatoriosPageProps {
  params: Promise<{ slug: string }>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
};

const RelatoriosPage = async ({ params }: RelatoriosPageProps) => {
  const { slug } = await params;
  const report = await gerarRelatorioBasico(slug);

  if (!report) {
    return notFound();
  }

  return (
    <main className="space-y-4">
      <Card className="overflow-hidden border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Relatórios</CardTitle>
          <CardDescription className="max-w-2xl text-base">
            Visão rápida de faturamento diário, lucro estimado com base no custo e
            desempenho dos produtos mais vendidos.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Faturamento do dia</p>
              <p className="font-display text-3xl font-semibold">
                {formatCurrency(report.today.grossRevenue)}
              </p>
            </div>
            <WalletCardsIcon className="text-primary" />
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Lucro estimado</p>
              <p className="font-display text-3xl font-semibold">
                {formatCurrency(report.today.estimatedProfit)}
              </p>
            </div>
            <TrendingUpIcon className="text-emerald-600" />
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Custo estimado</p>
              <p className="font-display text-3xl font-semibold">
                {formatCurrency(report.today.estimatedCost)}
              </p>
            </div>
            <BarChart3Icon className="text-amber-500" />
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Pedidos do dia</p>
              <p className="font-display text-3xl font-semibold">
                {String(report.today.totalOrders)}
              </p>
            </div>
            <PackageSearchIcon className="text-slate-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.25fr)_420px]">
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="text-2xl">Histórico diário</CardTitle>
            <CardDescription>
              Resumo operacional dos dias com pedidos elegíveis para receita.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-3 font-medium">Data</th>
                  <th className="px-2 py-3 font-medium">Pedidos</th>
                  <th className="px-2 py-3 font-medium">Faturamento</th>
                  <th className="px-2 py-3 font-medium">Custo estimado</th>
                  <th className="px-2 py-3 font-medium">Lucro estimado</th>
                </tr>
              </thead>
              <tbody>
                {report.history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-10 text-center text-muted-foreground">
                      Ainda não há dados suficientes para gerar o histórico.
                    </td>
                  </tr>
                ) : (
                  report.history.map((row) => (
                    <tr key={row.referenceDate} className="border-b last:border-0">
                      <td className="px-2 py-4 font-medium">{formatDate(row.referenceDate)}</td>
                      <td className="px-2 py-4">{String(row.totalOrders)}</td>
                      <td className="px-2 py-4">{formatCurrency(row.grossRevenue)}</td>
                      <td className="px-2 py-4">{formatCurrency(row.estimatedCost)}</td>
                      <td className="px-2 py-4">{formatCurrency(row.estimatedProfit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="text-2xl">Produtos mais vendidos</CardTitle>
            <CardDescription>
              Ranking consolidado por quantidade vendida.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.topProducts.length === 0 ? (
              <div className="rounded-[28px] border border-dashed bg-slate-50 px-5 py-10 text-center text-sm text-muted-foreground">
                Nenhum produto vendido ainda.
              </div>
            ) : (
              report.topProducts.map((product, index) => (
                <div key={product.productId} className="rounded-[28px] border bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        #{String(index + 1)}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">{product.productName}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Receita</p>
                      <p className="font-semibold">{formatCurrency(product.grossRevenue)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {String(product.totalQuantity)} unidades vendidas
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default RelatoriosPage;
