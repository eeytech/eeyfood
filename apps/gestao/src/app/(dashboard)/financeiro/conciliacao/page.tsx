import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buscarRestauranteParaGestao,
  listarContasBancariasGestao,
} from "@/lib/admin-queries";
import { ConciliacaoClient } from "./_components/conciliacao-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conciliação OFX | Gestão",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

const ConciliacaoPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const [restaurant, contas] = await Promise.all([
    buscarRestauranteParaGestao(slug),
    listarContasBancariasGestao(slug),
  ]);

  if (!restaurant) return notFound();

  return <ConciliacaoClient slug={slug} contas={contas} />;
};

export default ConciliacaoPage;
