import { listarMesasComandasPorSlug } from "@fsw/db";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const comandas = await listarMesasComandasPorSlug(slug);

  return NextResponse.json(comandas);
}
