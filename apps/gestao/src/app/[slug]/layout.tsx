import { redirect } from "next/navigation";
import { db, restaurantsTable, eq } from "@fsw/db";

import AdminSidebar from "@/components/admin-sidebar";
import { getSession } from "@/lib/auth/session";

interface RestaurantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

const RestaurantLayout = async ({
  children,
  params,
}: RestaurantLayoutProps) => {
  const { slug } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Validate slug access: look up the restaurant by slug and check against user's company IDs.
  const [requestedRestaurant] = await db
    .select({ id: restaurantsTable.id })
    .from(restaurantsTable)
    .where(eq(restaurantsTable.slug, slug))
    .limit(1);

  if (!requestedRestaurant || !session.companyIds.includes(requestedRestaurant.id)) {
    // Redirect to the user's active company slug.
    const [activeRestaurant] = await db
      .select({ slug: restaurantsTable.slug })
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, session.activeCompanyId))
      .limit(1);

    redirect(`/${activeRestaurant?.slug ?? ""}/pedidos`);
  }

  const activeCompany = session.companies.find((c) => c.id === session.activeCompanyId);
  const restaurantName = activeCompany?.name ?? slug;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminSidebar
        slug={slug}
        restaurantName={restaurantName}
        companies={session.companies}
        currentCompanyId={session.activeCompanyId}
        userPermissions={session.modules}
      />
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
};

export default RestaurantLayout;
