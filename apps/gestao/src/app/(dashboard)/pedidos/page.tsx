import { buscarRestauranteUnico, listarPedidosRecebimentoPorSlug } from "@fsw/db";
import { notFound } from "next/navigation";

import PainelPedidos from "@/components/painel-pedidos";

export const dynamic = "force-dynamic";

const PedidosPage = async () => {
  const restaurant = await buscarRestauranteUnico();
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
