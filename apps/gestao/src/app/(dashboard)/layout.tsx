import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  buscarRestaurantePorSlug,
  buscarRestauranteUnico,
  db,
  eq,
  restaurantsTable,
} from "@fsw/db";
import type { Restaurant } from "@fsw/db";

export const dynamic = "force-dynamic";

import AdminSidebar from "@/components/admin-sidebar";
import { getSession } from "@/lib/auth/session";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";
  const isTvRoute =
    pathname === "/senha" ||
    pathname.startsWith("/senha/") ||
    pathname === "/kds" ||
    pathname.startsWith("/kds/");

  // Telas de TV / perfis dedicados ocupam 100% da tela sem sidebar nem bordas de backoffice
  if (session.role === "KITCHEN" || session.role === "PANEL" || isTvRoute) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-950 text-white">
        {children}
      </div>
    );
  }

  // Perfil de Comandas / Garçom opera em tela cheia como um aplicativo dedicado (mobile/tablet/terminal)
  if (session.role === "WAITER") {
    return (
      <div className="min-h-screen w-screen overflow-x-hidden bg-slate-100 text-slate-900">
        {children}
      </div>
    );
  }

  // 1. Identificar a unidade ativa baseada na sessão JWT
  const targetId = session.activeCompanyId || session.companyId;
  let restaurant: Restaurant | null = null;

  if (targetId) {
    const [found] = await db
      .select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, targetId))
      .limit(1);
    restaurant = found ?? null;
  }

  if (!restaurant && session.companySlug) {
    restaurant = await buscarRestaurantePorSlug(session.companySlug);
  }

  if (!restaurant) {
    restaurant = await buscarRestauranteUnico();
  }

  const slug = restaurant?.slug ?? "";
  const restaurantName = restaurant?.name ?? "Meu Restaurante";

  // 2. Buscar todas as filiais/unidades cadastradas da empresa
  const allRestaurants = await db
    .select({
      id: restaurantsTable.id,
      name: restaurantsTable.name,
      slug: restaurantsTable.slug,
    })
    .from(restaurantsTable)
    .orderBy(restaurantsTable.name);

  return (
    <AdminSidebar
      slug={slug}
      restaurantName={restaurantName}
      companies={allRestaurants}
      currentCompanyId={restaurant?.id ?? ""}
      userPermissions={{}}
      userRole={session.role}
      userName={session.name}
      userEmail={session.email}
    >
      <div className="mx-auto max-w-[1600px]">{children}</div>
    </AdminSidebar>
  );
}
