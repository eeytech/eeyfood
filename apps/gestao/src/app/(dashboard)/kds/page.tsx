import { listarPedidosRecebimentoPorSlug, listarSetoresProducaoPorSlug } from "@fsw/db";
import { notFound } from "next/navigation";

import KdsPainel from "@/components/kds-painel";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface KdsPageProps {
  params?: Promise<{ slug?: string }>;
  searchParams: Promise<{ setor?: string }>;
}

const KdsPage = async ({ params, searchParams }: KdsPageProps) => {
  const resolvedParams = params ? await params : undefined;
  const { setor } = await searchParams;

  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    return notFound();
  }

  const [orders, sectors] = await Promise.all([
    listarPedidosRecebimentoPorSlug(restaurant.slug),
    listarSetoresProducaoPorSlug(restaurant.slug),
  ]);

  return (
    <KdsPainel
      initialOrders={orders}
      slug={restaurant.slug}
      sectors={sectors}
      initialSectorId={setor}
    />
  );
};

export default KdsPage;
