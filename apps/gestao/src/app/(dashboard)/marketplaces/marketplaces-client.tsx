"use client";

import {
  CopyIcon,
  ExternalLinkIcon,
  HelpCircleIcon,
  Loader2Icon,
  RefreshCwIcon,
  SaveIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  ZapIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MarketplaceConfigItem,
  salvarTodasIntegracoesMarketplaceAction,
  simularPedidoMarketplaceAction,
  testarConexaoMarketplaceAction,
} from "./marketplaces-actions";

interface MarketplacesClientProps {
  slug: string;
  integracoes: MarketplaceConfigItem[];
  recentMarketplaceOrdersCount: number;
  isSuperAdmin?: boolean;
}

export function MarketplacesClient({
  slug,
  integracoes,
  recentMarketplaceOrdersCount,
  isSuperAdmin = false,
}: MarketplacesClientProps) {
  const [isPending, startTransition] = useTransition();

  // iFood State
  const ifoodConfig = integracoes.find((i) => i.type === "IFOOD") || {
    type: "IFOOD" as const,
    isActive: false,
    merchantId: "",
    apiToken: "",
  };
  const [ifoodActive, setIfoodActive] = useState(ifoodConfig.isActive);
  const [ifoodMerchantId, setIfoodMerchantId] = useState(ifoodConfig.merchantId || "");
  const [ifoodToken, setIfoodToken] = useState(ifoodConfig.apiToken || "");
  const [isTestingIfood, setIsTestingIfood] = useState(false);
  const [isSimulatingIfood, setIsSimulatingIfood] = useState(false);

  // Rappi State
  const rappiConfig = integracoes.find((i) => i.type === "RAPPI") || {
    type: "RAPPI" as const,
    isActive: false,
    merchantId: "",
    apiToken: "",
  };
  const [rappiActive, setRappiActive] = useState(rappiConfig.isActive);
  const [rappiMerchantId, setRappiMerchantId] = useState(rappiConfig.merchantId || "");
  const [rappiToken, setRappiToken] = useState(rappiConfig.apiToken || "");
  const [isTestingRappi, setIsTestingRappi] = useState(false);
  const [isSimulatingRappi, setIsSimulatingRappi] = useState(false);

  // Keeta State (Meituan)
  const keetaConfig = integracoes.find((i) => i.type === "KEETA") || {
    type: "KEETA" as const,
    isActive: false,
    merchantId: "",
    apiToken: "",
  };
  const [keetaActive, setKeetaActive] = useState(keetaConfig.isActive);
  const [keetaMerchantId, setKeetaMerchantId] = useState(keetaConfig.merchantId || "");
  const [keetaToken, setKeetaToken] = useState(keetaConfig.apiToken || "");
  const [isTestingKeeta, setIsTestingKeeta] = useState(false);
  const [isSimulatingKeeta, setIsSimulatingKeeta] = useState(false);

  // URLs dos webhooks
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://gestao.fswdonalds.eeytech.com";
  const ifoodWebhookUrl = `${currentOrigin}/api/webhooks/ifood`;
  const rappiWebhookUrl = `${currentOrigin}/api/webhooks/rappi`;
  const keetaWebhookUrl = `${currentOrigin}/api/webhooks/keeta`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada para a área de transferência!`);
  };

  // Salvar tudo em uma única ação
  const handleSaveAll = () => {
    startTransition(async () => {
      const res = await salvarTodasIntegracoesMarketplaceAction(slug, [
        {
          type: "IFOOD",
          merchantId: ifoodMerchantId,
          apiToken: ifoodToken,
          isActive: ifoodActive,
        },
        {
          type: "RAPPI",
          merchantId: rappiMerchantId,
          apiToken: rappiToken,
          isActive: rappiActive,
        },
        {
          type: "KEETA",
          merchantId: keetaMerchantId,
          apiToken: keetaToken,
          isActive: keetaActive,
        },
      ]);

      if (res.success) {
        toast.success("Configurações salvas com sucesso!");
      } else {
        toast.error(res.error || "Erro ao salvar configurações.");
      }
    });
  };

  // Testar conexão iFood
  const handleTestIfood = async () => {
    setIsTestingIfood(true);
    try {
      const res = await testarConexaoMarketplaceAction(ifoodMerchantId, "IFOOD");
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsTestingIfood(false);
    }
  };

  // Simular Pedido iFood
  const handleSimulateIfood = async () => {
    setIsSimulatingIfood(true);
    try {
      const res = await simularPedidoMarketplaceAction(slug, "IFOOD");
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsSimulatingIfood(false);
    }
  };

  // Testar conexão Rappi
  const handleTestRappi = async () => {
    setIsTestingRappi(true);
    try {
      const res = await testarConexaoMarketplaceAction(rappiMerchantId, "RAPPI");
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsTestingRappi(false);
    }
  };

  // Simular Pedido Rappi
  const handleSimulateRappi = async () => {
    setIsSimulatingRappi(true);
    try {
      const res = await simularPedidoMarketplaceAction(slug, "RAPPI");
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsSimulatingRappi(false);
    }
  };

  // Testar conexão Keeta
  const handleTestKeeta = async () => {
    setIsTestingKeeta(true);
    try {
      const res = await testarConexaoMarketplaceAction(keetaMerchantId, "KEETA");
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsTestingKeeta(false);
    }
  };

  // Simular Pedido Keeta
  const handleSimulateKeeta = async () => {
    setIsSimulatingKeeta(true);
    try {
      const res = await simularPedidoMarketplaceAction(slug, "KEETA");
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsSimulatingKeeta(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-md shadow-red-600/20">
            <ShoppingBagIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Marketplaces e Canais de Venda
            </h1>
            <p className="text-sm text-slate-500">
              Conecte sua conta do iFood e outros marketplaces para receber pedidos diretamente no Kanban, KDS e PDV.
            </p>
          </div>
        </div>

        {/* Contador de Pedidos Integrados + Botão Único Salvar Configurações no canto direito */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className="border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs"
          >
            <ZapIcon size={13} className="mr-1.5 text-amber-500 fill-amber-500" />
            {recentMarketplaceOrdersCount} pedidos integrados
          </Badge>

          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={isPending}
            className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-all"
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

      {/* ── Grid Principal de Integrações ────────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: iFood & Rappi Forms (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card: iFood ─────────────────────────────────── */}
          <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">iFood</h2>
                  <Badge
                    variant="outline"
                    className={
                      ifoodActive
                        ? "border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-[10px] font-medium text-slate-500"
                    }
                  >
                    {ifoodActive ? "Conectado / Ativo" : "Desconectado"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Integração oficial via Webhook e API de Pedidos do Portal do Parceiro.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="ifood-toggle" className="text-xs font-medium text-slate-600 hidden sm:inline">
                  {ifoodActive ? "Ativo" : "Pausado"}
                </Label>
                <Switch
                  id="ifood-toggle"
                  checked={ifoodActive}
                  onCheckedChange={setIfoodActive}
                />
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ifoodMerchantId" className="text-xs font-semibold text-slate-700">
                  Merchant ID (ID do Restaurante no iFood) *
                </Label>
                <Input
                  id="ifoodMerchantId"
                  value={ifoodMerchantId}
                  onChange={(e) => setIfoodMerchantId(e.target.value)}
                  placeholder="Ex: 8b1f592c-63cf-42bb-a94f-123456789abc"
                  className="h-9 text-xs font-mono"
                  required={ifoodActive}
                />
                <p className="text-[11px] text-slate-400">
                  Encontrado nas configurações da sua loja no Portal do Parceiro iFood ou no link da URL da loja.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ifoodToken" className="text-xs font-semibold text-slate-700">
                  Chave de Acesso / Client Secret (Opcional)
                </Label>
                <Input
                  id="ifoodToken"
                  type="password"
                  value={ifoodToken}
                  onChange={(e) => setIfoodToken(e.target.value)}
                  placeholder="Insira o Client Secret fornecido pelo iFood Developer"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                <Label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>URL do Webhook do seu Restaurante</span>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">Endpoint Pronto</span>
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    readOnly
                    value={ifoodWebhookUrl}
                    className="h-8 bg-white text-xs font-mono text-slate-600"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(ifoodWebhookUrl, "URL do Webhook")}
                    className="h-8 gap-1.5 shrink-0 text-xs border-slate-200"
                  >
                    <CopyIcon size={12} />
                    Copiar
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Cadastre este endereço no campo <strong>URL de Webhook</strong> do Portal do Desenvolvedor iFood para receber novos pedidos instantaneamente.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestIfood}
                  disabled={!ifoodMerchantId || isTestingIfood}
                  className="h-9 gap-1.5 text-xs border-slate-200 font-medium"
                >
                  {isTestingIfood ? (
                    <Loader2Icon size={13} className="animate-spin" />
                  ) : (
                    <RefreshCwIcon size={13} />
                  )}
                  Testar Conexão
                </Button>

                {isSuperAdmin && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSimulateIfood}
                    disabled={isSimulatingIfood}
                    className="h-9 gap-1.5 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold"
                  >
                    {isSimulatingIfood ? (
                      <Loader2Icon size={13} className="animate-spin" />
                    ) : (
                      <ZapIcon size={13} className="text-red-600 fill-red-600" />
                    )}
                    Simular Pedido iFood
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card: Rappi ─────────────────────────────────── */}
          <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Rappi</h2>
                  <Badge
                    variant="outline"
                    className={
                      rappiActive
                        ? "border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-[10px] font-medium text-slate-500"
                    }
                  >
                    {rappiActive ? "Ativo" : "Desconectado"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recebimento de pedidos direto da rede Rappi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="rappi-toggle" className="text-xs font-medium text-slate-600 hidden sm:inline">
                  {rappiActive ? "Ativo" : "Pausado"}
                </Label>
                <Switch
                  id="rappi-toggle"
                  checked={rappiActive}
                  onCheckedChange={setRappiActive}
                />
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rappiMerchantId" className="text-xs font-semibold text-slate-700">
                  Store ID / Identificador da Loja na Rappi *
                </Label>
                <Input
                  id="rappiMerchantId"
                  value={rappiMerchantId}
                  onChange={(e) => setRappiMerchantId(e.target.value)}
                  placeholder="Ex: 900123456"
                  className="h-9 text-xs font-mono"
                  required={rappiActive}
                />
                <p className="text-[11px] text-slate-400">
                  Encontrado nas configurações da sua loja no Portal Rappi Partners ou no identificador da URL da loja.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rappiToken" className="text-xs font-semibold text-slate-700">
                  Chave de Acesso / Token da Rappi (Opcional)
                </Label>
                <Input
                  id="rappiToken"
                  type="password"
                  value={rappiToken}
                  onChange={(e) => setRappiToken(e.target.value)}
                  placeholder="Insira a chave/token de integração caso solicitado pelo suporte da Rappi"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                <Label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>URL do Webhook da Rappi</span>
                  <span className="text-[10px] text-orange-600 font-bold uppercase">Endpoint Pronto</span>
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    readOnly
                    value={rappiWebhookUrl}
                    className="h-8 bg-white text-xs font-mono text-slate-600"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(rappiWebhookUrl, "URL do Webhook Rappi")}
                    className="h-8 gap-1.5 shrink-0 text-xs border-slate-200"
                  >
                    <CopyIcon size={12} />
                    Copiar
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Cadastre este endereço nas configurações de integração do Portal Rappi Partners ou informe ao suporte POS da Rappi.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestRappi}
                  disabled={!rappiMerchantId || isTestingRappi}
                  className="h-9 gap-1.5 text-xs border-slate-200 font-medium"
                >
                  {isTestingRappi ? (
                    <Loader2Icon size={13} className="animate-spin" />
                  ) : (
                    <RefreshCwIcon size={13} />
                  )}
                  Testar Conexão
                </Button>

                {isSuperAdmin && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSimulateRappi}
                    disabled={isSimulatingRappi}
                    className="h-9 gap-1.5 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 font-semibold"
                  >
                    {isSimulatingRappi ? (
                      <Loader2Icon size={13} className="animate-spin" />
                    ) : (
                      <ZapIcon size={13} className="text-orange-600 fill-orange-600" />
                    )}
                    Simular Pedido Rappi
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card: Keeta Brasil (Meituan) ─────────────────── */}
          <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                    K
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Keeta Brasil</h2>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Meituan Delivery
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      keetaActive
                        ? "border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-[10px] font-medium text-slate-500"
                    }
                  >
                    {keetaActive ? "Ativo" : "Desconectado"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recebimento integrado de pedidos da rede Keeta Brasil diretamente no PDV e KDS da cozinha.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="keeta-toggle" className="text-xs font-medium text-slate-600 hidden sm:inline">
                  {keetaActive ? "Ativo" : "Pausado"}
                </Label>
                <Switch
                  id="keeta-toggle"
                  checked={keetaActive}
                  onCheckedChange={setKeetaActive}
                />
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="keetaMerchantId" className="text-xs font-semibold text-slate-700">
                  Store ID / Identificador da Loja no Keeta Brasil *
                </Label>
                <Input
                  id="keetaMerchantId"
                  value={keetaMerchantId}
                  onChange={(e) => setKeetaMerchantId(e.target.value)}
                  placeholder="Ex: KT-BR-102938 ou ID numérico da loja no Keeta"
                  className="h-9 text-xs font-mono"
                  required={keetaActive}
                />
                <p className="text-[11px] text-slate-400">
                  Encontrado no Portal do Parceiro Keeta (Keeta Partner Center) nas configurações da loja.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="keetaToken" className="text-xs font-semibold text-slate-700">
                  Chave de Acesso / API Secret Token do Keeta (Opcional)
                </Label>
                <Input
                  id="keetaToken"
                  type="password"
                  value={keetaToken}
                  onChange={(e) => setKeetaToken(e.target.value)}
                  placeholder="Insira o token de integração da API caso fornecido pela equipe técnica do Keeta"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                <Label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>URL do Webhook Keeta Brasil</span>
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-bold uppercase">Endpoint Pronto</span>
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    readOnly
                    value={keetaWebhookUrl}
                    className="h-8 bg-white text-xs font-mono text-slate-600"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(keetaWebhookUrl, "URL do Webhook Keeta")}
                    className="h-8 gap-1.5 shrink-0 text-xs border-slate-200"
                  >
                    <CopyIcon size={12} />
                    Copiar
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Cadastre esta URL no Portal de Desenvolvedores ou Painel de Integrações do Keeta Brasil para sincronização em tempo real.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestKeeta}
                  disabled={!keetaMerchantId || isTestingKeeta}
                  className="h-9 gap-1.5 text-xs border-slate-200 font-medium"
                >
                  {isTestingKeeta ? (
                    <Loader2Icon size={13} className="animate-spin" />
                  ) : (
                    <RefreshCwIcon size={13} />
                  )}
                  Testar Conexão
                </Button>

                {isSuperAdmin && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSimulateKeeta}
                    disabled={isSimulatingKeeta}
                    className="h-9 gap-1.5 text-xs bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 font-semibold"
                  >
                    {isSimulatingKeeta ? (
                      <Loader2Icon size={13} className="animate-spin" />
                    ) : (
                      <ZapIcon size={13} className="text-amber-600 fill-amber-600" />
                    )}
                    Simular Pedido Keeta
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Guias de Integração & Benefícios (4 cols) */}
        <div className="space-y-4 lg:col-span-4">
          {/* Card: Como Conectar iFood */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <HelpCircleIcon size={15} className="text-red-600" />
                Como Conectar seu iFood
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs text-slate-600">
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                <div className="flex items-start gap-2.5 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white mt-0.5">
                    1
                  </span>
                  <span>Acesse o Portal do Parceiro iFood e copie seu <strong>Merchant ID</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white mt-0.5">
                    2
                  </span>
                  <span>Cole o Merchant ID no formulário e ative o botão da integração.</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white mt-0.5">
                    3
                  </span>
                  <span>Copie a <strong>URL do Webhook</strong> gerada ao lado e cadastre na sua aplicação iFood Developer.</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <a
                  href="https://developer.ifood.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  <span>Portal iFood Developer</span>
                  <ExternalLinkIcon size={13} />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Card: Como Conectar Rappi */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <HelpCircleIcon size={15} className="text-orange-500" />
                Como Conectar seu Rappi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs text-slate-600">
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                <div className="flex items-start gap-2.5 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white mt-0.5">
                    1
                  </span>
                  <span>Acesse o <strong>Portal Rappi Partners</strong> (Aliados) e copie o <strong>Store ID</strong> da sua loja.</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white mt-0.5">
                    2
                  </span>
                  <span>Insira o Store ID no formulário ao lado e ative o botão da integração.</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white mt-0.5">
                    3
                  </span>
                  <span>Cadastre a <strong>URL do Webhook Rappi</strong> no portal ou simule pedidos pelo botão <strong>Simular Pedido Rappi</strong>.</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <a
                  href="https://partners.rappi.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  <span>Portal Rappi Partners</span>
                  <ExternalLinkIcon size={13} />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Card: Como Conectar Keeta Brasil */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <HelpCircleIcon size={15} className="text-amber-500" />
                Como Conectar o Keeta Brasil
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs text-slate-600">
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                <div className="flex items-start gap-2.5 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white mt-0.5">
                    1
                  </span>
                  <span>Acesse o <strong>Keeta Merchant Center / Partner</strong> e obtenha seu <strong>Store ID</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white mt-0.5">
                    2
                  </span>
                  <span>Cole o Store ID no formulário, insira a chave da API (se houver) e ative a integração.</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white mt-0.5">
                    3
                  </span>
                  <span>Copie a <strong>URL do Webhook Keeta</strong> para registrar na central de integrações ou realize um pedido de teste no botão abaixo.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Benefícios da Integração */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <ShieldCheckIcon size={15} className="text-emerald-600" />
                Benefícios da Centralização
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 text-xs text-slate-500">
              <ul className="list-disc pl-4 space-y-1.5 text-[11px] leading-relaxed">
                <li>Pedidos caem direto no KDS da cozinha.</li>
                <li>Impressão térmica dispara automaticamente.</li>
                <li>Total unificado nos relatórios e DRE do restaurante.</li>
                <li>Controle de estoque centralizado.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
