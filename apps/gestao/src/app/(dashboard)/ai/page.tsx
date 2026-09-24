import {
  AlertTriangleIcon,
  BotIcon,
  KeyIcon,
  MessageSquareIcon,
  SaveIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateAiSettingsAction } from "@/app/(dashboard)/ai-actions";
import ReativarBotButton from "@/app/(dashboard)/_components/reativar-bot-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { buscarAiSettingsPorSlug, buscarRestauranteParaGestao } from "@/lib/admin-queries";

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
  const aiSettings = await buscarAiSettingsPorSlug(slug);

  return (
    <div className="space-y-6">
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
              Configure o atendente virtual inteligente do seu delivery, defina o tom de voz e conecte a OpenAI.
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

          <Link href="/whatsapp">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <MessageSquareIcon size={14} className="text-emerald-600" />
              Conexão WhatsApp
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Alerta de Pausa para Atendimento Humano ───────── */}
      {aiSettings?.isBotPaused && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <AlertTriangleIcon className="shrink-0 text-amber-600" size={24} />
            <div className="flex-1">
              <CardTitle className="text-lg text-amber-800">
                Atendimento Humano Ativo
              </CardTitle>
              <CardDescription className="text-amber-700">
                O robô está pausado aguardando o atendimento de{" "}
                <strong>{aiSettings.pausedForPhone ?? "um cliente"}</strong>.{" "}
                {aiSettings.pausedAt && (
                  <>
                    Solicitado em{" "}
                    {new Date(aiSettings.pausedAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    .
                  </>
                )}
              </CardDescription>
            </div>
            <ReativarBotButton slug={slug} />
          </CardHeader>
          <CardContent className="flex items-center gap-2 pt-0">
            <UserIcon size={14} className="text-amber-600" />
            <span className="text-xs text-amber-700">
              Após concluir o atendimento humano, clique em &ldquo;Reativar Robô&rdquo; para que o bot volte a responder automaticamente.
            </span>
          </CardContent>
        </Card>
      )}

      {/* ── Formulário de Configurações de IA ─────────────── */}
      <form action={updateAiSettingsAction.bind(null, slug)}>
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Prompt do Sistema (Instruções)
                </label>
                <Textarea
                  name="systemPrompt"
                  className="min-h-[220px] rounded-xl border-slate-200 bg-slate-50/70 p-3 text-sm focus:bg-white resize-none"
                  defaultValue={aiSettings?.systemPrompt ?? ""}
                  placeholder="Instrua o robô sobre como atender seus clientes, ser simpático e orientar sobre pedidos..."
                  required
                />
                <p className="text-[11px] text-muted-foreground italic">
                  Dica: Peça para ele sempre ser cordial, apresentar os pratos do cardápio e convidar o cliente a fazer o pedido.
                </p>
              </div>

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

          {/* Coluna Direita: Chave OpenAI e Envio */}
          <div className="space-y-6">
            <Card className="border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
                    <KeyIcon size={18} />
                  </div>
                  <div>
                    <CardTitle className="font-display text-base font-semibold text-slate-900">
                      Inteligência Artificial (OpenAI)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Configure a chave da OpenAI para habilitar respostas contextuais e transcrição de áudios.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    OpenAI API Key (Chave Secreta)
                  </label>
                  <Input
                    name="openaiApiKey"
                    type="password"
                    defaultValue={aiSettings?.openaiApiKey ?? ""}
                    placeholder="sk-..."
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-xs focus:bg-white"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Utilizada para processar mensagens, interpretar intenção de pedidos e transcrever mensagens de voz dos clientes no WhatsApp.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600 space-y-2">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MessageSquareIcon size={14} className="text-emerald-600" />
                    Conexão do WhatsApp
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Para que o robô envie mensagens automaticamente, seu número de WhatsApp deve estar conectado no menu{" "}
                    <Link href="/whatsapp" className="font-semibold text-emerald-700 underline hover:text-emerald-800">
                      Configurar &gt; WhatsApp
                    </Link>.
                  </p>
                </div>
              </CardContent>
            </Card>

            <SubmitButton className="h-12 w-full gap-2 rounded-full bg-slate-900 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
              <SaveIcon size={16} />
              Salvar Configurações de IA
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
