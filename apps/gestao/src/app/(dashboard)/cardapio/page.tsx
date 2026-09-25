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

  return <CardapioClient slug={slug} cardapio={cardapio} />;
};

export default CardapioPage;
