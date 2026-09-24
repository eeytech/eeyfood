"use client";

import type { MarketingSettings } from "@fsw/db";
import {
  ActivityIcon,
  BarChart2Icon,
  CheckCircle2Icon,
  CreditCardIcon,
  EyeIcon,
  EyeOffIcon,
  HelpCircleIcon,
  Loader2Icon,
  SaveIcon,
  Share2Icon,
  ShoppingCartIcon,
  TrendingUpIcon,
  ZapIcon,
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
import { cn } from "@/lib/utils";

interface MarketingSettingsFormProps {
  settings: MarketingSettings | null;
  saveAction: (formData: FormData) => Promise<void>;
}

const EVENTS = [
  {
    name: "ViewContent",
    label: "Visualização do Item",
    desc: "Disparado quando o cliente abre os detalhes de um produto ou prato.",
    icon: EyeIcon,
    colorClass: "bg-blue-50 text-blue-600 border-blue-200/80",
  },
  {
    name: "AddToCart",
    label: "Adicionado ao Carrinho",
    desc: "Disparado quando o item é colocado na sacola de compras.",
    icon: ShoppingCartIcon,
    colorClass: "bg-amber-50 text-amber-600 border-amber-200/80",
  },
  {
    name: "InitiateCheckout",
    label: "Início de Finalização",
    desc: "Disparado na abertura da tela de entrega e pagamento.",
    icon: CreditCardIcon,
    colorClass: "bg-purple-50 text-purple-600 border-purple-200/80",
  },
  {
    name: "Purchase",
    label: "Pedido Confirmado",
    desc: "Disparado no sucesso da compra, enviando o valor total do pedido.",
    icon: CheckCircle2Icon,
    colorClass: "bg-emerald-50 text-emerald-600 border-emerald-200/80",
  },
];

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
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar configurações.",
        );
      }
    });
  };

  const isMetaActive = Boolean(settings?.metaPixelId);
  const isGoogleActive = Boolean(
    settings?.ga4MeasurementId || settings?.gtmContainerId,
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Page Header com Botão Salvar Configurações no lugar da tag ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <BarChart2Icon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Marketing & Rastreamento
            </h1>
            <p className="text-sm text-slate-500">
              Configure pixels de rastreamento de anúncios (Meta, Google) e recuperação de carrinho via WhatsApp.
            </p>
          </div>
        </div>

        {/* Botão de Salvar Configurações posicionado no topo onde ficava 'Injeção de Tags Ativa' */}
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-all"
          >
            {isPending ? (
              <>
                <Loader2Icon size={16} className="animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <SaveIcon size={16} />
                <span>Salvar Configurações</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Meta Ads Card */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Meta Ads & Pixel
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <Share2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl sm:text-2xl font-bold text-blue-700">
              {isMetaActive ? "Configurado" : "Pendente"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {settings?.metaPixelId ? `ID: ${settings.metaPixelId}` : "Facebook & Instagram"}
            </p>
          </CardContent>
        </Card>

        {/* Google Analytics Card */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Google Analytics
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <TrendingUpIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl sm:text-2xl font-bold text-emerald-700">
              {isGoogleActive ? "Configurado" : "Pendente"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {settings?.ga4MeasurementId ? `GA4: ${settings.ga4MeasurementId}` : "GA4 & GTM Web"}
            </p>
          </CardContent>
        </Card>

        {/* Carrinho Abandonado Card */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Carrinho Abandonado
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <ShoppingCartIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl sm:text-2xl font-bold text-amber-700">
              {cartEnabled ? "Ativo" : "Inativo"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {cartEnabled
                ? `Cupom com ${settings?.abandonedCartCouponPercent ?? 5}% OFF`
                : "Automação pausada"}
            </p>
          </CardContent>
        </Card>

        {/* Eventos Padrão Card */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Eventos Padrão
              </span>
              <div className="rounded-lg bg-purple-100 p-1.5 text-purple-700">
                <ActivityIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl sm:text-2xl font-bold text-purple-700">
              4 Eventos
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              Injetados automaticamente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Grid ────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Form Settings (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
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
        </div>

        {/* Right Column: Informative cards (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Automatic Events Card */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-slate-900 p-1.5 text-white">
                  <ZapIcon size={16} />
                </div>
                <div>
                  <CardTitle className="font-display text-base font-semibold text-slate-900">
                    Eventos Monitorados no Cardápio
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Ao preencher os IDs ao lado, estes eventos são registrados automaticamente.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-3">
              {EVENTS.map((event) => {
                const Icon = event.icon;
                return (
                  <div
                    key={event.name}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className={cn("rounded-lg p-2 shrink-0 border", event.colorClass)}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {event.name}
                        </span>
                        <Badge variant="outline" className="border-slate-200 bg-white text-[10px] font-medium text-slate-600">
                          {event.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {event.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* How Abandoned Cart Recovery Works */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <HelpCircleIcon size={14} className="text-amber-500" />
                Como Funciona a Recuperação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600">
              <p>
                O sistema monitora os clientes que adicionaram produtos e iniciaram o checkout mas não finalizaram o pedido.
              </p>
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    1
                  </span>
                  <span>Cliente abandona o pedido no checkout</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    2
                  </span>
                  <span>Sistema aguarda o tempo de espera configurado</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    3
                  </span>
                  <span>WhatsApp IA envia mensagem amigável com cupom</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Nota: O disparo é realizado através do bot de WhatsApp IA cadastrado para o estabelecimento.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
