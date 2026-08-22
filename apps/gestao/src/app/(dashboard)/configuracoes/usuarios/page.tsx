import type { Metadata } from "next";

import { listarUsuariosAction } from "../usuarios-actions";
import { UsuariosClient } from "./usuarios-client";

export const metadata: Metadata = {
  title: "Usuários e Permissões | Gestão",
};

interface UsuariosPageProps {
  params: Promise<{ slug: string }>;
}

export default async function UsuariosPage({ params }: UsuariosPageProps) {
  const { slug } = await params;
  const users = await listarUsuariosAction(slug);

  return <UsuariosClient slug={slug} users={users} />;
}
