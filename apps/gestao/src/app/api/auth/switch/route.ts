import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/config";
import { eeycore } from "@/lib/auth/eeycore-client";
import { getSession } from "@/lib/auth/session";

interface SwitchResponse {
  token: string;
  restaurant: { slug: string };
}

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

  const hasAccess = session.companies.some((c) => c.id === companyId);
  if (!hasAccess) {
    return NextResponse.json({ message: "Acesso negado a esta unidade." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(authConfig.cookie.name)?.value ?? "";

  try {
    const data = await eeycore.withUserToken<SwitchResponse>(
      "/auth/switch-company",
      currentToken,
      {
        method: "POST",
        body: JSON.stringify({ companyId }),
      },
    );

    cookieStore.set(authConfig.cookie.name, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: authConfig.cookie.maxAge,
    });

    return NextResponse.json({ slug: data.restaurant.slug });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao trocar de unidade.";
    return NextResponse.json({ message }, { status: 502 });
  }
}
