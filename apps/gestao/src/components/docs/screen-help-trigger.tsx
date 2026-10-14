"use client";

import { BookOpenIcon, HelpCircleIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getDocForPathname } from "@/data/screen-documentations";

import { ScreenHelpSheet } from "./screen-help-sheet";

interface ScreenHelpTriggerProps {
  /**
   * Se verdadeiro, renderiza apenas o botão para o cabeçalho superior.
   * Se falso ou omitido, renderiza o botão flutuante e o modal.
   */
  variant?: "floating" | "header" | "all";
}

export function ScreenHelpTrigger({ variant = "all" }: ScreenHelpTriggerProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const doc = useMemo(() => {
    return getDocForPathname(pathname);
  }, [pathname]);

  const isDocCentral = pathname?.startsWith("/configuracoes/documentacoes");

  if (!doc) {
    // Se estiver na própria central de documentações ou em rota sem doc específico
    if (variant === "header") {
      return (
        <Link href="/configuracoes/documentacoes">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:border-primary/40 hover:text-primary transition-all shadow-xs"
            title="Central de Documentações"
          >
            <BookOpenIcon size={14} className="text-primary" />
            <span className="hidden sm:inline">Documentações</span>
          </Button>
        </Link>
      );
    }
    return null;
  }

  return (
    <>
      {/* Botão de Cabeçalho Superior */}
      {(variant === "header" || variant === "all") && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border-primary/25 bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground shadow-xs transition-all active:scale-95"
            title={`Guia desta tela: ${doc.title}`}
          >
            <BookOpenIcon size={14} className="shrink-0" />
            <span className="hidden sm:inline">Como usar esta tela</span>
            <span className="sm:hidden">Ajuda</span>
          </Button>

          <Link href="/configuracoes/documentacoes" className="hidden lg:inline-flex">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800"
              title="Ir para a Central de Todas as Documentações"
            >
              <span>Ver todas</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Botão Flutuante no Canto Inferior Direito */}
      {(variant === "floating" || variant === "all") && !isDocCentral && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
          <button
            onClick={() => setIsOpen(true)}
            className="group flex h-10 items-center gap-2 rounded-full border border-primary/30 bg-slate-900/90 px-3.5 text-white shadow-xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-slate-900 hover:shadow-primary/20 active:scale-95"
            title={`Como usar a tela: ${doc.title}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
              <HelpCircleIcon size={14} />
            </span>
            <span className="text-xs font-bold tracking-tight text-white transition-colors group-hover:text-primary">
              Como usar esta tela
            </span>
            <span className="hidden rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 md:inline-block">
              {doc.badge}
            </span>
          </button>
        </div>
      )}

      {/* Modal / Sheet do Guia Completo */}
      <ScreenHelpSheet
        doc={doc}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
}
