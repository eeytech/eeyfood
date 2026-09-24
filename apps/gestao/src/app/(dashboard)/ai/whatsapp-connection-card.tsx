"use client";

import {
  CheckCircle2Icon,
  Loader2Icon,
  LogOutIcon,
  MessageSquareIcon,
  QrCodeIcon,
  RefreshCwIcon,
  SmartphoneIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import Image from "next/image";
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
  buscarStatusWhatsAppAction,
  desconectarWhatsAppAction,
  gerarQrCodeWhatsAppAction,
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
  const [instanceName, setInstanceName] = useState<string>(initialInstanceName || `restaurante_${slug}`);

  // QR Code Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const [isPending, startTransition] = useTransition();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Consulta o status de conexão
  const checkStatus = useCallback(async (silent = false) => {
    try {
      const res = await buscarStatusWhatsAppAction(slug);
      if (res.instanceName) setInstanceName(res.instanceName);

      if (res.isConnected) {
        setIsConnected(true);
        setPhone(res.phone ?? null);
        setProfileName(res.profileName ?? null);
        setProfilePicUrl(res.profilePicUrl ?? null);

        // Se estava com modal de QR Code aberto, fecha e comemora
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
  }, [slug, isQrModalOpen]);

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
    if (!confirm("Deseja realmente desconectar este WhatsApp? As mensagens automáticas e o robô de IA serão interrompidos até uma nova conexão.")) {
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

  const formatPhone = (rawPhone: string) => {
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length === 13) {
      // DDI (55) + DDD (2) + 9 dígitos
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return rawPhone;
  };

  return (
    <>
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <MessageSquareIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                Conexão do WhatsApp
                {isConnected === true && (
                  <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-xs">
                    <WifiIcon className="h-3 w-3 animate-pulse" /> Conectado
                  </Badge>
                )}
                {isConnected === false && (
                  <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 text-xs text-muted-foreground">
                    <WifiOffIcon className="h-3 w-3" /> Desconectado
                  </Badge>
                )}
                {isConnected === null && (
                  <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs">
                    <Loader2Icon className="h-3 w-3 animate-spin" /> Verificando...
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Conecte o número do seu restaurante para envio automático de mensagens e recuperação de carrinho.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void checkStatus(false)}
              disabled={isPending}
              title="Atualizar status"
              className="h-9 px-3"
            >
              <RefreshCwIcon className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {isConnected === true ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {profilePicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePicUrl}
                    alt={profileName || "WhatsApp"}
                    className="h-12 w-12 rounded-full border-2 border-emerald-400 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-200 text-emerald-800">
                    <SmartphoneIcon className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-emerald-950">
                      {profileName || "WhatsApp do Restaurante"}
                    </p>
                    <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700">
                    {phone ? formatPhone(phone) : "Número conectado"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Instância: <code className="rounded bg-emerald-100/80 px-1 py-0.5">{instanceName}</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-0">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDesconectar}
                  disabled={isPending}
                  className="gap-2"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Desconectar WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <SmartphoneIcon className="h-5 w-5 text-slate-500" />
                  Nenhum WhatsApp conectado no momento
                </p>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Clique no botão ao lado para gerar o QR Code. Basta escanear com a câmera do seu celular através do menu <strong>Aparelhos Conectados</strong> do seu WhatsApp.
                </p>
              </div>

              <Button
                onClick={handleGerarQrCode}
                disabled={isGeneratingQr}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 shrink-0 h-11 px-5"
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
              <QrCodeIcon className="h-6 w-6 text-emerald-600" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription className="text-sm">
              Escaneie o código abaixo com o WhatsApp do seu restaurante.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 flex flex-col items-center justify-center">
            {isGeneratingQr ? (
              <div className="flex h-64 w-64 flex-col items-center justify-center gap-3 rounded-2xl border bg-slate-50 p-6 text-muted-foreground">
                <Loader2Icon className="h-10 w-10 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">Preparando QR Code...</p>
              </div>
            ) : qrCodeBase64 ? (
              <div className="relative flex flex-col items-center gap-3">
                <div className="rounded-2xl border-4 border-emerald-500/20 bg-white p-3 shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeBase64}
                    alt="QR Code WhatsApp"
                    className="h-60 w-60 object-contain rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 animate-pulse bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
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
              <li>Toque nos três pontos ou em <strong>Configurações</strong> &gt; <strong>Aparelhos Conectados</strong>.</li>
              <li>Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para este QR Code.</li>
            </ol>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsQrModalOpen(false)}
            >
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
