import { notFound } from "next/navigation";

import { buscarCardapioGestao, listarInventarioGestao, listarLotesGestao, listarPerdasGestao } from "@/lib/admin-queries";

import { EstoqueClient } from "./_components/estoque-client";

interface EstoquePageProps {
  params: Promise<{ slug: string }>;
}

const EstoquePage = async ({ params }: EstoquePageProps) => {
  const { slug } = await params;
  const [cardapio, inventoryItems, lotes, perdas] = await Promise.all([
    buscarCardapioGestao(slug),
    listarInventarioGestao(slug),
    listarLotesGestao(slug),
    listarPerdasGestao(slug),
  ]);

  if (!cardapio) {
    return notFound();
  }

  return (
    <main className="space-y-4">
      <EstoqueClient
        slug={slug}
        products={cardapio.products}
        inventoryItems={inventoryItems}
        lotes={lotes}
        perdas={perdas}
      />
    </main>
  );
};

export default EstoquePage;
