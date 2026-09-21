import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao, listarMesasGestao } from "@/lib/admin-queries";

import { MesasClient } from "./_components/mesas-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestão de Mesas | Gestão",
};

interface MesasPageProps {
  params: Promise<{ slug: string }>;
}

export default async function MesasPage({ params }: MesasPageProps) {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const tables = await listarMesasGestao(slug);

  return <MesasClient slug={slug} tables={tables} />;
}
