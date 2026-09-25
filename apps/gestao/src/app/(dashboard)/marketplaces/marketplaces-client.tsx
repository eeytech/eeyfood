"use client";

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  HelpCircleIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  StoreIcon,
  ZapIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MarketplaceConfigItem,
  salvarIntegracaoMarketplaceAction,
  testarConexaoMarketplaceAction,
} from "./marketplaces-actions";

interface MarketplacesClientProps {
  slug: string;
  integracoes: MarketplaceConfigItem[];
  recentMarketplaceOrdersCount: number;
}

export function MarketplacesClient({
  slug,
  integracoes,
  recentMarketplaceOrdersCount,
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

  // Rappi State
  const rappiConfig = integracoes.find((i) => i.type === "RAPPI") || {
    type: "RAPPI" as const,
    isActive: false,
    merchantId: "",
    apiToken: "",
  };
  const [rappiActive, setRappiActive] = useState(rappiConfig.isActive);
  const [rappiMerchantId, setRappiMerchantId] = useState(rappiConfig.merchantId || "");

  // URL do webhook
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://gestao.fswdonalds.eeytech.com";
  const ifoodWebhookUrl = `${currentOrigin}/api/webhooks/ifood`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada para a área de transferência!`);
  };

  // Salvar iFood
  const handleSaveIfood = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("type", "IFOOD");
    formData.set("merchantId", ifoodMerchantId);
    formData.set("apiToken", ifoodToken);
    formData.set("isActive", String(ifoodActive));

    startTransition(async () => {
      const res = await salvarIntegracaoMarketplaceAction(slug, formData);
      if (res.success) {
        toast.success("Configuração do iFood salva com sucesso!");
      } else {
        toast.error(res.error || "Erro ao salvar configuração.");
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

  // Salvar Rappi
  const handleSaveRappi = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("type", "RAPPI");
    formData.set("merchantId", rappiMerchantId);
    formData.set("isActive", String(rappiActive));

    startTransition(async () => {
      const res = await salvarIntegracaoMarketplaceAction(slug, formData);
      if (res.success) {
        toast.success("Configuração da Rappi salva!");
      } else {
        toast.error(res.error || "Erro ao salvar configuração.");
      }
    });
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
              Marketplaces & Canais de Venda
            </h1>
            <p className="text-sm text-slate-500">
              Conecte sua conta do iFood e outros marketplaces para receber pedidos diretamente no Kanban, KDS e PDV.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs"
          >
            <ZapIcon size={13} className="mr-1.5 text-amber-500 fill-amber-500" />
            {recentMarketplaceOrdersCount} pedidos integrados
          </Badge>
        </div>
      </div>

      {/* ── Grid Principal de Integrações ────────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: iFood & Rappi Forms (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card: iFood ─────────────────────────────────── */}
          <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white font-black text-sm shadow-xs">
                  iF
                </div>
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
                  <p className="text-xs text-slate-500">
                    Integração oficial via Webhook e API de Pedidos do Portal do Parceiro.
                  </p>
                </div>
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

            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSaveIfood} className="space-y-4">
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

                <div className="flex items-center justify-between pt-2">
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

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending}
                    className="h-9 gap-1.5 bg-slate-950 px-5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
                  >
                    {isPending && <Loader2Icon size={14} className="animate-spin" />}
                    Salvar Configurações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card: Rappi ─────────────────────────────────── */}
          <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white font-black text-sm shadow-xs">
                  Rp
                </div>
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
                  <p className="text-xs text-slate-500">
                    Recebimento de pedidos direto da rede Rappi.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="rappi-toggle"
                  checked={rappiActive}
                  onCheckedChange={setRappiActive}
                />
              </div>
            </div>

            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSaveRappi} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rappiMerchantId" className="text-xs font-semibold text-slate-700">
                    Store ID / Identificador da Loja na Rappi
                  </Label>
                  <Input
                    id="rappiMerchantId"
                    value={rappiMerchantId}
                    onChange={(e) => setRappiMerchantId(e.target.value)}
                    placeholder="Ex: 900123456"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending}
                    className="h-9 gap-1.5 bg-slate-950 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
                  >
                    Salvar Rappi
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Guia & FAQ (4 cols) */}
        <div className="space-y-4 lg:col-span-4">
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

              <div className="space-y-2 pt-1 text-slate-500">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                  <ShieldCheckIcon size={15} className="text-emerald-600" />
                  Benefícios da Integração
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                  <li>Pedidos caem direto no KDS da cozinha.</li>
                  <li>Impressão térmica dispara automaticamente.</li>
                  <li>Total unificado nos relatórios e DRE do restaurante.</li>
                  <li>Controle de estoque centralizado.</li>
                </ul>
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
        </div>
      </div>
    </div>
  );
}
