import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao, listarMesasGestao } from "@/lib/admin-queries";
import { MesasQrCodesClient } from "./_components/mesas-qrcodes-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gerador de QR Code para Mesas | Gestão",
  description: "Gere e imprima QR codes personalizados para mesas do restaurante.",
};

interface MesasQrCodesPageProps {
  params: Promise<{ slug?: string }>;
}

export default async function MesasQrCodesPage({ params }: MesasQrCodesPageProps) {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  const tables = await listarMesasGestao(slug || restaurant.slug);

  return (
    <MesasQrCodesClient
      slug={restaurant.slug}
      restaurant={restaurant}
      tables={tables}
    />
  );
}
