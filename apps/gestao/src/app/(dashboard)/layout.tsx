import { redirect } from "next/navigation";
import { buscarRestauranteUnico } from "@fsw/db";

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

  const restaurant = await buscarRestauranteUnico();
  const slug = restaurant?.slug ?? "";
  const restaurantName = restaurant?.name ?? "Meu Restaurante";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminSidebar
        slug={slug}
        restaurantName={restaurantName}
        companies={[]}
        currentCompanyId={restaurant?.id ?? ""}
        userPermissions={{}}
      />
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
