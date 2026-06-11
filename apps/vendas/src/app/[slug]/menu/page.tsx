import { redirect } from "next/navigation";

import { buscarRestauranteComCardapioPorSlug } from "@/lib/db";

import RestaurantMenuPageContent from "./components/menu-page-content";

interface RestaurantMenuPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ consumptionMethod: string }>;
}

const isConsumptionMethodValid = (consumptionMethod: string) => {
  return ["DINE_IN", "TAKEAWAY", "DELIVERY"].includes(
    consumptionMethod.toUpperCase(),
  );
};

const RestaurantMenuPage = async ({
  params,
  searchParams,
}: RestaurantMenuPageProps) => {
  const { slug } = await params;
  const { consumptionMethod } = await searchParams;

  if (!isConsumptionMethodValid(consumptionMethod)) {
    return redirect("/?error=not_found");
  }

  const restaurant = await buscarRestauranteComCardapioPorSlug(slug);

  if (!restaurant) {
    return redirect("/?error=not_found");
  }

  return <RestaurantMenuPageContent restaurant={restaurant} />;
};

export default RestaurantMenuPage;
