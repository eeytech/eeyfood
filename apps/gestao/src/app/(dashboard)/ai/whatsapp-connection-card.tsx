"use client";

import {
  AlertTriangleIcon,
  BotIcon,
  CheckCircle2Icon,
  GlobeIcon,
  KeyRoundIcon,
  Loader2Icon,
  LogOutIcon,
  QrCodeIcon,
  RefreshCwIcon,
  SmartphoneIcon,
  SparklesIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  alternarStatusBotAction,
  buscarStatusWhatsAppAction,
  desconectarWhatsAppAction,
  gerarQrCodeWhatsAppAction,
  sincronizarWebhookAction,
} from "./whatsapp-actions";

interface WhatsAppConnectionCardProps {
  slug: string;
  initialInstanceName?: string | null;
}

export function WhatsAppConnectionCard({
  slug,
  initialInstanceName,
}: WhatsAppConnectionCardProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string>(
    initialInstanceName || `restaurante_${slug}`,
  );

  // Status adicional da IA e Webhook
  const [isBotActive, setIsBotActive] = useState<boolean>(false);
  const [hasAiApiKey, setHasAiApiKey] = useState<boolean>(true);
  const [aiProvider, setAiProvider] = useState<string>("GOOGLE_GEMINI");
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [webhookEnabled, setWebhookEnabled] = useState<boolean>(false);
  const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);
  const [isTogglingBot, setIsTogglingBot] = useState(false);

  // QR Code Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const [isPending, startTransition] = useTransition();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Consulta o status de conexão
  const checkStatus = useCallback(
    async (silent = false) => {
      try {
        const res = await buscarStatusWhatsAppAction(slug);
        if (res.instanceName) setInstanceName(res.instanceName);
        if (res.isBotActive !== undefined) setIsBotActive(res.isBotActive);
        if (res.hasAiApiKey !== undefined) setHasAiApiKey(res.hasAiApiKey);
        if (res.aiProvider) setAiProvider(res.aiProvider);
        if (res.webhookUrl) setWebhookUrl(res.webhookUrl);
        if (res.webhookEnabled !== undefined) setWebhookEnabled(res.webhookEnabled);

        if (res.isConnected) {
          setIsConnected(true);
          setPhone(res.phone ?? null);
          setProfileName(res.profileName ?? null);
          setProfilePicUrl(res.profilePicUrl ?? null);

          // Se estava com modal de QR Code aberto, fecha e celebra
          if (isQrModalOpen) {
            setIsQrModalOpen(false);
            setQrCodeBase64(null);
            toast.success("WhatsApp conectado com sucesso!");
          }
        } else {
          setIsConnected(false);
        }
      } catch (err) {
        if (!silent) {
          console.error("Erro ao checar status:", err);
        }
        setIsConnected(false);
      }
    },
    [slug, isQrModalOpen],
  );

  // Checa status inicial ao montar o componente
  useEffect(() => {
    void checkStatus(true);
  }, [checkStatus]);

  // Polling automático enquanto o modal do QR Code estiver aberto
  useEffect(() => {
    if (isQrModalOpen) {
      pollingRef.current = setInterval(() => {
        void checkStatus(true);
      }, 3500);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isQrModalOpen, checkStatus]);

  // Ação de Gerar QR Code
  const handleGerarQrCode = async () => {
    setIsGeneratingQr(true);
    setIsQrModalOpen(true);
    setQrCodeBase64(null);

    try {
      const res = await gerarQrCodeWhatsAppAction(slug);
      if (!res.ok || !res.base64) {
        toast.error(res.error || "Não foi possível obter o QR Code da Evolution API.");
        return;
      }

      setQrCodeBase64(res.base64);
      if (res.instanceName) setInstanceName(res.instanceName);
      toast.info("Aponte seu WhatsApp para o QR Code.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar QR Code.");
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Ação de Desconectar
  const handleDesconectar = () => {
    if (
      !confirm(
        "Deseja realmente desconectar este WhatsApp? As mensagens automáticas e o robô de IA serão interrompidos até uma nova conexão.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await desconectarWhatsAppAction(slug);
        if (res.ok) {
          setIsConnected(false);
          setPhone(null);
          setProfileName(null);
          setProfilePicUrl(null);
          toast.success("WhatsApp desconectado.");
        } else {
          toast.error(res.error || "Erro ao desconectar.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao desconectar.");
      }
    });
  };

  // Ação de Forçar Sincronização do Webhook
  const handleSincronizarWebhook = async () => {
    setIsSyncingWebhook(true);
    try {
      const res = await sincronizarWebhookAction(slug);
      if (res.ok) {
        setWebhookEnabled(true);
        if (res.webhookUrl) setWebhookUrl(res.webhookUrl);
        toast.success("Webhook sincronizado com sucesso com a Evolution API!");
      } else {
        toast.error(res.error || "Falha ao sincronizar webhook.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao sincronizar webhook.");
    } finally {
      setIsSyncingWebhook(false);
    }
  };

  // Ação de Alternar Robô de IA
  const handleAlternarBot = async () => {
    setIsTogglingBot(true);
    const novoStatus = !isBotActive;
    try {
      const res = await alternarStatusBotAction(slug, novoStatus);
      if (res.ok) {
        setIsBotActive(res.isBotActive);
        toast.success(
          res.isBotActive
            ? "Robô de IA ativado com sucesso! As respostas automáticas estão ligadas."
            : "Robô de IA desativado. Mensagens automáticas pausadas.",
        );
      } else {
        toast.error(res.error || "Erro ao alternar status do robô.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alternar status.");
    } finally {
      setIsTogglingBot(false);
    }
  };

  const formatPhone = (rawPhone: string) => {
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length === 13) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return rawPhone;
  };

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-white to-slate-50 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              Conexão do WhatsApp
              {isConnected === true && (
                <Badge
                  variant="success"
                  className="gap-1 px-2.5 py-0.5 text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                >
                  <WifiIcon className="h-3 w-3 animate-pulse" /> Conectado
                </Badge>
              )}
              {isConnected === false && (
                <Badge
                  variant="secondary"
                  className="gap-1 px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  <WifiOffIcon className="h-3 w-3" /> Desconectado
                </Badge>
              )}
              {isConnected === null && (
                <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs">
                  <Loader2Icon className="h-3 w-3 animate-spin" /> Verificando...
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Conecte o número do seu restaurante para envio de campanhas, recuperação de carrinho e atendimento inteligente com IA.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void checkStatus(false)}
              disabled={isPending}
              title="Atualizar status da conexão"
              className="h-9 px-3 gap-1.5 text-xs"
            >
              <RefreshCwIcon className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-2 space-y-4">
          {isConnected === true ? (
            <div className="space-y-3">
              {/* Card principal com os dados do número conectado */}
              <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {profilePicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePicUrl}
                      alt={profileName || "WhatsApp"}
                      className="h-12 w-12 rounded-full border-2 border-primary/40 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <SmartphoneIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {profileName || "WhatsApp do Restaurante"}
                      </p>
                      <CheckCircle2Icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-primary">
                      {phone ? formatPhone(phone) : "Número conectado"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Instância:{" "}
                      <code className="rounded bg-primary/10 text-primary px-1.5 py-0.5 font-mono text-[11px]">
                        {instanceName}
                      </code>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSincronizarWebhook}
                    disabled={isSyncingWebhook}
                    className="gap-1.5 h-9 text-xs border-primary/30 text-primary hover:bg-primary/10"
                    title="Forçar envio de eventos da Evolution API para o eeyFood"
                  >
                    <RefreshCwIcon className={`h-3.5 w-3.5 ${isSyncingWebhook ? "animate-spin" : ""}`} />
                    Sincronizar Webhook
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDesconectar}
                    disabled={isPending}
                    className="gap-1.5 h-9 text-xs"
                  >
                    <LogOutIcon className="h-3.5 w-3.5" />
                    Desconectar
                  </Button>
                </div>
              </div>

              {/* Status da IA & Webhook */}
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Indicador do Robô de IA */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isBotActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <BotIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          Atendimento com IA
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            isBotActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                              : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                          }
                        >
                          {isBotActive ? "Ligado" : "Desligado"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {isBotActive
                          ? `Respondendo via ${aiProvider}`
                          : "Clientes não recebem resposta automática"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant={isBotActive ? "outline" : "default"}
                    size="sm"
                    onClick={handleAlternarBot}
                    disabled={isTogglingBot}
                    className={`h-8 text-xs font-semibold px-3 ${
                      !isBotActive
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    {isTogglingBot ? (
                      <Loader2Icon className="h-3 w-3 animate-spin" />
                    ) : isBotActive ? (
                      "Desativar"
                    ) : (
                      "Ativar Agora"
                    )}
                  </Button>
                </div>

                {/* Indicador do Webhook */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        webhookEnabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      <GlobeIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          Recepção de Mensagens
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            webhookEnabled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                              : "bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                          }
                        >
                          {webhookEnabled ? "Ativo" : "Pronto"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-[200px]" title={webhookUrl || ""}>
                        {webhookUrl ? "/api/webhooks/evolution" : "Sincronizado"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSincronizarWebhook}
                    disabled={isSyncingWebhook}
                    className="h-8 text-xs px-2.5 text-slate-600 hover:text-slate-900"
                    title="Reenviar configuração de webhook para Evolution API"
                  >
                    {isSyncingWebhook ? (
                      <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Alerta se o Bot estiver desligado */}
              {!isBotActive && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900">
                  <AlertTriangleIcon className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex-1 text-xs space-y-1">
                    <p className="font-semibold text-amber-800">
                      O robô de inteligência artificial está desativado!
                    </p>
                    <p className="text-amber-700">
                      Quando um cliente enviar mensagem no WhatsApp, o robô não responderá. Clique no botão{" "}
                      <strong>&quot;Ativar Agora&quot;</strong> acima ou configure na aba{" "}
                      <Link
                        href={`/${slug}/ai`}
                        className="underline font-semibold hover:text-amber-900"
                      >
                        Inteligência Artificial
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              )}

              {/* Alerta se não houver Chave de API configurada */}
              {!hasAiApiKey && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-red-900">
                  <KeyRoundIcon className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1 text-xs space-y-1">
                    <p className="font-semibold text-red-800">
                      Nenhuma chave de IA configurada para gerar as respostas
                    </p>
                    <p className="text-red-700">
                      Para que a IA converse com seus clientes, insira sua chave gratuita do Google Gemini (ou Groq / OpenAI) na aba de IA.
                    </p>
                    <Link
                      href={`/${slug}/ai`}
                      className="inline-flex items-center gap-1.5 font-semibold text-red-800 underline hover:text-red-950 mt-1"
                    >
                      <SparklesIcon className="h-3.5 w-3.5" />
                      Configurar Chave na aba Inteligência Artificial &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <SmartphoneIcon className="h-5 w-5 text-slate-500" />
                  Nenhum WhatsApp conectado no momento
                </p>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Clique no botão ao lado para gerar o QR Code. Basta escanear com a câmera do seu celular através do menu{" "}
                  <strong>Aparelhos Conectados</strong> do seu WhatsApp.
                </p>
              </div>

              <Button
                onClick={handleGerarQrCode}
                disabled={isGeneratingQr}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 shrink-0 h-11 px-5"
              >
                {isGeneratingQr ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Gerando QR Code...
                  </>
                ) : (
                  <>
                    <QrCodeIcon className="h-5 w-5" />
                    Conectar WhatsApp (QR Code)
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Interativo do QR Code */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="max-w-md p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <QrCodeIcon className="h-6 w-6 text-primary" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription className="text-sm">
              Escaneie o código abaixo com o WhatsApp do seu restaurante.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 flex flex-col items-center justify-center">
            {isGeneratingQr ? (
              <div className="flex h-64 w-64 flex-col items-center justify-center gap-3 rounded-2xl border bg-slate-50 p-6 text-muted-foreground">
                <Loader2Icon className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">Preparando QR Code...</p>
              </div>
            ) : qrCodeBase64 ? (
              <div className="relative flex flex-col items-center gap-3">
                <div className="rounded-2xl border-4 border-primary/25 bg-white p-3 shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeBase64}
                    alt="QR Code WhatsApp"
                    className="h-60 w-60 object-contain rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-primary animate-pulse bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-primary"></span>
                  Aguardando leitura pelo celular...
                </div>
              </div>
            ) : (
              <div className="flex h-64 w-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-slate-50 p-6 text-muted-foreground">
                <p className="text-sm text-center">O QR Code expirou ou não pôde ser carregado.</p>
                <Button size="sm" variant="outline" onClick={handleGerarQrCode} className="gap-2">
                  <RefreshCwIcon className="h-4 w-4" /> Tentar novamente
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 text-left text-xs text-muted-foreground space-y-1.5 border">
            <p className="font-semibold text-slate-800">Como conectar:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Abra o <strong>WhatsApp</strong> no seu celular.</li>
              <li>
                Toque nos três pontos ou em <strong>Configurações</strong> &gt; <strong>Aparelhos Conectados</strong>.
              </li>
              <li>
                Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para este QR Code.
              </li>
            </ol>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsQrModalOpen(false)}>
              Cancelar
            </Button>

            {qrCodeBase64 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGerarQrCode}
                disabled={isGeneratingQr}
                className="gap-1.5"
              >
                <RefreshCwIcon className={`h-3.5 w-3.5 ${isGeneratingQr ? "animate-spin" : ""}`} />
                Atualizar QR Code
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
