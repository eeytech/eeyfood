import { buscarRestaurantePorSlug, listarPedidosRecebimentoPorSlug } from "@fsw/db";
import { NextResponse } from "next/server";

import { getRouteAuthUser, validateRouteRestaurantAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paramSlug = searchParams.get("slug");
  const authUser = getRouteAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const targetSlug = paramSlug || authUser.companySlug;

  if (!targetSlug) {
    return NextResponse.json(
      { message: "Slug do restaurante não informado." },
      { status: 400 },
    );
  }

  // IDOR: valida que o usuário autenticado pertence ao restaurante solicitado ou é SUPER_ADMIN
  if (!validateRouteRestaurantAccess(request, targetSlug)) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const restaurant = await buscarRestaurantePorSlug(targetSlug);
  if (!restaurant) {
    return NextResponse.json(
      { message: "Restaurante não encontrado." },
      { status: 404 },
    );
  }

  const orders = await listarPedidosRecebimentoPorSlug(restaurant.slug);
  return NextResponse.json(orders);
}
