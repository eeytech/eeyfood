import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { listarUsuariosAction } from "../usuarios-actions";
import { listarGarconsComMetricasAction } from "../garcons-actions";
import { UsuariosClient } from "./usuarios-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Equipe, Usuários e Garçons | Gestão",
};

interface UsuariosPageProps {
  params?: Promise<{ slug?: string }>;
}

export default async function UsuariosPage({ params }: UsuariosPageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    return notFound();
  }

  const [users, garconsData] = await Promise.all([
    listarUsuariosAction(restaurant.slug),
    listarGarconsComMetricasAction(restaurant.slug).catch(() => ({
      garcons: [],
      regraComissao: null,
      fechamentos: [],
    })),
  ]);

  return (
    <UsuariosClient
      slug={restaurant.slug}
      users={users}
      garconsData={garconsData}
    />
  );
}
