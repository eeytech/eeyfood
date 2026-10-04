"use client";

import {
  CheckCircle2Icon,
  PackageCheckIcon,
  SaveIcon,
  TimerIcon,
  TruckIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { updateDeliveryParamsAction } from "@/app/(dashboard)/logistica-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Restaurant } from "@fsw/db";

interface DeliveryParamsTabProps {
  slug: string;
  restaurant: Restaurant;
  onPendingChange?: (isPending: boolean) => void;
}

function CurrencyInput({
  id,
  name,
  initialValue,
  placeholder = "0,00",
}: {
  id: string;
  name: string;
  initialValue?: number | null;
  placeholder?: string;
}) {
  const initial =
    initialValue != null && initialValue > 0
      ? initialValue.toFixed(2).replace(".", ",")
      : "";
  const [display, setDisplay] = useState(initial);
  const [raw, setRaw] = useState(initialValue?.toString() ?? "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setDisplay("");
      setRaw("");
      return;
    }
    const numeric = parseInt(digits, 10) / 100;
    setDisplay(numeric.toFixed(2).replace(".", ","));
    setRaw(numeric.toFixed(2));
  };

  return (
    <>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
          R$
        </span>
        <Input
          id={id}
          placeholder={placeholder}
          value={display}
          onChange={handleChange}
          className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 text-sm text-slate-900 focus:bg-white"
          inputMode="numeric"
        />
      </div>
      <input type="hidden" name={name} value={raw} />
    </>
  );
}

export function DeliveryParamsTab({
  slug,
  restaurant,
  onPendingChange,
}: DeliveryParamsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaved(false);

    onPendingChange?.(true);
    startTransition(async () => {
      try {
        await updateDeliveryParamsAction(slug, formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } finally {
        onPendingChange?.(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
          Parâmetros Gerais de Entrega
        </h2>
        <p className="text-xs text-slate-500">
          Configure as taxas padrão, limites mínimos de pedido e o tempo estimado de entrega exibido no cardápio digital do cliente.
        </p>
      </div>

      <form id="delivery-params-form" onSubmit={handleSubmit} className="space-y-4">
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
          {/* ── Taxa de entrega fixa ── */}
          <div className="flex items-start gap-4 border-b border-slate-100 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <TruckIcon size={18} />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="deliveryFee" className="text-sm font-semibold text-slate-900">
                Taxa de Entrega Fixa
              </Label>
              <p className="text-xs text-slate-500">
                Valor cobrado do cliente em todas as entregas (caso não haja regras por raio/zona). Use R$ 0,00 para não cobrar taxa fixa.
              </p>
              <div className="mt-2 max-w-xs">
                <CurrencyInput
                  id="deliveryFee"
                  name="deliveryFee"
                  initialValue={restaurant.deliveryFee}
                />
              </div>
            </div>
          </div>

          {/* ── Valor mínimo do pedido ── */}
          <div className="flex items-start gap-4 border-b border-slate-100 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <PackageCheckIcon size={18} />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="minimumOrderValue"
                className="text-sm font-semibold text-slate-900"
              >
                Valor Mínimo do Pedido
              </Label>
              <p className="text-xs text-slate-500">
                Pedidos abaixo deste valor não são autorizados para despacho de delivery. Use R$ 0,00 para permitir qualquer valor.
              </p>
              <div className="mt-2 max-w-xs">
                <CurrencyInput
                  id="minimumOrderValue"
                  name="minimumOrderValue"
                  initialValue={restaurant.minimumOrderValue}
                />
              </div>
            </div>
          </div>

          {/* ── Frete grátis ── */}
          <div className="flex items-start gap-4 border-b border-slate-100 bg-primary/[0.02] p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <CheckCircle2Icon size={18} />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">Frete Grátis</span>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Centralizado em Fidelização
                </span>
              </div>
              <p className="text-xs text-slate-500">
                As regras de bônus e o valor mínimo de pedido para frete grátis agora são configurados de forma centralizada na seção de Fidelização.
              </p>
              <div className="pt-1">
                <Link
                  href="/frete"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Ir para Fidelização &gt; Frete &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* ── Tempo estimado ── */}
          <div className="flex items-start gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <TimerIcon size={18} />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="estimatedDeliveryTime"
                className="text-sm font-semibold text-slate-900"
              >
                Tempo Estimado de Entrega
              </Label>
              <p className="text-xs text-slate-500">
                Texto exibido na finalização do pedido no aplicativo do cliente. Exemplo: <span className="font-medium text-slate-700">40 a 60 min</span>.
              </p>
              <div className="mt-2 max-w-xs">
                <Input
                  id="estimatedDeliveryTime"
                  name="estimatedDeliveryTime"
                  placeholder="Ex.: 40 a 60 min"
                  defaultValue={restaurant.estimatedDeliveryTime ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Resumo visual */}
        {(restaurant.deliveryFee > 0 ||
          restaurant.minimumOrderValue > 0 ||
          restaurant.freeDeliveryThreshold != null ||
          restaurant.estimatedDeliveryTime) && (
          <Card className="border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resumo da Configuração Atual:
            </p>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-600">
              {restaurant.deliveryFee > 0 && (
                <li>
                  Taxa de entrega padrão:{" "}
                  <strong className="text-primary font-bold">
                    R$ {restaurant.deliveryFee.toFixed(2).replace(".", ",")}
                  </strong>
                </li>
              )}
              {restaurant.minimumOrderValue > 0 && (
                <li>
                  Pedido mínimo:{" "}
                  <strong className="text-primary font-bold">
                    R$ {restaurant.minimumOrderValue.toFixed(2).replace(".", ",")}
                  </strong>
                </li>
              )}
              {restaurant.freeDeliveryThreshold != null && (
                <li>
                  Frete grátis acima de:{" "}
                  <strong className="text-primary font-bold">
                    R$ {restaurant.freeDeliveryThreshold.toFixed(2).replace(".", ",")}
                  </strong>
                </li>
              )}
              {restaurant.estimatedDeliveryTime && (
                <li>
                  Tempo estimado:{" "}
                  <strong className="text-primary font-bold">{restaurant.estimatedDeliveryTime}</strong>
                </li>
              )}
            </ul>
          </Card>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
          >
            <SaveIcon size={15} />
            <span>{isPending ? "Salvando..." : "Salvar Parâmetros"}</span>
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <CheckCircle2Icon size={14} />
              Parâmetros salvos com sucesso!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
