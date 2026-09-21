import { listarPedidosRecebimentoPorSlug } from "@fsw/db";
import { notFound } from "next/navigation";

import SenhaPainel from "@/components/senha-painel";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface SenhaPageProps {
  params?: Promise<{ slug?: string }>;
}

const SenhaPage = async ({ params }: SenhaPageProps) => {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    return notFound();
  }

  const orders = await listarPedidosRecebimentoPorSlug(restaurant.slug);

  return (
    <SenhaPainel
      slug={restaurant.slug}
      restaurantName={restaurant.name}
      initialOrders={orders}
    />
  );
};

export default SenhaPage;
