import { redirect } from "next/navigation";

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

  // Prevent a user from accessing another restaurant by guessing its slug.
  if (session.companySlug !== slug) {
    redirect(`/${session.companySlug}/pedidos`);
  }

  const activeCompany = session.companies.find((c) => c.id === session.companyId);
  const restaurantName = activeCompany?.name ?? slug;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminSidebar
        slug={slug}
        restaurantName={restaurantName}
        companies={session.companies}
        currentCompanyId={session.companyId}
        userPermissions={session.permissions}
      />
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
};

export default RestaurantLayout;
