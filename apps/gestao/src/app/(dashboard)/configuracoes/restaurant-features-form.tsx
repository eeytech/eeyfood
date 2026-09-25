"use client";

import {
  BotIcon,
  HelpCircleIcon,
  PizzaIcon,
  ShoppingBagIcon,
  ToggleRightIcon,
  TruckIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateRestaurantFeaturesAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    isOrderSchedulingEnabled: boolean;
    pizzaPricingRule?: "MAX" | "AVERAGE";
  };
}

const AI_SETUP_STEPS = [
  "Acesse o menu lateral em Configurar e clique em \"IA\".",
  "Insira a sua chave de API da OpenAI (OpenAI API Key).",
  "Defina as instruções de comportamento do bot (Prompt de Sistema).",
  "Acesse a opção \"WhatsApp\" em Configurar e conecte lendo o QR Code.",
  "Ative o atendimento automático com IA para iniciar.",
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
  const [isOrderSchedulingEnabled, setIsOrderSchedulingEnabled] = useState(
    initialValues.isOrderSchedulingEnabled,
  );
  const [pizzaPricingRule, setPizzaPricingRule] = useState<"MAX" | "AVERAGE">(
    initialValues.pizzaPricingRule ?? "MAX",
  );
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
      toast.error(
        "O estabelecimento deve manter pelo menos um método de consumo ativo.",
      );
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
    if (isOrderSchedulingEnabled)
      formData.append("isOrderSchedulingEnabled", "on");
    formData.append("pizzaPricingRule", pizzaPricingRule);

  startTransition(async () => {
    try {
      await updateRestaurantFeaturesAction(slug, formData);
      toast.success("Módulos e regras atualizados com sucesso!");
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
      label: "Cashback Fidelidade",
      description:
        "Exibe benefícios de cashback nos produtos e permite uso do saldo.",
      checked: isCashbackEnabled,
      onChange: setIsCashbackEnabled,
    },
    {
      id: "showOptionImages",
      label: "Imagens nos adicionais",
      description:
        "Exibe miniaturas de fotos ao lado de cada adicional no app do cliente.",
      checked: showOptionImages,
      onChange: setShowOptionImages,
    },
    {
      id: "isOrderSchedulingEnabled",
      label: "Agendamento de Pedidos",
      description:
        "Permite que clientes agendem data e hora para entrega ou retirada.",
      checked: isOrderSchedulingEnabled,
      onChange: setIsOrderSchedulingEnabled,
    },
  ];

  const consumptionMethods = [
    {
      id: "isDeliveryEnabled",
      label: "Delivery (Entrega em Domicílio)",
      description:
        "Permite que clientes façam pedidos com rota e entrega de motoboy.",
      icon: TruckIcon,
      checked: isDeliveryEnabled,
      onChange: (v: boolean) => handleConsumptionToggle("delivery", v),
    },
    {
      id: "isTakeawayEnabled",
      label: "Retirada no Balcão (Takeaway)",
      description:
        "Permite que clientes retirem seus pedidos diretamente no balcão da loja.",
      icon: ShoppingBagIcon,
      checked: isTakeawayEnabled,
      onChange: (v: boolean) => handleConsumptionToggle("takeaway", v),
    },
    {
      id: "isDineInEnabled",
      label: "Consumo no Local (Mesa / Salão)",
      description:
        "Permite que clientes façam pedidos para consumir nas mesas do restaurante.",
      icon: UtensilsCrossedIcon,
      checked: isDineInEnabled,
      onChange: (v: boolean) => handleConsumptionToggle("dineIn", v),
    },
  ];

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <ToggleRightIcon size={18} />
          </div>
          Módulos e Recursos do Estabelecimento
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Ative ou desative funcionalidades para seus clientes no App de Vendas e PDV em tempo real.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Métodos de Consumo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Canais de Atendimento e Consumo
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {consumptionMethods.map((method) => (
                <div
                  key={method.id}
                  className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-all ${
                    method.checked
                      ? "border-slate-300 bg-slate-50/70 shadow-xs"
                      : "border-slate-200/80 bg-white opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-2xs border border-slate-200/60">
                      <method.icon size={18} />
                    </div>
                    <Switch
                      id={method.id}
                      checked={method.checked}
                      onCheckedChange={method.onChange}
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor={method.id}
                      className="cursor-pointer font-semibold text-slate-950 block text-sm"
                    >
                      {method.label}
                    </Label>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {method.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regra de Cobrança de Pizzas Meio a Meio */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Regra de Cobrança para Pizzas de 2 Sabores
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Define a fórmula aplicada quando o cliente seleciona dois sabores no App de Vendas ou no PDV Frente de Caixa.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Opção Maior Valor */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                  pizzaPricingRule === "MAX"
                    ? "border-slate-900 bg-slate-50/80 ring-1 ring-slate-900 shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="pizzaPricingRuleRadio"
                  value="MAX"
                  checked={pizzaPricingRule === "MAX"}
                  onChange={() => setPizzaPricingRule("MAX")}
                  className="mt-1 h-4 w-4 accent-slate-950"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-950 text-sm">
                      Maior Valor
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      Padrão de Mercado
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Cobra o preço do sabor mais caro selecionado.
                  </p>
                  <p className="text-[11px] font-medium text-slate-600 bg-white/80 rounded-md p-1.5 border border-slate-200/60 mt-1">
                    Ex: Calabresa (R$ 40) + Camarão (R$ 55) = <strong>R$ 55,00</strong>
                  </p>
                </div>
              </label>

              {/* Opção Média Aritmética */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                  pizzaPricingRule === "AVERAGE"
                    ? "border-slate-900 bg-slate-50/80 ring-1 ring-slate-900 shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="pizzaPricingRuleRadio"
                  value="AVERAGE"
                  checked={pizzaPricingRule === "AVERAGE"}
                  onChange={() => setPizzaPricingRule("AVERAGE")}
                  className="mt-1 h-4 w-4 accent-slate-950"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-950 text-sm">
                      Média Aritmética
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      Proporcional
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Cobra a soma dos sabores dividida por dois (50% de cada).
                  </p>
                  <p className="text-[11px] font-medium text-slate-600 bg-white/80 rounded-md p-1.5 border border-slate-200/60 mt-1">
                    Ex: Calabresa (R$ 40) + Camarão (R$ 55) = <strong>R$ 47,50</strong>
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Funcionalidades Gerais */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Experiência de Compra e Pagamentos
              </p>
            </div>
            <div className="space-y-2.5">
              {paymentFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition hover:border-slate-300"
                >
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={feature.id}
                      className="cursor-pointer font-semibold text-slate-950 text-sm"
                    >
                      {feature.label}
                    </Label>
                    <p className="text-xs text-slate-500">{feature.description}</p>
                  </div>
                  <Switch
                    id={feature.id}
                    checked={feature.checked}
                    onCheckedChange={feature.onChange}
                    disabled={isPending}
                  />
                </div>
              ))}

              {/* Bot WhatsApp */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition hover:border-slate-300">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 mt-0.5">
                    <BotIcon size={18} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor="isBotActive"
                        className="cursor-pointer font-semibold text-slate-950 text-sm"
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
                        <DialogContent className="max-w-md border-slate-200 bg-white text-slate-900 shadow-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-display text-lg">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                <BotIcon size={18} />
                              </div>
                              Atendente de IA no WhatsApp
                            </DialogTitle>
                            <DialogDescription className="text-left text-xs text-slate-500">
                              Um assistente inteligente que atende seus clientes de forma autônoma pelo WhatsApp, respondendo dúvidas do cardápio e auxiliando na montagem dos pedidos.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 pt-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Etapas de Ativação
                            </p>
                            <ol className="space-y-2">
                              {AI_SETUP_STEPS.map((step, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2.5 text-xs text-slate-600 rounded-lg border border-slate-100 bg-slate-50/60 p-2"
                                >
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
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
                    <p className="text-xs text-slate-500">
                      Permite que a inteligência artificial responda e tire pedidos via WhatsApp.
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

          <div className="pt-2">
            <Button
              type="submit"
              className="h-10 w-full rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
              disabled={isPending}
            >
              {isPending ? "Salvando alterações..." : "Salvar Configurações de Módulos"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
