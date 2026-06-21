"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authConfig } from "./config";
import { eeycore } from "./eeycore-client";

interface LoginResponse {
  token: string;
  restaurant: { slug: string };
}

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const email = formData.get("email")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  let redirectSlug: string;

  try {
    const data = await eeycore.withApiKey<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        appSlug: authConfig.eeycore.appSlug,
      }),
    });

    const cookieStore = await cookies();
    cookieStore.set(authConfig.cookie.name, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: authConfig.cookie.maxAge,
    });

    redirectSlug = data.restaurant.slug;
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
