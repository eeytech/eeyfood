"use server";

import { eq } from "drizzle-orm";
import { db, couriersTable } from "@fsw/db";

export const updateCourierLocation = async (courierId: string, latitude: number, longitude: number) => {
  try {
    await db.update(couriersTable)
      .set({
        latitude,
        longitude,
        updatedAt: new Date(),
      })
      .where(eq(couriersTable.id, courierId));
    
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar localização do entregador:", error);
    return { success: false };
  }
};
