import type { Metadata } from "next";

import { buscarRestauranteUnico } from "@fsw/db";
import { listarChamadosAction } from "./suporte-actions";
import { SuporteClient } from "./suporte-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Central de Suporte & Ajuda | Gestão",
  description: "Acompanhe e abra chamados de suporte técnico, consulte a base de conhecimento e tire dúvidas.",
};

interface SuportePageProps {
  params?: Promise<{ slug?: string }>;
}

export default async function SuportePage({ params }: SuportePageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteUnico();
  const slug = resolvedParams?.slug || restaurant?.slug || "";

  const initialTickets = await listarChamadosAction(slug);

  return <SuporteClient slug={slug} initialTickets={initialTickets} />;
}
