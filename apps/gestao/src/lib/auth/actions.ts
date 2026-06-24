"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, restaurantsTable, eq } from "@fsw/db";

import { authConfig } from "./config";

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const email = formData.get("email")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  let redirectSlug: string;

  try {
    const response = await fetch(
      `${authConfig.eeycore.baseUrl}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          applicationSlug: authConfig.eeycore.appSlug,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message =
        (body as { message?: string; error?: string } | null)?.message ??
        (body as { message?: string; error?: string } | null)?.error ??
        `Erro HTTP ${response.status}`;
      throw new Error(message);
    }

    const setCookieHeader = response.headers.get("set-cookie");
    if (!setCookieHeader) {
      throw new Error("Token de autenticação não recebido.");
    }

    const tokenMatch = setCookieHeader.match(/auth_token=([^;]+)/);
    if (!tokenMatch) {
      throw new Error("Token de autenticação inválido.");
    }
    const token = tokenMatch[1];

    const [, payloadB64] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString(),
    ) as { activeCompanyId?: string };

    const activeCompanyId = payload.activeCompanyId;
    if (!activeCompanyId) {
      throw new Error("Empresa ativa não encontrada no token.");
    }

    const [restaurant] = await db
      .select({ slug: restaurantsTable.slug })
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, activeCompanyId))
      .limit(1);

    if (!restaurant) {
      throw new Error("Restaurante não encontrado.");
    }

    redirectSlug = restaurant.slug;

    const cookieStore = await cookies();
    cookieStore.set(authConfig.cookie.name, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: authConfig.cookie.maxAge,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Credenciais inválidas.",
    };
  }

  redirect(`/${redirectSlug}/pedidos`);
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(authConfig.cookie.name);
  redirect("/login");
}
