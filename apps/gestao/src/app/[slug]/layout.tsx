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
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <AdminSidebar slug={slug} restaurantName={restaurant.name} />
        <div>{children}</div>
      </div>
    </div>
  );
};

export default RestaurantLayout;
