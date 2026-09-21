import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  buscarCardapioGestao,
  buscarRestauranteParaGestao,
  listarRegrasLoyaltyGestao,
} from "@/lib/admin-queries";

import { CashbackClient } from "./_components/cashback-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Regras de Cashback | Gestão",
};

interface CashbackPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CashbackPage({ params }: CashbackPageProps) {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const [regras, cardapio] = await Promise.all([
    listarRegrasLoyaltyGestao(slug),
    buscarCardapioGestao(slug),
  ]);

  return (
    <CashbackClient
      slug={slug}
      regras={regras}
      categorias={cardapio?.categories ?? []}
      produtos={cardapio?.products ?? []}
    />
  );
}
