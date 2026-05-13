import { buscarRestaurantePorSlug, listarPedidosRecebimentoPorSlug } from "@fsw/db";
import { notFound } from "next/navigation";

import PainelPedidos from "@/components/painel-pedidos";

export const dynamic = "force-dynamic";

interface GestaoPageProps {
  params: Promise<{ slug: string }>;
}

const GestaoPage = async ({ params }: GestaoPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestaurantePorSlug(slug);
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

export default GestaoPage;
