import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { db, eq, marketingSettingsTable } from "@fsw/db";
import { salvarMarketingSettingsAction } from "../marketing-actions";
import { MarketingSettingsForm } from "./marketing-settings-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rastreamento de Marketing | Gestão",
};

interface PageProps {
  params?: Promise<{ slug?: string }>;
}

export default async function MarketingPage({ params }: PageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    notFound();
  }

  const restaurantSlug = restaurant.slug;

  const settings = await db.query.marketingSettingsTable.findFirst({
    where: eq(marketingSettingsTable.restaurantId, restaurant.id),
  });

  async function save(formData: FormData) {
    "use server";
    return salvarMarketingSettingsAction(restaurantSlug, formData);
  }

  return (
    <MarketingSettingsForm
      key={settings?.updatedAt ? new Date(settings.updatedAt).getTime() : "initial"}
      settings={settings ?? null}
      saveAction={save}
    />
  );
}
