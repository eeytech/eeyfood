import { notFound } from "next/navigation";

import {
  buscarCardapioGestao,
  buscarRestauranteParaGestao,
  listarRegrasLoyaltyGestao,
} from "@/lib/admin-queries";

import { CashbackClient } from "./_components/cashback-client";

interface CashbackPageProps {
  params: Promise<{ slug: string }>;
}

const CashbackPage = async ({ params }: CashbackPageProps) => {
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
    <main className="space-y-4">
      <CashbackClient
        slug={slug}
        regras={regras}
        categorias={cardapio?.categories ?? []}
        produtos={cardapio?.products ?? []}
      />
    </main>
  );
};

export default CashbackPage;
