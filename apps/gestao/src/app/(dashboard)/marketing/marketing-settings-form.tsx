"use client";

import type { MarketingSettings } from "@fsw/db";
import {
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  SaveIcon,
  Share2Icon,
  ShoppingCartIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface MarketingSettingsFormProps {
  settings: MarketingSettings | null;
  saveAction: (formData: FormData) => Promise<void>;
}

export function MarketingSettingsForm({
  settings,
  saveAction,
}: MarketingSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [showToken, setShowToken] = useState(false);
  const [cartEnabled, setCartEnabled] = useState(
    settings?.abandonedCartEnabled ?? true,
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await saveAction(fd);
        toast.success("Configurações de marketing salvas com sucesso!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar configurações.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Section 1: Meta / Facebook Ads ── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                <Share2Icon size={18} />
              </div>
              <div>
                <CardTitle className="font-display text-base font-semibold text-slate-900">
                  Meta Ads (Facebook & Instagram)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Rastreie visualizações e vendas vindas de anúncios no Facebook e Instagram.
                </CardDescription>
              </div>
            </div>
            {settings?.metaPixelId ? (
              <Badge className="border-blue-200 bg-blue-50 text-[11px] font-medium text-blue-700">
                Ativo
              </Badge>
            ) : (
              <Badge variant="outline" className="border-slate-200 text-[11px] text-slate-400">
                Não configurado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaPixelId" className="text-xs font-semibold text-slate-700">
                ID do Meta Pixel
              </Label>
              <span className="text-[11px] text-slate-400">Ex: 1234567890123456</span>
            </div>
            <Input
              id="metaPixelId"
              name="metaPixelId"
              placeholder="Digite o ID do Pixel do Facebook"
              defaultValue={settings?.metaPixelId ?? ""}
              className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
            />
            <p className="text-[11px] text-slate-500">
              Encontre no Gerenciador de Eventos da Meta em Fontes de Dados &gt; Configurações.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaCapiToken" className="text-xs font-semibold text-slate-700">
                Token da API de Conversões (CAPI)
              </Label>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {showToken ? (
                  <>
                    <EyeOffIcon size={12} /> Ocultar token
                  </>
                ) : (
                  <>
                    <EyeIcon size={12} /> Visualizar token
                  </>
                )}
              </button>
            </div>
            <Input
              id="metaCapiToken"
              name="metaCapiToken"
              type={showToken ? "text" : "password"}
              placeholder="EAAxxxx... (Token de acesso do sistema)"
              defaultValue={settings?.metaCapiToken ?? ""}
              className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white"
            />
            <p className="text-[11px] text-slate-500">
              Permite o envio seguro de compras diretamente do servidor, contornando bloqueadores de anúncios (iOS 14+).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Google Analytics & GTM ── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <TrendingUpIcon size={18} />
              </div>
              <div>
                <CardTitle className="font-display text-base font-semibold text-slate-900">
                  Google Analytics & Tag Manager
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Monitore o comportamento de navegação no Google Analytics 4 (GA4) e gerencie tags via GTM.
                </CardDescription>
              </div>
            </div>
            {settings?.ga4MeasurementId || settings?.gtmContainerId ? (
              <Badge className="border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700">
                Ativo
              </Badge>
            ) : (
              <Badge variant="outline" className="border-slate-200 text-[11px] text-slate-400">
                Não configurado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="ga4MeasurementId" className="text-xs font-semibold text-slate-700">
                  ID do Google Analytics (GA4)
                </Label>
              </div>
              <Input
                id="ga4MeasurementId"
                name="ga4MeasurementId"
                placeholder="Ex: G-XXXXXXXXXX"
                defaultValue={settings?.ga4MeasurementId ?? ""}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
              />
              <p className="text-[11px] text-slate-500">ID de métrica do fluxo da web GA4.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="gtmContainerId" className="text-xs font-semibold text-slate-700">
                  ID do Google Tag Manager (GTM)
                </Label>
              </div>
              <Input
                id="gtmContainerId"
                name="gtmContainerId"
                placeholder="Ex: GTM-XXXXXXX"
                defaultValue={settings?.gtmContainerId ?? ""}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
              />
              <p className="text-[11px] text-slate-500">Código do contêiner Web no GTM.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Carrinho Abandonado ── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <ShoppingCartIcon size={18} />
              </div>
              <div>
                <CardTitle className="font-display text-base font-semibold text-slate-900">
                  Recuperação de Carrinho Abandonado
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Envie mensagens automáticas pelo WhatsApp com incentivo de cupom de desconto para resgatar vendas.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={cartEnabled}
              onCheckedChange={setCartEnabled}
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
            />
            <input
              type="hidden"
              name="abandonedCartEnabled"
              value={cartEnabled ? "true" : "false"}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="abandonedCartDelayMinutes" className="text-xs font-semibold text-slate-700">
                Tempo de Espera (minutos)
              </Label>
              <Input
                id="abandonedCartDelayMinutes"
                name="abandonedCartDelayMinutes"
                type="number"
                min={30}
                max={1440}
                defaultValue={settings?.abandonedCartDelayMinutes ?? 120}
                disabled={!cartEnabled}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-500">
                Tempo que o sistema aguarda após o abandono para enviar o lembrete (mínimo 30m).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="abandonedCartCouponPercent" className="text-xs font-semibold text-slate-700">
                Desconto do Cupom Especial (%)
              </Label>
              <Input
                id="abandonedCartCouponPercent"
                name="abandonedCartCouponPercent"
                type="number"
                min={0}
                max={50}
                step={0.5}
                defaultValue={settings?.abandonedCartCouponPercent ?? 5}
                disabled={!cartEnabled}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-500">
                Porcentagem de desconto concedida no cupom gerado na mensagem (0 a 50%).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Submit Button ── */}
      <div className="flex items-center justify-end">
        <Button
          type="submit"
          disabled={isPending}
          className="h-10 gap-2 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-all"
        >
          {isPending ? (
            <>
              <Loader2Icon size={16} className="animate-spin" />
              <span>Salvando alterações...</span>
            </>
          ) : (
            <>
              <SaveIcon size={16} />
              <span>Salvar Configurações</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
