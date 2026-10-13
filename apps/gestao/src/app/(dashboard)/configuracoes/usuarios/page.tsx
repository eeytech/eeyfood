import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { getSession } from "@/lib/auth/session";
import { listarUsuariosAction } from "../usuarios-actions";
import { listarGarconsComMetricasAction } from "../garcons-actions";
import { listarFuncionariosAction } from "../funcionarios-actions";
import { UsuariosClient } from "./usuarios-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acessos e Equipe | Gestão",
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

  const session = await getSession();

  const [users, garconsData, funcionariosData] = await Promise.all([
    listarUsuariosAction(restaurant.slug),
    listarGarconsComMetricasAction(restaurant.slug).catch(() => ({
      garcons: [],
      regraComissao: null,
      fechamentos: [],
    })),
    listarFuncionariosAction(restaurant.slug).catch(() => ({
      funcionarios: [],
      totalFolhaBase: 0,
      totalAtivos: 0,
    })),
  ]);

  return (
    <UsuariosClient
      slug={restaurant.slug}
      users={users}
      garconsData={garconsData}
      funcionariosData={funcionariosData}
      currentUserRole={session?.role}
    />
  );
}
