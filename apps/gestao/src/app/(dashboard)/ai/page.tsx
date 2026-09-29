import { DEFAULT_AI_SYSTEM_PROMPT } from "@fsw/db";
import {
  BotIcon,
  MessageSquareIcon,
  SaveIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateAiSettingsAction } from "@/app/(dashboard)/ai-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  buscarAiSettingsPorSlug,
  buscarClientesPausadosPorSlug,
  buscarRestauranteParaGestao,
} from "@/lib/admin-queries";

import { AiHandoffCard } from "./ai-handoff-card";
import { AiPromptEditor } from "./ai-prompt-editor";
import { AiProviderSelector } from "./ai-provider-selector";

export const dynamic = "force-dynamic";

interface AiSettingsPageProps {
  params?: Promise<{ slug?: string }>;
}

export default async function AiSettingsPage({ params }: AiSettingsPageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    return notFound();
  }

  const slug = restaurant.slug;
  const [aiSettings, clientesPausados] = await Promise.all([
    buscarAiSettingsPorSlug(slug),
    buscarClientesPausadosPorSlug(slug),
  ]);

  return (
    <form
      id="ai-settings-form"
      action={updateAiSettingsAction.bind(null, slug)}
      className="space-y-6"
    >
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
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
            variant={aiSettings?.isBotActive ? "default" : "secondary"}
            className={
              aiSettings?.isBotActive
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs px-3 py-1 font-semibold"
                : "text-xs px-3 py-1"
            }
          >
            <span
              className={`mr-1.5 h-2 w-2 rounded-full ${
                aiSettings?.isBotActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            {aiSettings?.isBotActive ? "Robô Ativo" : "Robô Inativo"}
          </Badge>

          {/* Botão Salvar Configurações no cabeçalho substituindo Conexão WhatsApp */}
          <SubmitButton
            form="ai-settings-form"
            className="gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <SaveIcon size={14} />
            Salvar Configurações
          </SubmitButton>
        </div>
      </div>

      {/* ── Alerta de Fila de Atendimento Humano (Handoff Multicliente — Sempre Visível) ── */}
      <AiHandoffCard slug={slug} clientesPausados={clientesPausados} />

      {/* ── Formulário de Configurações de IA ─────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna Esquerda: Personalidade do Robô */}
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-slate-100 p-2 text-slate-800">
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
              defaultPrompt={DEFAULT_AI_SYSTEM_PROMPT}
            />

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-medium text-slate-800 hover:bg-slate-100/70 transition-colors">
              <input
                type="checkbox"
                name="isBotActive"
                defaultChecked={aiSettings?.isBotActive ?? false}
                className="h-4 w-4 rounded accent-primary"
              />
              Ativar atendimento automático com IA no WhatsApp
            </label>
          </CardContent>
        </Card>

        {/* Coluna Direita: Seletor de Provedor e Envio */}
        <div className="space-y-6">
          <AiProviderSelector
            initialProvider={aiSettings?.aiProvider}
            initialGeminiKey={aiSettings?.geminiApiKey}
            initialGroqKey={aiSettings?.groqApiKey}
            initialOpenAiKey={aiSettings?.openaiApiKey}
          />

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-2">
            <p className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
              <MessageSquareIcon size={14} className="text-emerald-600" />
              Conexão do WhatsApp
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Para que o robô envie mensagens automaticamente, seu número de WhatsApp deve estar conectado no menu{" "}
              <Link
                href="/whatsapp"
                className="font-semibold text-emerald-700 underline hover:text-emerald-800"
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
