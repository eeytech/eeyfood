import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarRestauranteParaGestao, listarContasBancariasGestao } from "@/lib/admin-queries";
import { ContasBancariasClient } from "./_components/contas-bancarias-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contas Bancárias | Gestão",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

const ContasBancariasPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const [restaurant, contas] = await Promise.all([
    buscarRestauranteParaGestao(slug),
    listarContasBancariasGestao(slug),
  ]);

  if (!restaurant) return notFound();

  return <ContasBancariasClient slug={slug} contas={contas} />;
};

export default ContasBancariasPage;
