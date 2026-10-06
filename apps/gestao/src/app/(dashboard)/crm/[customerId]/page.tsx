import { and, db, eq, walletsTable } from "@fsw/db";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { buscarClienteDetalheAction } from "../../crm-actions";
import { CustomerDetailClient } from "./_components/customer-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug?: string; customerId: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { slug, customerId } = await params;

  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) notFound();

  const { customer, orders, addresses } = await buscarClienteDetalheAction(
    restaurant.slug,
    customerId,
  );

  const walletData = await db.query.walletsTable.findFirst({
    where: and(
      eq(walletsTable.restaurantId, restaurant.id),
      eq(walletsTable.customerPhone, customer.phone),
    ),
  });

  return (
    <CustomerDetailClient
      customer={customer}
      orders={orders}
      addresses={addresses}
      walletData={walletData}
    />
  );
}
