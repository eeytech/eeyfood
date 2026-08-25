import "./globals.css";

import { Metadata } from "next";
import { Inter } from "next/font/google";
import { ReactNode } from "react";

import { MarketingScripts } from "@/components/marketing-scripts";
import { buscarRestaurantePorSlug } from "@/lib/db";

const inter = Inter({ subsets: ["latin"] });

interface RestaurantLayoutProps {
  children: ReactNode;
  params: Promise<{ slug?: string }>;
}

export async function generateMetadata({
  params,
}: RestaurantLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await buscarRestaurantePorSlug(slug);

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
  const { slug } = await params;
  const restaurant = await buscarRestaurantePorSlug(slug);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {restaurant && <MarketingScripts restaurantId={restaurant.id} />}
        {children}
      </body>
    </html>
  );
}
