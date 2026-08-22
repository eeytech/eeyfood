"use server";

import { couriersTable,db } from "@fsw/db";
import { eq } from "drizzle-orm";

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
