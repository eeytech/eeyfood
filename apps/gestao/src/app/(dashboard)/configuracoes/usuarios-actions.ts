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
import { getSession } from "@/lib/auth/session";

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

  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      error:
        "A senha deve ter no mínimo 8 caracteres e conter pelo menos uma letra e um número.",
    };
  }

  if (role === "SUPER_ADMIN") {
    return {
      error:
        "Não é permitido cadastrar novos usuários com o perfil Super Administrador. Esse usuário é único e gerado pelo sistema.",
    };
  }

  const session = await getSession();
  if (session?.role === "MANAGER" && role === "ADMIN") {
    return {
      error:
        "Usuários com perfil de Gerente não têm permissão para cadastrar Administradores, pois este cargo está acima na hierarquia.",
    };
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

    if (role === "PANEL" || role === "COURIER" || role === "ATTENDANT") {
      try {
        await db.execute(sql`ALTER TYPE "public"."UserRole" ADD VALUE IF NOT EXISTS ${sql.raw(`'${role}'`)}`);
      } catch {
        // ignore if already present or permission
      }
    }

    await db.insert(usersTable).values({
      name,
      email,
      passwordHash,
      role,
      restaurantId: restaurant.id,
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
  const session = await getSession();
  if (session?.role === "MANAGER") {
    const [existing] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (existing?.role === "ADMIN" || existing?.role === "SUPER_ADMIN") {
      throw new Error(
        "Usuários com perfil de Gerente não têm permissão para alterar o status de Administradores.",
      );
    }
  }

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

  if (password && password.trim()) {
    const pwd = password.trim();
    if (pwd.length < 8 || !/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      return {
        error:
          "A nova senha deve ter no mínimo 8 caracteres e conter pelo menos uma letra e um número.",
      };
    }
  }

  try {
    const [existing] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (existing?.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
      return { error: "O cargo do Super Administrador não pode ser alterado." };
    }

    if (existing?.role !== "SUPER_ADMIN" && role === "SUPER_ADMIN") {
      return {
        error:
          "Não é permitido promover usuários para Super Administrador.",
      };
    }

    const session = await getSession();
    if (session?.role === "MANAGER") {
      if (role === "ADMIN" || role === "SUPER_ADMIN") {
        return {
          error:
            "Usuários com perfil de Gerente não têm permissão para atribuir o cargo de Administrador.",
        };
      }

      if (existing?.role === "ADMIN" || existing?.role === "SUPER_ADMIN") {
        return {
          error:
            "Usuários com perfil de Gerente não têm permissão para alterar dados de Administradores.",
        };
      }
    }

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

    if (role === "PANEL" || role === "COURIER" || role === "ATTENDANT") {
      try {
        await db.execute(sql`ALTER TYPE "public"."UserRole" ADD VALUE IF NOT EXISTS ${sql.raw(`'${role}'`)}`);
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
    const [existing] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (existing?.role === "SUPER_ADMIN") {
      return { error: "O Super Administrador não pode ser excluído." };
    }

    const session = await getSession();
    if (session?.role === "MANAGER" && existing?.role === "ADMIN") {
      return {
        error:
          "Usuários com perfil de Gerente não têm permissão para excluir Administradores.",
      };
    }

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
