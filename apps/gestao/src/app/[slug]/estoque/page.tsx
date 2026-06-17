import { notFound } from "next/navigation";

import { buscarCardapioGestao } from "@/lib/admin-queries";

import { EstoqueClient } from "./_components/estoque-client";

interface EstoquePageProps {
  params: Promise<{ slug: string }>;
}

const EstoquePage = async ({ params }: EstoquePageProps) => {
  const { slug } = await params;
  const cardapio = await buscarCardapioGestao(slug);

  if (!cardapio) {
    return notFound();
  }

  return (
    <main className="space-y-4">
      <EstoqueClient slug={slug} products={cardapio.products} />
    </main>
  );
};

export default EstoquePage;
