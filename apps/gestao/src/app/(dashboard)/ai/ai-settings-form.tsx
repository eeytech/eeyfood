"use client";

import type { AiSettings, ClientePausadoInfo } from "@fsw/db";
import {
  BotIcon,
  Loader2Icon,
  MessageSquareIcon,
  SaveIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateAiSettingsAction } from "@/app/(dashboard)/ai-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AiHandoffCard } from "./ai-handoff-card";
import { AiPromptEditor } from "./ai-prompt-editor";
import { AiProviderSelector } from "./ai-provider-selector";

interface AiSettingsFormProps {
  slug: string;
  aiSettings: AiSettings | null;
  clientesPausados: ClientePausadoInfo[];
  defaultPrompt: string;
}

export function AiSettingsForm({
  slug,
  aiSettings,
  clientesPausados,
  defaultPrompt,
}: AiSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isBotActive, setIsBotActive] = useState<boolean>(
    aiSettings?.isBotActive ?? false,
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateAiSettingsAction(slug, formData);
        router.refresh();
        toast.success("Configurações de Inteligência Artificial salvas com sucesso!");
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao salvar as configurações de IA.",
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <SparklesIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Inteligência Artificial
            </h1>
            <p className="text-sm text-slate-500">
              Configure o atendente virtual inteligente do seu delivery, defina o tom de voz e escolha seu provedor de IA (gratuito ou pago).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={isBotActive ? "default" : "secondary"}
            className={
              isBotActive
                ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 text-xs px-3 py-1 font-semibold"
                : "text-xs px-3 py-1"
            }
          >
            <span
              className={`mr-1.5 h-2 w-2 rounded-full ${
                isBotActive ? "bg-primary animate-pulse" : "bg-slate-400"
              }`}
            />
            {isBotActive ? "Robô Ativo" : "Robô Inativo"}
          </Badge>

          <Button
            type="submit"
            disabled={isPending}
            className="gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
          >
            {isPending ? (
              <>
                <Loader2Icon size={14} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <SaveIcon size={14} />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Alerta de Fila de Atendimento Humano (Handoff Multicliente) ── */}
      <AiHandoffCard slug={slug} clientesPausados={clientesPausados} />

      {/* ── Formulário de Configurações de IA ─────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna Esquerda: Personalidade do Robô */}
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <BotIcon size={18} />
              </div>
              <div>
                <CardTitle className="font-display text-base font-semibold text-slate-900">
                  Personalidade do Robô
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Defina como seu atendente virtual deve se apresentar e atender os clientes.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Nome do Atendente
              </label>
              <Input
                name="botName"
                defaultValue={aiSettings?.botName ?? "EeyFood Bot"}
                placeholder="Ex.: Bia do Delivery"
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                required
              />
            </div>

            {/* Editor de Prompt com botão Restaurar Padrão */}
            <AiPromptEditor
              initialPrompt={aiSettings?.systemPrompt}
              defaultPrompt={defaultPrompt}
            />

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-medium text-slate-800 transition-colors">
              <Checkbox
                id="isBotActive"
                name="isBotActive"
                checked={isBotActive}
                onCheckedChange={(checked) => setIsBotActive(Boolean(checked))}
              />
              <Label htmlFor="isBotActive" className="cursor-pointer text-xs font-medium text-slate-800">
                Ativar atendimento automático com IA no WhatsApp
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Coluna Direita: Seletor de Provedor e Envio */}
        <div className="space-y-6">
          <AiProviderSelector
            initialProvider={aiSettings?.aiProvider}
            initialGeminiKey={aiSettings?.geminiApiKey}
            initialOpenAiKey={aiSettings?.openaiApiKey}
          />

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-2">
            <p className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
              <MessageSquareIcon size={14} className="text-primary" />
              Conexão do WhatsApp
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Para que o robô envie mensagens automaticamente, seu número de WhatsApp deve estar conectado no menu{" "}
              <Link
                href="/whatsapp"
                className="font-semibold text-primary underline hover:text-primary/80"
              >
                Configurações &gt; WhatsApp
              </Link>.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
