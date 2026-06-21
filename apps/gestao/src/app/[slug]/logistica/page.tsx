import { buscarRegrasFreteAtivas, buscarRestaurantePorSlug } from "@fsw/db";
import { notFound } from "next/navigation";

import {
  buscarRestauranteParaGestao,
  listarCouriersGestaoFiltrado,
  listarVeiculosGestao,
} from "@/lib/admin-queries";

import { LogisticaClient } from "./_components/logistica-client";

interface LogisticaPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

const LogisticaPage = async ({ params, searchParams }: LogisticaPageProps) => {
  const { slug } = await params;
  const sp = await searchParams;

  const restaurant = await buscarRestauranteParaGestao(slug);
  if (!restaurant) {
    return notFound();
  }

  const tab = sp.tab ?? "motoboys";

  // ── Parâmetros de motoboys ──
  const page = parseInt(sp.page ?? "1", 10) || 1;
  const search = sp.search ?? "";
  const vehicleType = sp.vehicleType ?? "all";
  const availability = sp.availability ?? "all";
  const status = sp.status ?? "all";
  const workDay = sp.workDay ?? "all";

  // ── Parâmetros de veículos ──
  const vpage = parseInt(sp.vpage ?? "1", 10) || 1;
  const vsearch = sp.vsearch ?? "";
  const vstatus = sp.vstatus ?? "all";

  const restaurantForFee = await buscarRestaurantePorSlug(slug);

  const [courierResult, vehicleResult, feeRules] = await Promise.all([
    listarCouriersGestaoFiltrado({
      slug,
      page,
      search: search || undefined,
      vehicleType: vehicleType !== "all" ? vehicleType : undefined,
      availability: availability !== "all" ? availability : undefined,
      status: status !== "all" ? status : undefined,
      workDay: workDay !== "all" ? workDay : undefined,
    }),
    listarVeiculosGestao({
      slug,
      page: vpage,
      search: vsearch || undefined,
      status: vstatus !== "all" ? vstatus : undefined,
    }),
    restaurantForFee ? buscarRegrasFreteAtivas(restaurantForFee.id) : Promise.resolve([]),
  ]);

  return (
    <main className="space-y-4">
      <LogisticaClient
        slug={slug}
        restaurant={restaurant}
        couriers={courierResult.couriers}
        courierTotal={courierResult.total}
        courierTotalPages={courierResult.totalPages}
        courierCurrentPage={courierResult.currentPage}
        initialSearch={search}
        initialVehicleType={vehicleType}
        initialAvailability={availability}
        initialStatus={status}
        initialWorkDay={workDay}
        vehicles={vehicleResult.vehicles}
        vehicleTotal={vehicleResult.total}
        vehicleTotalPages={vehicleResult.totalPages}
        vehicleCurrentPage={vehicleResult.currentPage}
        initialVSearch={vsearch}
        initialVStatus={vstatus}
        initialTab={tab}
        feeRules={feeRules}
      />
    </main>
  );
};

export default LogisticaPage;
