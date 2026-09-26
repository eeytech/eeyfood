import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarCardapioGestao, buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { CardapioImpressaoClient } from "./_components/cardapio-impressao-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Impressão de Cardápio | Gestão",
  description: "Personalize e imprima o cardápio do seu restaurante em alta qualidade.",
};

interface ImpressaoPageProps {
  params: Promise<{ slug?: string }>;
}

export default async function ImpressaoCardapioPage({ params }: ImpressaoPageProps) {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const cardapio = await buscarCardapioGestao(slug || restaurant.slug);

  if (!cardapio) {
    return notFound();
  }

  return (
    <CardapioImpressaoClient
      slug={restaurant.slug}
      restaurant={restaurant}
      initialCategories={cardapio.categories}
    />
  );
}
