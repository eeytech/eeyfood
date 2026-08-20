"use server";

import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, eq, restaurantsTable, usersTable } from "@fsw/db";

import { authConfig } from "./config";

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { error: "Por favor, preencha o e-mail e a senha." };
  }

  let redirectSlug: string;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user || !user.isActive) {
      return { error: "Credenciais inválidas ou usuário inativo." };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return { error: "Credenciais inválidas." };
    }

    let targetRestaurantId = user.restaurantId;

    if (user.restaurantId) {
      const [restaurant] = await db
        .select({ id: restaurantsTable.id, slug: restaurantsTable.slug })
        .from(restaurantsTable)
        .where(eq(restaurantsTable.id, user.restaurantId))
        .limit(1);

      if (!restaurant) {
        throw new Error("Restaurante vinculado não encontrado.");
      }
      redirectSlug = restaurant.slug;
      targetRestaurantId = restaurant.id;
    } else {
      // Super Admin sem restaurante fixo -> pega o primeiro restaurante do sistema
      const [firstRestaurant] = await db
        .select({ id: restaurantsTable.id, slug: restaurantsTable.slug })
        .from(restaurantsTable)
        .limit(1);

      if (!firstRestaurant) {
        throw new Error("Nenhum restaurante cadastrado no sistema.");
      }
      redirectSlug = firstRestaurant.slug;
      targetRestaurantId = firstRestaurant.id;
    }

    const secretKey = new TextEncoder().encode(authConfig.eeycore.jwtSecret);

    const appSlug = process.env.NEXT_PUBLIC_APP_SLUG ?? "gestao";

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      activeCompanyId: targetRestaurantId,
      companyId: targetRestaurantId,
      companySlug: redirectSlug,
      application: appSlug,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secretKey);

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
        error instanceof Error ? error.message : "Erro ao efetuar login.",
    };
  }

  redirect("/pedidos");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(authConfig.cookie.name);
  redirect("/login");
}
