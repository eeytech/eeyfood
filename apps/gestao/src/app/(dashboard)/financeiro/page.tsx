import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  buscarRestauranteParaGestao,
  listarCategoriasFinanceirasGestao,
  listarTransacoesFinanceirasPorSlug,
} from "@/lib/admin-queries";
import { listarGarconsComMetricasAction } from "@/app/(dashboard)/configuracoes/garcons-actions";

import { FinanceiroClient } from "./_components/financeiro-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestão Financeira | Gestão",
};

interface FinanceiroPageProps {
  params: Promise<{ slug: string }>;
}

const FinanceiroPage = async ({ params }: FinanceiroPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);
  const transacoes = await listarTransacoesFinanceirasPorSlug(slug);
  const categorias = await listarCategoriasFinanceirasGestao(slug);
  const garconsData = await listarGarconsComMetricasAction(slug);

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
    <FinanceiroClient
      slug={slug}
      transacoes={transacoes}
      categorias={categorias}
      garcons={garconsData.garcons}
      receitasPendentes={receitasPendentes}
      despesasPendentes={despesasPendentes}
    />
  );
};

export default FinanceiroPage;
