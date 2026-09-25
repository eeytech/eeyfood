import { unstable_cache } from "next/cache";

import { buscarRestauranteComCardapioPorSlug } from "@/lib/db";

import RestaurantMenuPageContent from "./components/menu-page-content";

export const dynamic = "force-dynamic";

const buscarMenuCached = (slug?: string) =>
  unstable_cache(
    () => buscarRestauranteComCardapioPorSlug(slug),
    ["restaurant-menu", slug || "default"],
    { revalidate: 300, tags: [`restaurant-menu:${slug || "default"}`] },
  )();

interface RestaurantMenuPageProps {
  params?: Promise<{ slug?: string }>;
  searchParams: Promise<{
    consumptionMethod?: string;
    tableId?: string;
    mode?: string;
    slug?: string;
    restaurant?: string;
  }>;
}

const isConsumptionMethodValid = (consumptionMethod?: string) => {
  if (!consumptionMethod) return false;
  return ["DINE_IN", "TAKEAWAY", "DELIVERY"].includes(
    consumptionMethod.toUpperCase(),
  );
};

const RestaurantMenuPage = async ({
  params,
  searchParams,
}: RestaurantMenuPageProps) => {
  const resolvedParams = params ? await params : undefined;
  const {
    consumptionMethod,
    tableId,
    mode,
    slug: querySlug,
    restaurant: queryRest,
  } = await searchParams;
  const slug = resolvedParams?.slug || querySlug || queryRest;

  const validMethod = isConsumptionMethodValid(consumptionMethod)
    ? (consumptionMethod!.toUpperCase() as "DINE_IN" | "TAKEAWAY" | "DELIVERY")
    : "DELIVERY";

  const restaurant = await buscarMenuCached(slug);

  if (!restaurant) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Cardápio indisponível</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Não foi possível carregar as informações do cardápio. Por favor, tente novamente mais tarde.
        </p>
      </div>
    );
  }

  return (
    <RestaurantMenuPageContent
      restaurant={restaurant}
      consumptionMethod={validMethod}
      tableId={tableId}
      isKioskMode={mode === "totem"}
    />
  );
};

export default RestaurantMenuPage;
