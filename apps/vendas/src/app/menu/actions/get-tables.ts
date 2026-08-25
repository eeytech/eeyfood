"use server";

import { listarMesasComandasPorSlug } from "@/lib/db";
import type { DiningTable } from "@/lib/db";

export const getTables = async (slug: string): Promise<DiningTable[]> => {
  const mesasComandas = await listarMesasComandasPorSlug(slug);
  return mesasComandas.map(({ table }) => table);
};
