"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_THEME,
  SYSTEM_THEMES,
  SystemTheme,
  THEME_COOKIE_NAME,
  THEME_LOCAL_STORAGE_KEY,
  ThemeId,
} from "@/lib/theme-config";

interface ThemeContextType {
  theme: ThemeId;
  currentThemeConfig: SystemTheme;
  setTheme: (theme: ThemeId) => void;
  availableThemes: SystemTheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeId;
}

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(initialTheme);

  const applyThemeToDom = (newTheme: ThemeId) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Remover classes de tema anteriores
    SYSTEM_THEMES.forEach((t) => {
      root.classList.remove(`theme-${t.id}`);
    });

    root.classList.add(`theme-${newTheme}`);
    root.setAttribute("data-theme", newTheme);
  };

  useEffect(() => {
    // Sincronizar com localStorage ao montar
    try {
      const stored = localStorage.getItem(
        THEME_LOCAL_STORAGE_KEY,
      ) as ThemeId | null;
      if (stored && SYSTEM_THEMES.some((t) => t.id === stored)) {
        setThemeState(stored);
        applyThemeToDom(stored);
        return;
      }
    } catch {
      // ignore
    }

    applyThemeToDom(initialTheme);
  }, [initialTheme]);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    applyThemeToDom(newTheme);

    try {
      localStorage.setItem(THEME_LOCAL_STORAGE_KEY, newTheme);
      // Salvar em cookie para que o servidor possa renderizar a classe correta
      document.cookie = `${THEME_COOKIE_NAME}=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }
  };

  const currentThemeConfig =
    SYSTEM_THEMES.find((t) => t.id === theme) || SYSTEM_THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        currentThemeConfig,
        setTheme,
        availableThemes: SYSTEM_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser utilizado dentro de um ThemeProvider");
  }
  return context;
}
