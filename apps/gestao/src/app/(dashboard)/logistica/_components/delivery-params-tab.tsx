"use client";

import { CheckCircle2Icon, PackageCheckIcon, TimerIcon, TruckIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { updateDeliveryParamsAction } from "@/app/(dashboard)/logistica-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Restaurant } from "@fsw/db";

interface DeliveryParamsTabProps {
  slug: string;
  restaurant: Restaurant;
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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <Input
          id={id}
          placeholder={placeholder}
          value={display}
          onChange={handleChange}
          className="pl-9"
          inputMode="numeric"
        />
      </div>
      <input type="hidden" name={name} value={raw} />
    </>
  );
}

export function DeliveryParamsTab({ slug, restaurant }: DeliveryParamsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaved(false);

    startTransition(async () => {
      await updateDeliveryParamsAction(slug, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">
          Parâmetros de Entrega
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Configure as taxas, limites e o tempo estimado de entrega exibido no
          app do cliente.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
          {/* ── Taxa de entrega fixa ── */}
          <div className="flex items-start gap-4 border-b px-5 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TruckIcon size={18} />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="deliveryFee" className="text-sm font-semibold">
                Taxa de Entrega Fixa
              </Label>
              <p className="text-xs text-muted-foreground">
                Valor cobrado do cliente em todas as entregas. Use R$ 0,00 para
                não cobrar taxa.
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
          <div className="flex items-start gap-4 border-b px-5 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <PackageCheckIcon size={18} />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="minimumOrderValue"
                className="text-sm font-semibold"
              >
                Valor Mínimo do Pedido
              </Label>
              <p className="text-xs text-muted-foreground">
                Pedidos abaixo deste valor não são aceitos para entrega. Use R$
                0,00 para não impor limite.
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
          <div className="flex items-start gap-4 border-b px-5 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2Icon size={18} />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="freeDeliveryThreshold"
                className="text-sm font-semibold"
              >
                Frete Grátis a partir de
              </Label>
              <p className="text-xs text-muted-foreground">
                Pedidos que atingirem este valor terão frete grátis
                automaticamente. Deixe em branco para desativar.
              </p>
              <div className="mt-2 max-w-xs">
                <CurrencyInput
                  id="freeDeliveryThreshold"
                  name="freeDeliveryThreshold"
                  initialValue={restaurant.freeDeliveryThreshold}
                  placeholder="Desativado"
                />
              </div>
            </div>
          </div>

          {/* ── Tempo estimado ── */}
          <div className="flex items-start gap-4 px-5 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <TimerIcon size={18} />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="estimatedDeliveryTime"
                className="text-sm font-semibold"
              >
                Tempo Estimado de Entrega
              </Label>
              <p className="text-xs text-muted-foreground">
                Texto exibido no app do cliente durante o checkout. Ex.:{" "}
                <span className="font-medium text-foreground">
                  40 a 60 min
                </span>
                .
              </p>
              <div className="mt-2 max-w-xs">
                <Input
                  id="estimatedDeliveryTime"
                  name="estimatedDeliveryTime"
                  placeholder="Ex.: 40 a 60 min"
                  defaultValue={restaurant.estimatedDeliveryTime ?? ""}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resumo visual */}
        {(restaurant.deliveryFee > 0 ||
          restaurant.minimumOrderValue > 0 ||
          restaurant.freeDeliveryThreshold != null ||
          restaurant.estimatedDeliveryTime) && (
          <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">
              Configuração atual:
            </p>
            <ul className="list-inside list-disc space-y-0.5">
              {restaurant.deliveryFee > 0 && (
                <li>
                  Taxa de entrega:{" "}
                  <strong>
                    R${" "}
                    {restaurant.deliveryFee.toFixed(2).replace(".", ",")}
                  </strong>
                </li>
              )}
              {restaurant.minimumOrderValue > 0 && (
                <li>
                  Pedido mínimo:{" "}
                  <strong>
                    R${" "}
                    {restaurant.minimumOrderValue
                      .toFixed(2)
                      .replace(".", ",")}
                  </strong>
                </li>
              )}
              {restaurant.freeDeliveryThreshold != null && (
                <li>
                  Frete grátis acima de:{" "}
                  <strong>
                    R${" "}
                    {restaurant.freeDeliveryThreshold
                      .toFixed(2)
                      .replace(".", ",")}
                  </strong>
                </li>
              )}
              {restaurant.estimatedDeliveryTime && (
                <li>
                  Tempo estimado:{" "}
                  <strong>{restaurant.estimatedDeliveryTime}</strong>
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar parâmetros"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2Icon size={14} />
              Salvo com sucesso!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
