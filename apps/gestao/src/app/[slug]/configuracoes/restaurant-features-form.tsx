"use client";

import { BotIcon, HelpCircleIcon, ShoppingBagIcon, ToggleRightIcon, TruckIcon, UtensilsCrossedIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateRestaurantFeaturesAction } from "@/app/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface RestaurantFeaturesFormProps {
  slug: string;
  initialValues: {
    acceptMercadoPago: boolean;
    isCouponsEnabled: boolean;
    isCashbackEnabled: boolean;
    showOptionImages: boolean;
    isDeliveryEnabled: boolean;
    isTakeawayEnabled: boolean;
    isDineInEnabled: boolean;
    isBotActive: boolean;
  };
}

const AI_SETUP_STEPS = [
  "Acesse o menu lateral e clique na opção \"IA Bot\".",
  "Insira a sua chave de API da OpenAI (OpenAI API Key).",
  "Preencha as credenciais da API do WhatsApp (Evolution API).",
  "Defina as instruções de comportamento do bot (Prompt de Sistema).",
  "Conecte o seu WhatsApp lendo o QR Code disponível no painel da IA.",
  "Ative a funcionalidade para iniciar os atendimentos automáticos.",
];

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
  const [isDeliveryEnabled, setIsDeliveryEnabled] = useState(
    initialValues.isDeliveryEnabled,
  );
  const [isTakeawayEnabled, setIsTakeawayEnabled] = useState(
    initialValues.isTakeawayEnabled,
  );
  const [isDineInEnabled, setIsDineInEnabled] = useState(
    initialValues.isDineInEnabled,
  );
  const [isBotActive, setIsBotActive] = useState(initialValues.isBotActive);
  const [isPending, startTransition] = useTransition();

  const handleConsumptionToggle = (
    field: "delivery" | "takeaway" | "dineIn",
    newValue: boolean,
  ) => {
    const next = {
      delivery: field === "delivery" ? newValue : isDeliveryEnabled,
      takeaway: field === "takeaway" ? newValue : isTakeawayEnabled,
      dineIn: field === "dineIn" ? newValue : isDineInEnabled,
    };
    if (!next.delivery && !next.takeaway && !next.dineIn) {
      toast.error("O estabelecimento deve manter pelo menos um método de consumo ativo.");
      return;
    }
    if (field === "delivery") setIsDeliveryEnabled(newValue);
    if (field === "takeaway") setIsTakeawayEnabled(newValue);
    if (field === "dineIn") setIsDineInEnabled(newValue);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    if (acceptMercadoPago) formData.append("acceptMercadoPago", "on");
    if (isCouponsEnabled) formData.append("isCouponsEnabled", "on");
    if (isCashbackEnabled) formData.append("isCashbackEnabled", "on");
    if (showOptionImages) formData.append("showOptionImages", "on");
    if (isDeliveryEnabled) formData.append("isDeliveryEnabled", "on");
    if (isTakeawayEnabled) formData.append("isTakeawayEnabled", "on");
    if (isDineInEnabled) formData.append("isDineInEnabled", "on");
    if (isBotActive) formData.append("isBotActive", "on");

    startTransition(async () => {
      try {
        await updateRestaurantFeaturesAction(slug, formData);
        toast.success("Módulos atualizados com sucesso!");
      } catch {
        toast.error("Erro ao salvar as configurações.");
      }
    });
  };

  const paymentFeatures = [
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

  const consumptionMethods = [
    {
      id: "isDeliveryEnabled",
      label: "Delivery",
      description: "Permite que clientes façam pedidos para entrega em domicílio.",
      icon: TruckIcon,
      checked: isDeliveryEnabled,
      onChange: (v: boolean) => handleConsumptionToggle("delivery", v),
    },
    {
      id: "isTakeawayEnabled",
      label: "Retirada no Balcão",
      description: "Permite que clientes retirem o pedido no estabelecimento.",
      icon: ShoppingBagIcon,
      checked: isTakeawayEnabled,
      onChange: (v: boolean) => handleConsumptionToggle("takeaway", v),
    },
    {
      id: "isDineInEnabled",
      label: "Consumo no Local (Mesa)",
      description: "Permite que clientes façam pedidos para consumir no local.",
      icon: UtensilsCrossedIcon,
      checked: isDineInEnabled,
      onChange: (v: boolean) => handleConsumptionToggle("dineIn", v),
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Métodos de Consumo
            </p>
            <div className="space-y-3">
              {consumptionMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-start justify-between gap-3 rounded-xl border bg-white p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <method.icon size={16} className="mt-0.5 shrink-0 text-slate-500" />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor={method.id}
                        className="cursor-pointer font-semibold text-slate-950"
                      >
                        {method.label}
                      </Label>
                      <p className="text-sm text-slate-500">{method.description}</p>
                    </div>
                  </div>
                  <Switch
                    id={method.id}
                    checked={method.checked}
                    onCheckedChange={method.onChange}
                    disabled={isPending}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Funcionalidades
            </p>
            <div className="space-y-3">
              {paymentFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-start justify-between gap-3 rounded-xl border bg-white p-3"
                >
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={feature.id}
                      className="cursor-pointer font-semibold text-slate-950"
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

              <div className="flex items-start justify-between gap-3 rounded-xl border bg-white p-3">
                <div className="flex items-start gap-2.5">
                  <BotIcon size={16} className="mt-0.5 shrink-0 text-slate-500" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Label
                        htmlFor="isBotActive"
                        className="cursor-pointer font-semibold text-slate-950"
                      >
                        Atendente de IA (WhatsApp)
                      </Label>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full p-0.5 text-slate-400 transition hover:text-slate-600"
                            aria-label="Saiba mais sobre o Atendente de IA"
                          >
                            <HelpCircleIcon size={14} />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <BotIcon size={18} />
                              Atendente de IA no WhatsApp
                            </DialogTitle>
                            <DialogDescription className="text-left">
                              Um assistente de inteligência artificial inteligente que atende os
                              clientes de forma autônoma pelo WhatsApp, respondendo perguntas do
                              cardápio e auxiliando na montagem e finalização de pedidos.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 pt-1">
                            <p className="text-sm font-semibold text-slate-700">
                              Como configurar
                            </p>
                            <ol className="space-y-2">
                              {AI_SETUP_STEPS.map((step, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                    {i + 1}
                                  </span>
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-sm text-slate-500">
                      Ativa o assistente virtual de IA para atendimento automático no WhatsApp.
                    </p>
                  </div>
                </div>
                <Switch
                  id="isBotActive"
                  checked={isBotActive}
                  onCheckedChange={setIsBotActive}
                  disabled={isPending}
                />
              </div>
            </div>
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
