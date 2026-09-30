import "./globals.css";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { DEFAULT_THEME, THEME_COOKIE_NAME, ThemeId } from "@/lib/theme-config";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "FSW Donalds | Gestão",
  description: "Painel operacional para recebimento e baixa de pedidos.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value as
    | ThemeId
    | undefined;
  const initialTheme = themeCookie || DEFAULT_THEME;

  return (
    <html
      lang="pt-BR"
      className={`theme-${initialTheme}`}
      data-theme={initialTheme}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('eey_system_theme');
                if (stored) {
                  document.documentElement.className = 'theme-' + stored;
                  document.documentElement.setAttribute('data-theme', stored);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} font-sans`}
        suppressHydrationWarning
      >
        <ThemeProvider initialTheme={initialTheme}>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}

