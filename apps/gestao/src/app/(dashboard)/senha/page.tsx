import { listarPedidosRecebimentoPorSlug } from "@fsw/db";
import { notFound } from "next/navigation";

import SenhaPainel from "@/components/senha-painel";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface SenhaPageProps {
  params: Promise<{ slug: string }>;
}

const SenhaPage = async ({ params }: SenhaPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const orders = await listarPedidosRecebimentoPorSlug(slug);

  return (
    <SenhaPainel
      slug={slug}
      restaurantName={restaurant.name}
      initialOrders={orders}
    />
  );
};

export default SenhaPage;
