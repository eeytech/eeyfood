import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  buscarRestauranteParaGestao,
  listarCategoriasFinanceirasGestao,
  listarTransacoesFinanceirasPorSlug,
} from "@/lib/admin-queries";
import { listarGarconsComMetricasAction } from "@/app/(dashboard)/configuracoes/garcons-actions";
import {
  listarFuncionariosAction,
  listarPagamentosFuncionariosAction,
} from "@/app/(dashboard)/configuracoes/funcionarios-actions";

import { FinanceiroClient } from "./_components/financeiro-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestão Financeira e Pagamentos | Gestão",
};

interface FinanceiroPageProps {
  params: Promise<{ slug: string }>;
}

const FinanceiroPage = async ({ params }: FinanceiroPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const [
    transacoes,
    categorias,
    garconsData,
    funcionariosRes,
    pagamentosFuncionarios,
  ] = await Promise.all([
    listarTransacoesFinanceirasPorSlug(slug),
    listarCategoriasFinanceirasGestao(slug),
    listarGarconsComMetricasAction(slug).catch(() => ({ garcons: [] })),
    listarFuncionariosAction(slug).catch(() => ({
      funcionarios: [],
      totalFolhaBase: 0,
      totalAtivos: 0,
    })),
    listarPagamentosFuncionariosAction(slug).catch(() => []),
  ]);

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
      funcionarios={funcionariosRes.funcionarios}
      pagamentosFuncionarios={pagamentosFuncionarios}
      receitasPendentes={receitasPendentes}
      despesasPendentes={despesasPendentes}
    />
  );
};

export default FinanceiroPage;
