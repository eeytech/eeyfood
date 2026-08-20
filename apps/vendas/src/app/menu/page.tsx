import { unstable_cache } from "next/cache";

import { buscarRestauranteComCardapioPorSlug, buscarRestauranteUnico } from "@/lib/db";

import RestaurantMenuPageContent from "./components/menu-page-content";

const buscarMenuCached = () =>
  unstable_cache(
    async () => {
      const restaurant = await buscarRestauranteUnico();
      if (!restaurant) return null;
      return buscarRestauranteComCardapioPorSlug(restaurant.slug);
    },
    ["restaurant-menu-single-store"],
    { revalidate: 300, tags: ["restaurant-menu"] },
  )();

interface RestaurantMenuPageProps {
  searchParams: Promise<{ consumptionMethod?: string; tableId?: string; mode?: string }>;
}

const isConsumptionMethodValid = (consumptionMethod?: string) => {
  if (!consumptionMethod) return false;
  return ["DINE_IN", "TAKEAWAY", "DELIVERY"].includes(
    consumptionMethod.toUpperCase(),
  );
};

const RestaurantMenuPage = async ({
  searchParams,
}: RestaurantMenuPageProps) => {
  const { consumptionMethod, tableId, mode } = await searchParams;

  const activeMethod = isConsumptionMethodValid(consumptionMethod)
    ? (consumptionMethod!.toUpperCase() as "DINE_IN" | "TAKEAWAY" | "DELIVERY")
    : "DELIVERY";

  const restaurant = await buscarMenuCached();

  if (!restaurant) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <p className="text-center text-slate-500">Restaurante não encontrado no banco de dados.</p>
      </div>
    );
  }

  return (
    <RestaurantMenuPageContent
      restaurant={restaurant}
      consumptionMethod={activeMethod}
      tableId={tableId}
      isKioskMode={mode === "totem"}
    />
  );
};

export default RestaurantMenuPage;
