import "./globals.css";

import { Metadata } from "next";

export const dynamic = "force-dynamic";
import { Inter } from "next/font/google";
import { ReactNode } from "react";

import { MarketingScripts } from "@/components/marketing-scripts";
import { Toaster } from "@/components/ui/sonner";
import { buscarRestaurantePorSlug, buscarRestauranteUnico } from "@/lib/db";
import { CartProvider } from "./menu/contexts/cart";

const inter = Inter({ subsets: ["latin"] });

interface RestaurantLayoutProps {
  children: ReactNode;
  params?: Promise<{ slug?: string }>;
}

export async function generateMetadata({
  params,
}: RestaurantLayoutProps): Promise<Metadata> {
  const resolvedParams = params ? await params : undefined;
  const slug = resolvedParams?.slug;
  const restaurant = slug ? await buscarRestaurantePorSlug(slug) : await buscarRestauranteUnico();

  if (!restaurant) {
    return {
      title: "eeyFood - Cardápio Digital",
    };
  }

  return {
    title: `${restaurant.name} - Cardápio Digital`,
    appleWebApp: {
      title: restaurant.name,
    },
  };
}

export default async function RestaurantLayout({
  children,
  params,
}: RestaurantLayoutProps) {
  const resolvedParams = params ? await params : undefined;
  const slug = resolvedParams?.slug;
  const restaurant = slug ? await buscarRestaurantePorSlug(slug) : await buscarRestauranteUnico();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <CartProvider>
          {restaurant && <MarketingScripts restaurantId={restaurant.id} />}
          {children}
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
