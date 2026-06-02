import {
  BanknoteIcon,
  CheckCircle2Icon,
  PlusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  XCircleIcon,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  createFinancialCategoryAction,
  createTransactionAction,
  updateTransactionStatusAction,
} from "@/app/[slug]/financeiro-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  buscarRestauranteParaGestao,
  listarCategoriasFinanceirasGestao,
  listarTransacoesFinanceirasPorSlug,
} from "@/lib/admin-queries";

interface FinanceiroPageProps {
  params: Promise<{ slug: string }>;
}

const FinanceiroPage = async ({ params }: FinanceiroPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);
  const transacoes = await listarTransacoesFinanceirasPorSlug(slug);
  const categorias = await listarCategoriasFinanceirasGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
  };

  const receitasPendentes = transacoes
    .filter(
      (t) =>
        t.transaction.type === "REVENUE" && t.transaction.status === "PENDING",
    )
    .reduce((acc, t) => acc + t.transaction.amount, 0);

  const despesasPendentes = transacoes
    .filter(
      (t) =>
        t.transaction.type === "EXPENSE" && t.transaction.status === "PENDING",
    )
    .reduce((acc, t) => acc + t.transaction.amount, 0);

  return (
    <main className="space-y-4">
      <Card className="overflow-hidden border-white/80 bg-white/90">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="font-display text-3xl">
              Gestão Financeira
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Controle suas contas a pagar e receber, categorize despesas e
              acompanhe o fluxo de caixa.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-100 bg-emerald-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-700">
              Receitas a Receber
              </CardDescription>
            <CardTitle className="text-2xl text-emerald-900">
              {formatCurrency(receitasPendentes)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-rose-100 bg-rose-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-rose-700">
              Contas a Pagar
              </CardDescription>
            <CardTitle className="text-2xl text-rose-900">
              {formatCurrency(despesasPendentes)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <PlusIcon size={20} />
                Nova Transação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={createTransactionAction.bind(null, slug)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição</label>
                  <Input
                    name="description"
                    placeholder="Ex.: Aluguel, Compra de Carne"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor</label>
                    <Input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vencimento</label>
                    <Input name="dueDate" type="date" required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <select
                      name="type"
                      className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm"
                      required
                    >
                      <option value="EXPENSE">Despesa (Pagar)</option>
                      <option value="REVENUE">Receita (Receber)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status Inicial</label>
                    <select
                      name="status"
                      className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm"
                      required
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="PAID">Pago / Recebido</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoria</label>
                  <select
                    name="categoryId"
                    className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.type === "REVENUE" ? "Rec." : "Desp."})
                      </option>
                    ))}
                  </select>
                </div>
                <SubmitButton
                  className="w-full rounded-full"
                  pendingText="Salvando..."
                >
                  Lançar Transação
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Nova Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={createFinancialCategoryAction.bind(null, slug)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Nome da Categoria
                  </label>
                  <Input
                    name="name"
                    placeholder="Ex.: Insumos, Pessoal, Infra"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <select
                    name="type"
                    className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm"
                    required
                  >
                    <option value="EXPENSE">Despesa</option>
                    <option value="REVENUE">Receita</option>
                  </select>
                </div>
                <SubmitButton
                  className="w-full rounded-full"
                  variant="outline"
                  pendingText="Criando..."
                >
                  Criar Categoria
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
            <CardDescription>
              Acompanhe os lançamentos recentes do restaurante.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-3 text-left">Data</th>
                    <th className="px-2 py-3 text-left">Descrição</th>
                    <th className="px-2 py-3 text-left">Categoria</th>
                    <th className="px-2 py-3 text-right">Valor</th>
                    <th className="px-2 py-3 text-center">Status</th>
                    <th className="px-2 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.map((item) => (
                    <tr
                      key={item.transaction.id}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="px-2 py-3">
                        {formatDate(item.transaction.dueDate)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          {item.transaction.type === "REVENUE" ? (
                            <TrendingUpIcon
                              size={14}
                              className="text-emerald-600"
                            />
                          ) : (
                            <TrendingDownIcon
                              size={14}
                              className="text-rose-600"
                            />
                          )}
                          {item.transaction.description}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {item.category?.name ?? "Geral"}
                      </td>
                      <td
                        className={`px-2 py-3 text-right font-medium ${item.transaction.type === "REVENUE" ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        {item.transaction.type === "REVENUE" ? "+" : "-"}{" "}
                        {formatCurrency(item.transaction.amount)}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <Badge
                          variant={
                            item.transaction.status === "PAID"
                              ? "success"
                              : item.transaction.status === "CANCELLED"
                                ? "danger"
                                : "secondary"
                          }
                        >
                          {item.transaction.status === "PAID"
                            ? "Pago"
                            : item.transaction.status === "CANCELLED"
                              ? "Cancelado"
                              : "Pendente"}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-right">
                        {item.transaction.status === "PENDING" && (
                          <div className="flex justify-end gap-1">
                            <form
                              action={updateTransactionStatusAction.bind(
                                null,
                                slug,
                                item.transaction.id,
                                "PAID",
                              )}
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-emerald-600"
                                title="Marcar como Pago"
                              >
                                <CheckCircle2Icon size={16} />
                              </Button>
                            </form>
                            <form
                              action={updateTransactionStatusAction.bind(
                                null,
                                slug,
                                item.transaction.id,
                                "CANCELLED",
                              )}
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-rose-600"
                                title="Cancelar"
                              >
                                <XCircleIcon size={16} />
                              </Button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transacoes.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <BanknoteIcon size={40} className="mx-auto mb-3 opacity-20" />
                  <p>Nenhuma transação lançada ainda.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default FinanceiroPage;
