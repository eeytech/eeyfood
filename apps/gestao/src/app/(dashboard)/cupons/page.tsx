import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  buscarRestauranteParaGestao,
  listarCuponsGestao,
} from "@/lib/admin-queries";

import { CuponsClient } from "./_components/cupons-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cupons de Desconto | Gestão",
};

interface CuponsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CuponsPage({ params }: CuponsPageProps) {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const cupons = await listarCuponsGestao(slug);

  return <CuponsClient slug={slug} cupons={cupons} />;
}
