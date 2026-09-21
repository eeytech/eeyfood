"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import {
  buscarRestaurantePorSlug,
  db,
  eq,
  isNull,
  or,
  sql,
  usersTable,
} from "@fsw/db";
import type { UserRole } from "@fsw/db";

export async function listarUsuariosAction(restaurantSlug?: string) {
  const restaurant = await buscarRestaurantePorSlug(restaurantSlug);

  if (!restaurant) {
    throw new Error("Restaurante não encontrado.");
  }

  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      isActive: usersTable.isActive,
      restaurantId: usersTable.restaurantId,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(
      or(
        eq(usersTable.restaurantId, restaurant.id),
        isNull(usersTable.restaurantId),
      ),
    );

  return users;
}

export async function criarUsuarioAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const role = (formData.get("role")?.toString() ?? "ADMIN") as UserRole;
  const restaurantSlug = formData.get("restaurantSlug")?.toString();

  if (!name || !email || !password) {
    return { error: "Todos os campos obrigatórios devem ser preenchidos." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  try {
    const [existingUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingUser) {
      return { error: "Já existe um usuário cadastrado com este e-mail." };
    }

    const restaurant = await buscarRestaurantePorSlug(restaurantSlug);

    if (!restaurant) {
      return { error: "Restaurante de destino não encontrado." };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const isSuperAdmin = role === "SUPER_ADMIN";

    if (role === "PANEL") {
      try {
        await db.execute(sql`ALTER TYPE "public"."UserRole" ADD VALUE IF NOT EXISTS 'PANEL'`);
      } catch {
        // ignore if already present or permission
      }
    }

    await db.insert(usersTable).values({
      name,
      email,
      passwordHash,
      role,
      restaurantId: isSuperAdmin ? null : restaurant.id,
    });

    if (restaurant.slug) {
      revalidatePath(`/${restaurant.slug}/configuracoes/usuarios`);
    }
    revalidatePath("/configuracoes/usuarios");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Erro ao cadastrar usuário.",
    };
  }
}

export async function alternarStatusUsuarioAction(
  userId: string,
  isActive: boolean,
  restaurantSlug?: string,
) {
  await db
    .update(usersTable)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  if (restaurantSlug) {
    revalidatePath(`/${restaurantSlug}/configuracoes/usuarios`);
  }
  revalidatePath("/configuracoes/usuarios");
}

export async function atualizarUsuarioAction(params: {
  userId: string;
  name: string;
  role: UserRole;
  password?: string;
  restaurantSlug?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const { userId, name, role, password, restaurantSlug } = params;

  if (!name.trim()) {
    return { error: "O nome do usuário não pode ficar vazio." };
  }

  if (password && password.trim().length < 6) {
    return { error: "A nova senha deve ter pelo menos 6 caracteres." };
  }

  try {
    const updateData: {
      name: string;
      role: UserRole;
      updatedAt: Date;
      passwordHash?: string;
    } = {
      name: name.trim(),
      role,
      updatedAt: new Date(),
    };

    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    if (role === "PANEL") {
      try {
        await db.execute(sql`ALTER TYPE "public"."UserRole" ADD VALUE IF NOT EXISTS 'PANEL'`);
      } catch {
        // ignore if already present or permission
      }
    }

    await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, userId));

    if (restaurantSlug) {
      revalidatePath(`/${restaurantSlug}/configuracoes/usuarios`);
    }
    revalidatePath("/configuracoes/usuarios");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Erro ao atualizar usuário.",
    };
  }
}

export async function excluirUsuarioAction(
  userId: string,
  restaurantSlug?: string,
): Promise<{ error?: string; success?: boolean }> {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, userId));

    if (restaurantSlug) {
      revalidatePath(`/${restaurantSlug}/configuracoes/usuarios`);
    }
    revalidatePath("/configuracoes/usuarios");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Erro ao excluir usuário.",
    };
  }
}
