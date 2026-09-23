import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { FreteClient } from "./_components/frete-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Frete Grátis | Fidelização",
};

interface FretePageProps {
  params?: Promise<{ slug?: string }>;
}

export default async function FretePage({ params }: FretePageProps) {
  const resolvedParams = params ? await params : undefined;
  const slug = resolvedParams?.slug;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  return <FreteClient slug={slug || restaurant.slug} restaurant={restaurant} />;
}
