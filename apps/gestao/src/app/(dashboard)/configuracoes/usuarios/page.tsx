import type { Metadata } from "next";
import { buscarRestauranteUnico } from "@fsw/db";

import { listarUsuariosAction } from "../usuarios-actions";
import { UsuariosClient } from "./usuarios-client";

export const metadata: Metadata = {
  title: "Usuários e Permissões | Gestão",
};

export default async function UsuariosPage() {
  const restaurant = await buscarRestauranteUnico();
  const slug = restaurant?.slug ?? "";
  const users = await listarUsuariosAction(slug);

  return <UsuariosClient slug={slug} users={users} />;
}
