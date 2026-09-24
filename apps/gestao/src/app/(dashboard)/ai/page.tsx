import { AlertTriangleIcon, BotIcon, ChevronDownIcon, KeyIcon, MessageSquareIcon, SaveIcon, SparklesIcon, UserIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { updateAiSettingsAction } from "@/app/(dashboard)/ai-actions";
import ReativarBotButton from "@/app/(dashboard)/_components/reativar-bot-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { buscarAiSettingsPorSlug, buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { WhatsAppConnectionCard } from "./whatsapp-connection-card";

interface AiSettingsPageProps {
  params: Promise<{ slug: string }>;
}

const AiSettingsPage = async ({ params }: AiSettingsPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);
  const aiSettings = await buscarAiSettingsPorSlug(slug);

  if (!restaurant) {
    return notFound();
  }

  return (
    <main className="space-y-6">
      <Card className="overflow-hidden border-white/80 bg-white/90 shadow-sm">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-3xl">
              <SparklesIcon className="text-primary" />
              Inteligência Artificial & WhatsApp
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Gerencie a conexão do WhatsApp do restaurante e configure seu atendente virtual com IA.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={aiSettings?.isBotActive ? "success" : "secondary"}>
              {aiSettings?.isBotActive ? "Robô Ativo" : "Robô Inativo"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Card Visual de Conexão WhatsApp via QR Code */}
      <WhatsAppConnectionCard
        slug={slug}
        initialInstanceName={aiSettings?.evolutionInstanceName}
      />

      {aiSettings?.isBotPaused && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <AlertTriangleIcon className="shrink-0 text-amber-600" size={24} />
            <div className="flex-1">
              <CardTitle className="text-lg text-amber-800">Atendimento Humano Ativo</CardTitle>
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

      <form action={updateAiSettingsAction.bind(null, slug)}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BotIcon size={20} className="text-primary" />
                Personalidade do Robô
              </CardTitle>
              <CardDescription>Defina como seu atendente virtual deve se comportar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Atendente</label>
                <Input name="botName" defaultValue={aiSettings?.botName ?? "EeyFood Bot"} placeholder="Ex.: Bia do Delivery" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt do Sistema (Instruções)</label>
                <Textarea 
                  name="systemPrompt" 
                  className="min-h-[200px]"
                  defaultValue={aiSettings?.systemPrompt ?? ""}
                  placeholder="Instrua o robô sobre como atender seus clientes..."
                  required 
                />
                <p className="text-xs text-muted-foreground italic">
                  Dica: Peça para ele sempre ser cordial, listar o cardápio quando solicitado e capturar os itens do pedido.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  name="isBotActive" 
                  defaultChecked={aiSettings?.isBotActive ?? false} 
                  className="h-4 w-4 rounded accent-primary" 
                />
                Ativar atendimento automático com IA
              </label>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <KeyIcon size={20} className="text-rose-600" />
                  Inteligência Artificial (OpenAI)
                </CardTitle>
                <CardDescription>Configure a chave da OpenAI para habilitar respostas inteligentes do atendente virtual.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-rose-600">OpenAI API Key (Segredo)</label>
                  <Input 
                    name="openaiApiKey" 
                    type="password"
                    defaultValue={aiSettings?.openaiApiKey ?? ""} 
                    placeholder="sk-..." 
                  />
                  <p className="text-[11px] text-muted-foreground">Necessária para o processamento de linguagem natural e transcrição de áudios no WhatsApp.</p>
                </div>

                {/* Opções Técnicas Avançadas (Opcional) */}
                <details className="group rounded-xl border bg-slate-50/60 p-3 text-xs">
                  <summary className="cursor-pointer font-medium text-muted-foreground flex items-center justify-between">
                    <span>Configurações Técnicas Avançadas</span>
                    <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 space-y-3 pt-2 border-t">
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Nome da Instância</label>
                      <Input
                        name="evolutionInstanceName"
                        defaultValue={aiSettings?.evolutionInstanceName ?? ""}
                        placeholder="Gerado automaticamente ao conectar"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Chave de API da Instância</label>
                      <Input
                        name="evolutionApiKey"
                        type="password"
                        defaultValue={aiSettings?.evolutionApiKey ?? ""}
                        placeholder="Herdada do servidor ou personalizada"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>

            <SubmitButton className="h-14 w-full rounded-2xl text-lg font-semibold shadow-lg shadow-primary/20">
              <SaveIcon className="mr-2" size={20} />
              Salvar Configurações
            </SubmitButton>
          </div>
        </div>
      </form>
    </main>
  );
};

export default AiSettingsPage;
