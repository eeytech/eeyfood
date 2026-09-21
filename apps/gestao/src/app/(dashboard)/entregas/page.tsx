import { listarCouriersPorSlug, listarPedidosRecebimentoPorSlug } from "@fsw/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import EntregasPainel from "@/components/entregas-painel";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel de Entregas & Expedição | Gestão",
  description:
    "Organização e despacho em tempo real de pedidos de delivery para entregadores e expedição.",
};

interface EntregasPageProps {
  params?: Promise<{ slug?: string }>;
}

const EntregasPage = async ({ params }: EntregasPageProps) => {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    return notFound();
  }

  const [orders, couriers] = await Promise.all([
    listarPedidosRecebimentoPorSlug(restaurant.slug),
    listarCouriersPorSlug(restaurant.slug),
  ]);

  return (
    <EntregasPainel
      initialOrders={orders}
      initialCouriers={couriers}
      slug={restaurant.slug}
      restaurantName={restaurant.name}
    />
  );
};

export default EntregasPage;
