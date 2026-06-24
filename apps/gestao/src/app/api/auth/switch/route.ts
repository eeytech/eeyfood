import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db, restaurantsTable, eq } from "@fsw/db";

import { authConfig } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { companyId?: string } | null;
  const companyId = body?.companyId;

  if (!companyId) {
    return NextResponse.json({ message: "ID da empresa é obrigatório." }, { status: 400 });
  }

  const hasAccess = session.companyIds.includes(companyId);
  if (!hasAccess) {
    return NextResponse.json({ message: "Acesso negado a esta unidade." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(authConfig.cookie.name)?.value ?? "";

  try {
    const response = await fetch(
      `${authConfig.eeycore.baseUrl}/api/auth/company-context`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `auth_token=${currentToken}`,
        },
        body: JSON.stringify({ companyId }),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message =
        (body as { error?: string } | null)?.error ?? `Erro HTTP ${response.status}`;
      throw new Error(message);
    }

    const setCookieHeader = response.headers.get("set-cookie");
    if (!setCookieHeader) {
      throw new Error("Token não recebido do servidor.");
    }

    const tokenMatch = setCookieHeader.match(/auth_token=([^;]+)/);
    if (!tokenMatch) {
      throw new Error("Token inválido recebido do servidor.");
    }
    const newToken = tokenMatch[1];

    const [restaurant] = await db
      .select({ slug: restaurantsTable.slug })
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, companyId))
      .limit(1);

    if (!restaurant) {
      throw new Error("Restaurante não encontrado.");
    }

    cookieStore.set(authConfig.cookie.name, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: authConfig.cookie.maxAge,
    });

    return NextResponse.json({ slug: restaurant.slug });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao trocar de unidade.";
    return NextResponse.json({ message }, { status: 502 });
  }
}
