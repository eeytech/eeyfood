import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao, listarMesasGestao } from "@/lib/admin-queries";

import { MesasClient } from "./_components/mesas-client";

interface MesasPageProps {
  params: Promise<{ slug: string }>;
}

const MesasPage = async ({ params }: MesasPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);
  const tables = await listarMesasGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  return (
    <main className="space-y-4">
      <MesasClient slug={slug} tables={tables} />
    </main>
  );
};

export default MesasPage;
