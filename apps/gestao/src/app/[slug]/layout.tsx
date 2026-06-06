import { notFound } from "next/navigation";

import AdminSidebar from "@/components/admin-sidebar";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";

interface RestaurantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

const RestaurantLayout = async ({
  children,
  params,
}: RestaurantLayoutProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminSidebar slug={slug} restaurantName={restaurant.name} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
};

export default RestaurantLayout;
