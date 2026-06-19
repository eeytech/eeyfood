import { notFound } from "next/navigation";

import {
  buscarRestauranteParaGestao,
  listarCuponsGestao,
} from "@/lib/admin-queries";

import { CuponsClient } from "./_components/cupons-client";

interface CuponsPageProps {
  params: Promise<{ slug: string }>;
}

const CuponsPage = async ({ params }: CuponsPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const cupons = await listarCuponsGestao(slug);

  return (
    <main className="space-y-4">
      <CuponsClient slug={slug} cupons={cupons} />
    </main>
  );
};

export default CuponsPage;
