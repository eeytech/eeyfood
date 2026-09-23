"use client";

import type { Restaurant } from "@fsw/db";
import {
  CheckCircle2Icon,
  ShoppingBagIcon,
  SparklesIcon,
  TrendingUpIcon,
  TruckIcon,
  ShieldCheckIcon,
  SaveIcon,
  AlertCircleIcon,
  HelpCircleIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { salvarFreteGratisAction } from "../actions";
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

interface FreteClientProps {
  slug: string;
  restaurant: Restaurant;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function FreteClient({ slug, restaurant }: FreteClientProps) {
  const initialThreshold =
    restaurant.freeDeliveryThreshold != null ? Number(restaurant.freeDeliveryThreshold) : 0;
  const initialEnabled = initialThreshold > 0;

  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [thresholdValue, setThresholdValue] = useState(
    initialThreshold > 0 ? initialThreshold.toFixed(2).replace(".", ",") : "50,00",
  );
  const [simulatedSubtotal, setSimulatedSubtotal] = useState(30.9);
  const [isPending, startTransition] = useTransition();

  const numericThreshold = parseFloat(thresholdValue.replace(",", ".")) || 0;

  // Cálculos do simulador de carrinho
  const remaining = Math.max(numericThreshold - simulatedSubtotal, 0);
  const progressPercent =
    numericThreshold > 0 ? Math.min((simulatedSubtotal / numericThreshold) * 100, 100) : 0;
  const isFreeDeliveryAchieved = numericThreshold > 0 && remaining === 0;

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setThresholdValue("0,00");
      return;
    }
    const numeric = parseInt(digits, 10) / 100;
    setThresholdValue(numeric.toFixed(2).replace(".", ","));
  };

  const handleSave = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("enabled", isEnabled ? "true" : "false");
      formData.set("threshold", thresholdValue);

      const result = await salvarFreteGratisAction(slug, formData);
      if (result.success) {
        toast.success("Configurações de frete grátis salvas com sucesso!");
      } else {
        toast.error(result.error ?? "Erro ao salvar frete grátis.");
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="border border-slate-300 bg-white text-xs font-semibold text-slate-700"
            >
              Fidelização & Benefícios
            </Badge>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-medium text-slate-600">Frete Grátis</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Frete Grátis
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure o valor mínimo de pedido para oferecer frete grátis aos seus clientes e incentive compras de maior valor.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isPending}
          className="gap-2 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800"
        >
          <SaveIcon size={16} />
          {isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">
              Status do Benefício
            </CardTitle>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                isEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              <TruckIcon size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  isEnabled ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
              <span className="font-display text-xl font-bold text-slate-900">
                {isEnabled ? "Ativo" : "Desativado"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isEnabled
                ? "Disponível para clientes no carrinho do app"
                : "Sem incentivo de frete grátis ativo"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">
              Valor Mínimo para Isenção
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <TrendingUpIcon size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-bold text-slate-900">
              {isEnabled && numericThreshold > 0 ? formatCurrency(numericThreshold) : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isEnabled
                ? `Compras acima de ${formatCurrency(numericThreshold)} ganham frete 100% grátis`
                : "Defina um valor para ativar"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">
              Aumento de Ticket Médio
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <SparklesIcon size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-bold text-slate-900">Incentivo Visual</p>
            <p className="mt-1 text-xs text-slate-500">
              Barra de progresso interativa exibida diretamente no carrinho do cliente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Configuration Grid ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Form: Configuração */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">
                Regra de Frete Grátis
              </CardTitle>
              <CardDescription>
                Defina quando o benefício deve ser ativado automaticamente nas entregas.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Toggle de Ativação */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="free-delivery-toggle" className="text-sm font-semibold text-slate-900">
                    Ativar Frete Grátis por Valor
                  </Label>
                  <p className="text-xs text-slate-500">
                    Habilita o bônus de frete zero quando o pedido atinge o valor mínimo estipulado.
                  </p>
                </div>
                <Switch
                  id="free-delivery-toggle"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                />
              </div>

              {/* Valor Mínimo */}
              <div className={`space-y-2 transition-opacity ${isEnabled ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
                <Label htmlFor="threshold-input" className="text-xs font-semibold text-slate-700">
                  Valor Mínimo do Pedido (R$)
                </Label>
                <div className="relative max-w-sm">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                    R$
                  </span>
                  <Input
                    id="threshold-input"
                    value={thresholdValue}
                    onChange={handleCurrencyChange}
                    placeholder="0,00"
                    disabled={!isEnabled}
                    className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-base font-semibold text-slate-900 focus:border-slate-400"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Exemplo: Se configurado R$ 50,00, clientes com pedidos de R$ 40,00 verão a mensagem
                  incentivando a adicionar mais R$ 10,00 para obter frete grátis.
                </p>
              </div>

              {/* Dicas e Informações de Regras */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-blue-800">
                  <ShieldCheckIcon size={16} />
                  <span>Como funciona para o cliente</span>
                </div>
                <ul className="list-inside list-disc space-y-1 text-slate-600">
                  <li>
                    Aplicado exclusivamente a pedidos com opção de entrega (<strong>Delivery</strong>).
                  </li>
                  <li>
                    O cliente vê em tempo real quanto falta para atingir a meta no carrinho de compras.
                  </li>
                  <li>
                    Ao atingir ou ultrapassar o valor estipulado, a taxa de entrega é zerada automaticamente no checkout.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Preview: Simulador do App Vendas */}
        <div className="space-y-4 lg:col-span-5">
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Pré-visualização no Carrinho
                  </CardTitle>
                  <CardDescription>
                    Veja como o cliente enxerga o incentivo no app de vendas.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-[11px] font-normal">
                  App Vendas
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Simulador Interativo do Valor do Pedido */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Simular valor no carrinho:</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(simulatedSubtotal)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(numericThreshold * 1.3, 100)}
                  step={1}
                  value={simulatedSubtotal}
                  onChange={(e) => setSimulatedSubtotal(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>R$ 0,00</span>
                  <span>Meta: {formatCurrency(numericThreshold)}</span>
                  <span>{formatCurrency(Math.max(numericThreshold * 1.3, 100))}</span>
                </div>
              </div>

              {/* Caixa do Carrinho Réplica do App Vendas */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <ShoppingBagIcon size={18} className="text-slate-800" />
                  <h4 className="text-sm font-bold text-slate-900">Seu pedido</h4>
                  <span className="ml-auto text-xs text-slate-400">2 itens</span>
                </div>

                <div className="pt-3">
                  {!isEnabled || numericThreshold <= 0 ? (
                    <div className="rounded-xl bg-slate-50 p-4 text-center">
                      <p className="text-xs text-slate-500">
                        O frete grátis está desativado. Nenhuma barra de incentivo será exibida aos clientes.
                      </p>
                    </div>
                  ) : isFreeDeliveryAchieved ? (
                    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3">
                      <CheckCircle2Icon size={16} className="shrink-0 text-emerald-600" />
                      <p className="text-xs font-semibold text-emerald-700">
                        Parabéns, você garantiu Frete Grátis neste pedido!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        Falta apenas{" "}
                        <span className="font-bold text-slate-800">
                          {formatCurrency(remaining)}
                        </span>{" "}
                        para você ganhar{" "}
                        <span className="font-semibold text-emerald-600">Frete Grátis!</span>
                      </p>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
