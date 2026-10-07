import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { getSession } from "@/lib/auth/session";
import { listarChamadosAction } from "./suporte-actions";
import { SuporteClient } from "./suporte-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Central de Suporte e Ajuda | Gestão",
  description: "Acompanhe e abra chamados de suporte técnico, consulte a base de conhecimento e tire dúvidas.",
};

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "ATTENDANT",
  "WAITER",
  "COURIER",
  "KITCHEN",
  "PANEL",
];

interface SuportePageProps {
  params?: Promise<{ slug?: string }>;
}

export default async function SuportePage({ params }: SuportePageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role && !ALLOWED_ROLES.includes(session.role)) {
    redirect("/unauthorized");
  }

  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);
  const slug = restaurant?.slug || resolvedParams?.slug || "";

  const initialTickets = await listarChamadosAction(slug);

  return (
    <SuporteClient
      slug={slug}
      initialTickets={initialTickets}
      currentUser={{
        id: session.sub,
        name: session.name || "Usuário",
        email: session.email || "",
        role: session.role || "",
      }}
    />
  );
}


