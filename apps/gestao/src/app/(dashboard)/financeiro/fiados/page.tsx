import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buscarRestauranteParaGestao,
  listarFiadosGestao,
  listarContasBancariasGestao,
} from "@/lib/admin-queries";
import { FiadosClient } from "./_components/fiados-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Livro de Fiados | Gestão",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

const FiadosPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const [restaurant, fiados, contas] = await Promise.all([
    buscarRestauranteParaGestao(slug),
    listarFiadosGestao(slug),
    listarContasBancariasGestao(slug),
  ]);

  if (!restaurant) return notFound();

  return <FiadosClient slug={slug} fiados={fiados} contas={contas} />;
};

export default FiadosPage;
