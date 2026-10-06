"use client";

import { RotateCcwIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AiPromptEditorProps {
  initialPrompt?: string | null;
  defaultPrompt: string;
}

export function AiPromptEditor({
  initialPrompt,
  defaultPrompt,
}: AiPromptEditorProps) {
  const hasValidInitial = Boolean(
    initialPrompt && initialPrompt.trim().length >= 10,
  );
  const [prompt, setPrompt] = useState(
    hasValidInitial ? (initialPrompt as string) : defaultPrompt,
  );

  const handleRestaurarPadrao = () => {
    setPrompt(defaultPrompt);
    toast.success("Prompt padrão oficial de delivery restaurado!");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">
          Prompt do Sistema (Instruções de Atendimento)
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRestaurarPadrao}
          className="h-7 gap-1.5 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          title="Substituir pelo prompt modelo de vendas e delivery"
        >
          <RotateCcwIcon size={12} />
          Restaurar Padrão
        </Button>
      </div>

      <Textarea
        name="systemPrompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        minLength={10}
        rows={12}
        className="min-h-[280px] rounded-xl border-slate-200 bg-slate-50/70 p-3 text-xs leading-relaxed font-sans focus:bg-white resize-y"
        placeholder="Instrua o robô sobre como atender seus clientes, ser simpático e orientar sobre pedidos..."
        required
      />

      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <SparklesIcon size={12} className="text-primary shrink-0" />
        O prompt modelo oficial orienta o robô a listar o cardápio com precisão, sugerir acompanhamentos, gerar o link do carrinho e transferir para atendimento humano quando solicitado.
      </p>
    </div>
  );
}
