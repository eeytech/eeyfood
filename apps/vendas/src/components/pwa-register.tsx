"use client";

import { useEffect } from "react";

export const PWARegister = () => {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => {
          console.error("Falha ao registrar o Service Worker:", error);
        });
    }
  }, []);

  return null;
};
