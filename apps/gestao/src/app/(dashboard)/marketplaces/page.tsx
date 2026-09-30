import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { getSession } from "@/lib/auth/session";
import { buscarIntegracoesMarketplaceAction } from "./marketplaces-actions";
import { MarketplacesClient } from "./marketplaces-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplaces e iFood | Gestão",
  description: "Conecte sua loja ao iFood, Rappi e 99Food para receber pedidos centralizados no seu PDV e KDS.",
};

interface MarketplacesPageProps {
  params?: Promise<{ slug?: string }>;
}

export default async function MarketplacesPage({ params }: MarketplacesPageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    return notFound();
  }

  const session = await getSession();
  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const { integracoes, recentMarketplaceOrdersCount } =
    await buscarIntegracoesMarketplaceAction(restaurant.slug);

  return (
    <MarketplacesClient
      slug={restaurant.slug}
      integracoes={integracoes}
      recentMarketplaceOrdersCount={recentMarketplaceOrdersCount}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
