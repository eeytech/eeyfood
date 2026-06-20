import { listarPedidosRecebimentoPorSlug } from "@fsw/db";
import { notFound } from "next/navigation";

import KdsPainel from "@/components/kds-painel";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface KdsPageProps {
  params: Promise<{ slug: string }>;
}

const KdsPage = async ({ params }: KdsPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const orders = await listarPedidosRecebimentoPorSlug(slug);

  return <KdsPainel initialOrders={orders} slug={slug} />;
};

export default KdsPage;
