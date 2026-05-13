import { buscarRestaurantePorSlug } from "@/lib/db";

export const getRestaurantBySlug = async (slug: string) => {
  return buscarRestaurantePorSlug(slug);
};
