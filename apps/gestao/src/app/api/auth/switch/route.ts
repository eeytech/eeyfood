import { db, eq, restaurantsTable } from "@fsw/db";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getJwtSecretKey } from "@/lib/auth/config";

const COOKIE_NAME = "eey_session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { companyId?: string };
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "ID da unidade é obrigatório." },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    const userRole = String(payload.role ?? "");
    const userOriginalRestaurantId = String(payload.companyId ?? "");

    // Controle de acesso estrito (IDOR / Multi-tenant):
    // Apenas SUPER_ADMIN pode alternar para qualquer restaurante do sistema.
    // Usuários vinculados a um restaurante específico só podem selecionar a sua própria unidade.
    if (
      userRole !== "SUPER_ADMIN" &&
      userOriginalRestaurantId &&
      userOriginalRestaurantId !== companyId
    ) {
      return NextResponse.json(
        { error: "Acesso negado: Você não possui autorização para alternar para esta unidade." },
        { status: 403 },
      );
    }

    // Buscar restaurante de destino no banco
    const [targetRestaurant] = await db
      .select({ id: restaurantsTable.id, name: restaurantsTable.name, slug: restaurantsTable.slug })
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, companyId))
      .limit(1);

    if (!targetRestaurant) {
      return NextResponse.json(
        { error: "Unidade não encontrada." },
        { status: 404 },
      );
    }

    // Criar novo token JWT com a unidade selecionada
    const appSlug = process.env.NEXT_PUBLIC_APP_SLUG ?? "gestao";
    const newToken = await new SignJWT({
      ...payload,
      activeCompanyId: targetRestaurant.id,
      companyId: userRole === "SUPER_ADMIN" ? targetRestaurant.id : payload.companyId,
      companySlug: targetRestaurant.slug,
      application: appSlug,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secretKey);

    cookieStore.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      message: `Unidade alterada para ${targetRestaurant.name}.`,
      companySlug: targetRestaurant.slug,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao trocar de unidade." },
      { status: 500 },
    );
  }
}
