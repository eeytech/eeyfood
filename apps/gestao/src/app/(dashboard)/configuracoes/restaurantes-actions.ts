"use server";

import {
  db,
  eq,
  operatingHoursTable,
  productionSectorsTable,
  restaurantsTable,
} from "@fsw/db";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const COOKIE_NAME = "eey_session";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET ?? "eeyfood_default_jwt_secret_key_2026";
  return new TextEncoder().encode(secret);
};

export async function criarNovaUnidadeAction(
  _prevState: { error?: string; success?: boolean; newSlug?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; newSlug?: string }> {
  try {
    const name = formData.get("name")?.toString()?.trim();
    let slug = formData.get("slug")?.toString()?.trim()?.toLowerCase();
    const description =
      formData.get("description")?.toString()?.trim() || "Restaurante e Delivery";
    const cnpj = formData.get("cnpj")?.toString()?.trim() || null;
    const avatarImageUrl =
      formData.get("avatarImageUrl")?.toString()?.trim() ||
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop";
    const coverImageUrl =
      formData.get("coverImageUrl")?.toString()?.trim() ||
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop";

    if (!name) {
      return { error: "Nome do restaurante é obrigatório." };
    }

    if (!slug) {
      slug = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (slug.length < 3) {
      return { error: "O slug deve ter pelo menos 3 caracteres alfanuméricos." };
    }

    // Verificar se slug já existe
    const [existing] = await db
      .select({ id: restaurantsTable.id })
      .from(restaurantsTable)
      .where(eq(restaurantsTable.slug, slug))
      .limit(1);

    if (existing) {
      return { error: `O slug "${slug}" já está em uso por outro restaurante.` };
    }

    const [newRestaurant] = await db
      .insert(restaurantsTable)
      .values({
        name,
        slug,
        description,
        cnpj,
        avatarImageUrl,
        coverImageUrl,
        status: "AUTO",
        acceptMercadoPago: true,
        isCouponsEnabled: true,
        isCashbackEnabled: true,
        isDeliveryEnabled: true,
        isTakeawayEnabled: true,
        isDineInEnabled: true,
      })
      .returning({ id: restaurantsTable.id, slug: restaurantsTable.slug, name: restaurantsTable.name });

    if (!newRestaurant) {
      return { error: "Falha ao criar restaurante no banco de dados." };
    }

    // Criar horários de funcionamento padrão (Segunda a Domingo, das 11:00 às 23:00)
    for (let day = 0; day <= 6; day++) {
      await db.insert(operatingHoursTable).values({
        restaurantId: newRestaurant.id,
        dayOfWeek: day,
        openTime: "11:00",
        closeTime: "23:00",
      });
    }

    // Criar setores de produção padrão (Cozinha e Bar)
    await db.insert(productionSectorsTable).values([
      {
        restaurantId: newRestaurant.id,
        name: "Cozinha",
        color: "#f59e0b",
        displayOrder: 1,
      },
      {
        restaurantId: newRestaurant.id,
        name: "Bar / Bebidas",
        color: "#3b82f6",
        displayOrder: 2,
      },
    ]);

    // Atualizar o JWT do usuário logado para a nova unidade
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (token) {
      try {
        const secretKey = getJwtSecret();
        const { payload } = await jwtVerify(token, secretKey);
        const appSlug = process.env.NEXT_PUBLIC_APP_SLUG ?? "gestao";

        const newToken = await new SignJWT({
          ...payload,
          activeCompanyId: newRestaurant.id,
          companyId: newRestaurant.id,
          companySlug: newRestaurant.slug,
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
      } catch {
        // ignore
      }
    }

    revalidatePath("/pedidos");
    return { success: true, newSlug: newRestaurant.slug };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Erro inesperado ao cadastrar nova unidade.",
    };
  }
}
