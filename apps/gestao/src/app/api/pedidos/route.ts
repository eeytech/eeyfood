import { buscarRestaurantePorSlug, listarPedidosRecebimentoPorSlug } from "@fsw/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const getCompanySlug = (request: Request): string | null => {
  const raw = request.headers.get("x-user-data");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { companySlug?: unknown };
    return typeof parsed.companySlug === "string" ? parsed.companySlug : null;
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paramSlug = searchParams.get("slug");
  const authSlug = getCompanySlug(request);
  const targetSlug = authSlug || paramSlug;

  if (!targetSlug) {
    return NextResponse.json(
      { message: "Slug do restaurante não informado." },
      { status: 400 },
    );
  }

  // IDOR: se o usuário estiver autenticado em um restaurante, restringir a ele
  if (authSlug && paramSlug && authSlug !== paramSlug) {
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
