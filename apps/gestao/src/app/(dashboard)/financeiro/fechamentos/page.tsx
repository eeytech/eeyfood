import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { listarFechamentosAction } from "./fechamento-actions";
import { FechamentosClient } from "./fechamentos-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fechamento Contábil de Competência (DRE) | Gestão",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

const FechamentosPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const [restaurant, fechamentosData] = await Promise.all([
    buscarRestauranteParaGestao(slug),
    listarFechamentosAction(slug),
  ]);

  if (!restaurant) return notFound();

  return (
    <FechamentosClient
      slug={slug}
      initialClosings={fechamentosData.closings}
      kpis={fechamentosData.kpis}
    />
  );
};

export default FechamentosPage;
