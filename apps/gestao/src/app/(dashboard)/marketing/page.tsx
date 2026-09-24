import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { db, eq, marketingSettingsTable } from "@fsw/db";
import { salvarMarketingSettingsAction } from "../marketing-actions";
import { MarketingSettingsForm } from "./marketing-settings-form";

export const dynamic = "force-dynamic";

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
    <MarketingSettingsForm settings={settings ?? null} saveAction={save} />
  );
}
