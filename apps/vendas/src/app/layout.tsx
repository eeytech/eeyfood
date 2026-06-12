import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { PWARegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";

import { CartProvider } from "./[slug]/menu/contexts/cart";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eeyFood - Cardápio Digital",
  description: "Experiência digital para pedidos!",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "eeyFood",
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
      <body className={`${inter.className} antialiased`}>
        <PWARegister />
        <PWAInstallPrompt />
        <CartProvider>{children}</CartProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
