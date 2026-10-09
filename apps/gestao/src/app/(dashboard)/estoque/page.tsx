import { notFound } from "next/navigation";

import {
  buscarCardapioGestao,
  buscarRestauranteParaGestao,
  listarInventarioGestao,
  listarLotesGestao,
  listarPerdasGestao,
} from "@/lib/admin-queries";

import { EstoqueClient } from "./_components/estoque-client";

interface EstoquePageProps {
  params: Promise<{ slug?: string }>;
}

const EstoquePage = async ({ params }: EstoquePageProps) => {
  const resolvedParams = await params;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);
  const activeSlug = restaurant?.slug ?? resolvedParams?.slug ?? "";

  const [cardapio, inventoryItems, lotes, perdas] = await Promise.all([
    buscarCardapioGestao(activeSlug),
    listarInventarioGestao(activeSlug),
    listarLotesGestao(activeSlug),
    listarPerdasGestao(activeSlug),
  ]);

  if (!cardapio) {
    return notFound();
  }

  return (
    <EstoqueClient
      slug={activeSlug}
      products={cardapio.products}
      inventoryItems={inventoryItems}
      lotes={lotes}
      perdas={perdas}
    />
  );
};

export default EstoquePage;
