"use client";

import { DownloadIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar apenas se o usuário ainda não instalou
      const isInstalled = window.matchMedia("(display-mode: standalone)").matches;
      if (!isInstalled) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-center justify-between gap-4 rounded-3xl border bg-white p-4 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive text-white shadow-inner">
            <DownloadIcon size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Instalar eeYfood</p>
            <p className="text-xs text-slate-500">Acesse mais rápido e ganhe cashback!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="rounded-full bg-destructive font-bold px-4"
            onClick={handleInstallClick}
          >
            Instalar
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 rounded-full text-slate-400"
            onClick={() => setIsVisible(false)}
          >
            <XIcon size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};
