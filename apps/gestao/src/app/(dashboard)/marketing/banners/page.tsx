import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { buscarRestauranteComCardapioPorSlug } from "@fsw/db";
import { BannersGeneratorClient } from "./banners-generator-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gerador de Banners para Redes Sociais | Marketing",
};

interface PageProps {
  params?: Promise<{ slug?: string }>;
}

export default async function MarketingBannersPage({ params }: PageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    notFound();
  }

  const cardapioData = await buscarRestauranteComCardapioPorSlug(restaurant.slug);

  return (
    <BannersGeneratorClient
      slug={restaurant.slug}
      restaurantName={restaurant.name}
      restaurantLogo={restaurant.avatarImageUrl}
      menuCategories={cardapioData?.menuCategories || []}
    />
  );
}
