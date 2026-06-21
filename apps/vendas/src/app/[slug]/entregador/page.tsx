import { couriersTable, db, eq } from "@fsw/db";
import { notFound } from "next/navigation";

import { EntregadorPortal } from "./_components/entregador-portal";

interface EntregadorPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

const EntregadorPage = async ({ params, searchParams }: EntregadorPageProps) => {
  const { slug } = await params;
  const sp = await searchParams;

  const courierId = sp.id;
  if (!courierId) {
    return <EntregadorPortal slug={slug} courier={null} initialOrders={[]} />;
  }

  const [courier] = await db
    .select()
    .from(couriersTable)
    .where(eq(couriersTable.id, courierId))
    .limit(1);

  if (!courier) {
    return notFound();
  }

  const ordersRes = await fetch(
    `${process.env.NEXT_PUBLIC_VENDAS_URL ?? ""}/api/entregador/${courierId}`,
    { cache: "no-store" },
  ).catch(() => null);

  const data = ordersRes?.ok ? await ordersRes.json() : { orders: [] };

  return <EntregadorPortal slug={slug} courier={courier} initialOrders={data.orders ?? []} />;
};

export default EntregadorPage;
