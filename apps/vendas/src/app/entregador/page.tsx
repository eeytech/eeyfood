import { couriersTable, db, eq, restaurantsTable } from "@fsw/db";
import { notFound } from "next/navigation";

import { EntregadorPortal } from "./_components/entregador-portal";

export const dynamic = "force-dynamic";

interface EntregadorPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const EntregadorPage = async ({ searchParams }: EntregadorPageProps) => {
  const sp = await searchParams;

  const courierId = sp.id;
  if (!courierId) {
    return <EntregadorPortal slug="" courier={null} initialOrders={[]} />;
  }

  const [result] = await db
    .select({
      courier: couriersTable,
      restaurantSlug: restaurantsTable.slug,
    })
    .from(couriersTable)
    .innerJoin(restaurantsTable, eq(restaurantsTable.id, couriersTable.restaurantId))
    .where(eq(couriersTable.id, courierId))
    .limit(1);

  if (!result) {
    return notFound();
  }

  const ordersRes = await fetch(
    `${process.env.NEXT_PUBLIC_VENDAS_URL ?? ""}/api/entregador/${courierId}`,
    { cache: "no-store" },
  ).catch(() => null);

  const data = ordersRes?.ok ? await ordersRes.json() : { orders: [] };

  return (
    <EntregadorPortal
      slug={result.restaurantSlug}
      courier={result.courier}
      initialOrders={data.orders ?? []}
    />
  );
};

export default EntregadorPage;
