import { notFound } from "next/navigation";

import { buscarCardapioGestao } from "@/lib/admin-queries";

import { CardapioClient } from "./_components/cardapio-client";

interface CardapioPageProps {
  params: Promise<{ slug: string }>;
}

const CardapioPage = async ({ params }: CardapioPageProps) => {
  const { slug } = await params;
  const cardapio = await buscarCardapioGestao(slug);

  if (!cardapio) {
    return notFound();
  }

  return (
    <main className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Cardápio</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie produtos e categorias do cardápio do seu restaurante.
        </p>
      </div>
      <CardapioClient slug={slug} cardapio={cardapio} />
    </main>
  );
};

export default CardapioPage;
