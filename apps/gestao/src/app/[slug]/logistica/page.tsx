import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao, listarCouriersGestao } from "@/lib/admin-queries";

import { LogisticaClient } from "./_components/logistica-client";

interface LogisticaPageProps {
  params: Promise<{ slug: string }>;
}

const LogisticaPage = async ({ params }: LogisticaPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);
  const couriers = await listarCouriersGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  return (
    <main className="space-y-4">
      <LogisticaClient slug={slug} couriers={couriers} />
    </main>
  );
};

export default LogisticaPage;
