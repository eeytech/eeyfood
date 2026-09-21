import { listarPedidosRecebimentoPorSlug } from "@fsw/db";
import { notFound } from "next/navigation";

import PainelPedidos from "@/components/painel-pedidos";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface PedidosPageProps {
  params?: Promise<{ slug?: string }>;
}

const PedidosPage = async ({ params }: PedidosPageProps) => {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    return notFound();
  }

  const orders = await listarPedidosRecebimentoPorSlug(restaurant.slug);

  return (
    <PainelPedidos
      initialOrders={orders}
      slug={restaurant.slug}
    />
  );
};

export default PedidosPage;
