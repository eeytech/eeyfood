"use server";

import { db, eq, restaurantsTable, sql } from "@fsw/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";

interface UpdatePlanResult {
  success: boolean;
  message: string;
}

export async function updateRestaurantPlanAction(
  slug: string,
  planName: string,
  enabledModules: string[],
): Promise<UpdatePlanResult> {
  // 1. Validar permissão estrita: Somente SUPER_ADMIN pode alterar o plano do cliente
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return {
      success: false,
      message:
        "Acesso negado. Apenas o Super Administrador pode alterar o plano e os módulos desta unidade.",
    };
  }

  try {
    // Garantir colunas no banco se necessário
    try {
      await db.execute(sql`
        ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "planName" text DEFAULT 'COMPLETO' NOT NULL;
        ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "enabledModules" jsonb;
      `);
    } catch {
      // Ignora erro caso as colunas já tenham sido criadas
    }

    const [updated] = await db
      .update(restaurantsTable)
      .set({
        planName,
        enabledModules,
        updatedAt: new Date(),
      })
      .where(eq(restaurantsTable.slug, slug))
      .returning({
        id: restaurantsTable.id,
        slug: restaurantsTable.slug,
        planName: restaurantsTable.planName,
      });

    if (!updated) {
      return {
        success: false,
        message: "Restaurante não encontrado para atualização.",
      };
    }

    // Revalidar rotas da gestão para atualizar menus e permissões imediatamente
    revalidatePath("/configuracoes");
    revalidatePath("/pedidos");
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Plano e módulos da unidade atualizados com sucesso!",
    };
  } catch (error) {
    console.error("Erro ao atualizar plano do restaurante:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao salvar o plano do restaurante.",
    };
  }
}
