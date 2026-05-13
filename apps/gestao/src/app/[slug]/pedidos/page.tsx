import { listarPedidosRecebimentoPorSlug } from "@fsw/db";
import { notFound } from "next/navigation";

import PainelPedidos from "@/components/painel-pedidos";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface PedidosPageProps {
  params: Promise<{ slug: string }>;
}

const PedidosPage = async ({ params }: PedidosPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);
  const orders = await listarPedidosRecebimentoPorSlug(slug);

  if (!restaurant) {
    return notFound();
  }

  return (
    <PainelPedidos
      initialOrders={orders}
      restaurantName={restaurant.name}
      slug={slug}
    />
  );
};

export default PedidosPage;
