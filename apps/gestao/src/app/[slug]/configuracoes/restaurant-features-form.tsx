"use client";

import { ToggleRightIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateRestaurantFeaturesAction } from "@/app/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface RestaurantFeaturesFormProps {
  slug: string;
  initialValues: {
    acceptMercadoPago: boolean;
    isCouponsEnabled: boolean;
    isCashbackEnabled: boolean;
    showOptionImages: boolean;
  };
}

export const RestaurantFeaturesForm = ({
  slug,
  initialValues,
}: RestaurantFeaturesFormProps) => {
  const [acceptMercadoPago, setAcceptMercadoPago] = useState(
    initialValues.acceptMercadoPago,
  );
  const [isCouponsEnabled, setIsCouponsEnabled] = useState(
    initialValues.isCouponsEnabled,
  );
  const [isCashbackEnabled, setIsCashbackEnabled] = useState(
    initialValues.isCashbackEnabled,
  );
  const [showOptionImages, setShowOptionImages] = useState(
    initialValues.showOptionImages,
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    if (acceptMercadoPago) formData.append("acceptMercadoPago", "on");
    if (isCouponsEnabled) formData.append("isCouponsEnabled", "on");
    if (isCashbackEnabled) formData.append("isCashbackEnabled", "on");
    if (showOptionImages) formData.append("showOptionImages", "on");

    startTransition(async () => {
      try {
        await updateRestaurantFeaturesAction(slug, formData);
        toast.success("Módulos atualizados com sucesso!");
      } catch {
        toast.error("Erro ao salvar as configurações.");
      }
    });
  };

  const features = [
    {
      id: "acceptMercadoPago",
      label: "Mercado Pago (Online)",
      description:
        "Permite que clientes paguem online via Mercado Pago no checkout.",
      checked: acceptMercadoPago,
      onChange: setAcceptMercadoPago,
    },
    {
      id: "isCouponsEnabled",
      label: "Cupons de Desconto",
      description: "Exibe o campo de cupom no checkout e permite sua aplicação.",
      checked: isCouponsEnabled,
      onChange: setIsCouponsEnabled,
    },
    {
      id: "isCashbackEnabled",
      label: "Cashback",
      description:
        "Exibe benefícios de cashback nos produtos e permite uso do saldo.",
      checked: isCashbackEnabled,
      onChange: setIsCashbackEnabled,
    },
    {
      id: "showOptionImages",
      label: "Imagens nos adicionais",
      description:
        "Exibe miniaturas de imagens ao lado de cada adicional no app do cliente.",
      checked: showOptionImages,
      onChange: setShowOptionImages,
    },
  ];

  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleRightIcon size={16} />
          Módulos do Restaurante
        </CardTitle>
        <CardDescription>
          Ative ou desative funcionalidades para seus clientes em tempo real.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="flex items-start justify-between gap-3 rounded-xl border bg-white p-3"
              >
                <div className="space-y-0.5">
                  <Label
                    htmlFor={feature.id}
                    className="font-semibold text-slate-950 cursor-pointer"
                  >
                    {feature.label}
                  </Label>
                  <p className="text-sm text-slate-500">{feature.description}</p>
                </div>
                <Switch
                  id={feature.id}
                  checked={feature.checked}
                  onCheckedChange={feature.onChange}
                  disabled={isPending}
                />
              </div>
            ))}
          </div>

          <Button
            type="submit"
            className="w-full rounded-full"
            disabled={isPending}
          >
            {isPending ? "Salvando..." : "Salvar Módulos"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
