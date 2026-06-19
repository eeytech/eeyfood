"use server";

import { buscarProdutoDoRestaurante } from "@/lib/db";

export async function fetchProductWithOptions(slug: string, productId: string) {
  return buscarProdutoDoRestaurante({ slug, productId });
}
