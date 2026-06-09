import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";

import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { PWARegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";

import { CartProvider } from "./[slug]/menu/contexts/cart";

const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eeYfood - Cardápio Digital",
  description: "Experiência digital para pedidos com fricção zero e muito cashback.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "eeYfood",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ef4444",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.className} antialiased`}>
        <PWARegister />
        <PWAInstallPrompt />
        <CartProvider>{children}</CartProvider>
        <Toaster />
      </body>
    </html>
  );
}
