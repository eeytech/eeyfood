import { listarPedidosRecebimentoPorSlug, listarSetoresProducaoPorSlug } from "@fsw/db";
import { notFound } from "next/navigation";

import KdsPainel from "@/components/kds-painel";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface KdsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ setor?: string }>;
}

const KdsPage = async ({ params, searchParams }: KdsPageProps) => {
  const { slug } = await params;
  const { setor } = await searchParams;

  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const [orders, sectors] = await Promise.all([
    listarPedidosRecebimentoPorSlug(slug),
    listarSetoresProducaoPorSlug(slug),
  ]);

  return (
    <KdsPainel
      initialOrders={orders}
      slug={slug}
      sectors={sectors}
      initialSectorId={setor}
    />
  );
};

export default KdsPage;
