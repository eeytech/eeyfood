"use client";

import { useEffect } from "react";

export const PWARegister = () => {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registrado com sucesso:", registration.scope);
        })
        .catch((error) => {
          console.error("Falha ao registrar o Service Worker:", error);
        });
    }
  }, []);

  return null;
};
