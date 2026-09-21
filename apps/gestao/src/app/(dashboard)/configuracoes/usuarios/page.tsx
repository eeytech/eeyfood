import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { listarUsuariosAction } from "../usuarios-actions";
import { UsuariosClient } from "./usuarios-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usuários e Permissões | Gestão",
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

  const users = await listarUsuariosAction(restaurant.slug);

  return <UsuariosClient slug={restaurant.slug} users={users} />;
}
