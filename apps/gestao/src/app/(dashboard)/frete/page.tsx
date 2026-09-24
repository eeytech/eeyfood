import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  buscarCardapioGestao,
  buscarRestauranteParaGestao,
  listarRegrasFreteGratisGestao,
} from "@/lib/admin-queries";
import { FreteClient } from "./_components/frete-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Frete Grátis | Fidelização",
};

interface FretePageProps {
  params: Promise<{ slug: string }>;
}

export default async function FretePage({ params }: FretePageProps) {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const [regras, cardapio] = await Promise.all([
    listarRegrasFreteGratisGestao(slug),
    buscarCardapioGestao(slug),
  ]);

  return (
    <FreteClient
      slug={slug}
      restaurant={restaurant}
      regras={regras}
      categorias={cardapio?.categories ?? []}
      produtos={cardapio?.products ?? []}
    />
  );
}
