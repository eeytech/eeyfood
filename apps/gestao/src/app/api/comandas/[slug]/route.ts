import { listarMesasComandasPorSlug } from "@fsw/db";
import { NextResponse } from "next/server";

import { validateRouteRestaurantAccess } from "@/lib/auth/session";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json(
      { message: "Slug do restaurante não informado." },
      { status: 400 },
    );
  }

  // IDOR / Multi-tenant: Valida que o usuário autenticado pertence a esta unidade ou é SUPER_ADMIN
  const hasAccess = validateRouteRestaurantAccess(request, slug);
  if (!hasAccess) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const comandas = await listarMesasComandasPorSlug(slug);

  return NextResponse.json(comandas);
}
