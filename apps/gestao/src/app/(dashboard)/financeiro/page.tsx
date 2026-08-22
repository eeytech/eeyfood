import { notFound } from "next/navigation";

import {
  buscarRestauranteParaGestao,
  listarCategoriasFinanceirasGestao,
  listarTransacoesFinanceirasPorSlug,
} from "@/lib/admin-queries";

import { FinanceiroClient } from "./_components/financeiro-client";

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
      <FinanceiroClient
        slug={slug}
        transacoes={transacoes}
        categorias={categorias}
        receitasPendentes={receitasPendentes}
        despesasPendentes={despesasPendentes}
      />
    </main>
  );
};

export default FinanceiroPage;
