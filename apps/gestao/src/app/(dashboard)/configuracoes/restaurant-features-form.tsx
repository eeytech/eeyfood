"use client";

import {
  CreditCardIcon,
  KeyRoundIcon,
  Loader2Icon,
  QrCodeIcon,
  SaveIcon,
  ToggleRightIcon,
  ZapIcon,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface RestaurantFeaturesFormProps {
  slug: string;
  initialValues: {
    acceptMercadoPago: boolean;
    onlinePaymentGateway?: "MERCADO_PAGO" | "INFINITEPAY" | "DISABLED";
    infinitePayHandle?: string | null;
    acceptPix?: boolean;
    pixKey?: string | null;
    pixMode?: "QRCODE" | "MANUAL";
    isCouponsEnabled: boolean;
    isCashbackEnabled: boolean;
    showOptionImages: boolean;
    isDeliveryEnabled: boolean;
    isTakeawayEnabled: boolean;
    isDineInEnabled: boolean;
    pizzaPricingRule?: "MAX" | "AVERAGE";
  };
}

export const RestaurantFeaturesForm = ({
  slug,
  initialValues,
}: RestaurantFeaturesFormProps) => {
  const [onlinePaymentGateway, setOnlinePaymentGateway] = useState<
    "MERCADO_PAGO" | "INFINITEPAY" | "DISABLED"
  >(
    initialValues.onlinePaymentGateway ??
      (initialValues.acceptMercadoPago ? "MERCADO_PAGO" : "DISABLED"),
  );
  const [infinitePayHandle, setInfinitePayHandle] = useState(
    initialValues.infinitePayHandle ?? "",
  );
  const [acceptPix, setAcceptPix] = useState(
    initialValues.acceptPix ?? true,
  );
  const [pixKey, setPixKey] = useState(initialValues.pixKey ?? "");
  const [pixMode, setPixMode] = useState<"QRCODE" | "MANUAL">(
    initialValues.pixMode ?? "QRCODE",
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
    formData.append("onlinePaymentGateway", onlinePaymentGateway);
    if (onlinePaymentGateway !== "DISABLED") {
      formData.append("acceptMercadoPago", "on");
    }
    if (onlinePaymentGateway === "INFINITEPAY" && infinitePayHandle.trim()) {
      formData.append("infinitePayHandle", infinitePayHandle.trim());
    }
    if (acceptPix) {
      formData.append("acceptPix", "on");
      formData.append("pixMode", pixMode);
    }
    if (pixKey.trim()) formData.append("pixKey", pixKey.trim());
    if (showOptionImages) formData.append("showOptionImages", "on");
    if (isDeliveryEnabled) formData.append("isDeliveryEnabled", "on");
    if (isTakeawayEnabled) formData.append("isTakeawayEnabled", "on");
    if (isDineInEnabled) formData.append("isDineInEnabled", "on");
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

  const consumptionMethods = [
    {
      id: "isDeliveryEnabled",
      label: "Delivery (Entrega em Domicílio)",
      description:
        "Permite que clientes façam pedidos com rota e entrega de motoboy.",
      checked: isDeliveryEnabled,
      onChange: (v: boolean) => handleConsumptionToggle("delivery", v),
    },
    {
      id: "isTakeawayEnabled",
      label: "Retirada no Balcão (Takeaway)",
      description:
        "Permite que clientes retirem seus pedidos diretamente no balcão da loja.",
      checked: isTakeawayEnabled,
      onChange: (v: boolean) => handleConsumptionToggle("takeaway", v),
    },
    {
      id: "isDineInEnabled",
      label: "Consumo no Local (Mesa / Salão)",
      description:
        "Permite que clientes façam pedidos para consumir nas mesas do restaurante.",
      checked: isDineInEnabled,
      onChange: (v: boolean) => handleConsumptionToggle("dineIn", v),
    },
  ];

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
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
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
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
                      ? "border-primary/40 bg-primary/[0.03] shadow-xs"
                      : "border-slate-200/80 bg-white opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor={method.id}
                      className="cursor-pointer font-semibold text-slate-950 block text-sm"
                    >
                      {method.label}
                    </Label>
                    <Switch
                      id={method.id}
                      checked={method.checked}
                      onCheckedChange={method.onChange}
                      disabled={isPending}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {method.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Regra de Cobrança de Pizzas Meio a Meio */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
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
                    ? "border-primary bg-primary/[0.04] ring-1 ring-primary shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="pizzaPricingRuleRadio"
                  value="MAX"
                  checked={pizzaPricingRule === "MAX"}
                  onChange={() => setPizzaPricingRule("MAX")}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-950 text-sm">
                      Maior Valor
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
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
                    ? "border-primary bg-primary/[0.04] ring-1 ring-primary shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="pizzaPricingRuleRadio"
                  value="AVERAGE"
                  checked={pizzaPricingRule === "AVERAGE"}
                  onChange={() => setPizzaPricingRule("AVERAGE")}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-950 text-sm">
                      Média Aritmética
                    </span>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
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
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Experiência de Compra e Pagamentos
              </p>
            </div>
            <div className="space-y-2.5">
              {/* Pagamento Online (Multi-Gateway) */}
              <div
                className={`rounded-xl border transition-all p-3.5 shadow-2xs space-y-3 ${
                  onlinePaymentGateway !== "DISABLED"
                    ? "border-blue-200/80 bg-blue-50/[0.25]"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="font-semibold text-slate-950 text-sm flex items-center gap-1.5">
                        <CreditCardIcon size={16} className="text-blue-600" />
                        Pagamento Online no Cardápio
                      </Label>
                      {onlinePaymentGateway !== "DISABLED" && (
                        <span className="rounded-full border border-blue-200 bg-blue-100/80 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                          {onlinePaymentGateway === "INFINITEPAY" ? "InfinitePay Ativa" : "Mercado Pago Ativo"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Permite que seus clientes paguem antecipadamente via cartão de crédito ou Pix diretamente pelo cardápio.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-2.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Selecione o Gateway de Pagamento Online:
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setOnlinePaymentGateway("MERCADO_PAGO")}
                      disabled={isPending}
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
                        onlinePaymentGateway === "MERCADO_PAGO"
                          ? "border-blue-500 bg-blue-50/80 ring-1 ring-blue-500/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Mercado Pago</span>
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-semibold text-blue-700">
                          Padrão
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Checkout Pro com cartão e Pix via conta central.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOnlinePaymentGateway("INFINITEPAY")}
                      disabled={isPending}
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
                        onlinePaymentGateway === "INFINITEPAY"
                          ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          <ZapIcon size={13} className="text-emerald-600 fill-emerald-600" />
                          InfinitePay
                        </span>
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-800">
                          Menores Taxas
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Receba direto na sua conta InfinitePay com as menores taxas.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOnlinePaymentGateway("DISABLED")}
                      disabled={isPending}
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
                        onlinePaymentGateway === "DISABLED"
                          ? "border-slate-400 bg-slate-100/80 ring-1 ring-slate-400/20"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-800">Desativado</span>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Apenas pagamentos presenciais ou Pix direto.
                      </p>
                    </button>
                  </div>

                  {onlinePaymentGateway === "INFINITEPAY" && (
                    <div className="pt-2 border-t border-emerald-200/60 space-y-1.5 animate-in fade-in slide-in-from-top-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="sm:w-1/3">
                          <Label
                            htmlFor="infinitePayHandle"
                            className="text-xs font-semibold text-slate-700"
                          >
                            Sua InfiniteTag ($):
                          </Label>
                          <p className="text-[11px] text-slate-400 leading-tight">
                            Nome de usuário no app InfinitePay (sem o $)
                          </p>
                        </div>
                        <div className="sm:w-2/3">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">
                              $
                            </span>
                            <Input
                              id="infinitePayHandle"
                              name="infinitePayHandle"
                              value={infinitePayHandle}
                              onChange={(e) => setInfinitePayHandle(e.target.value.replace(/^[$@]/, ""))}
                              placeholder="ex: suapizzaria"
                              className="h-9 text-xs bg-white pl-7 font-mono"
                              disabled={isPending}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        As vendas pagas online serão creditadas instantaneamente na conta <strong>${infinitePayHandle.trim() || "suatag"}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pagamento via Pix */}
              <div
                className={`rounded-xl border transition-all p-3.5 shadow-2xs space-y-3 ${
                  acceptPix
                    ? "border-primary/40 bg-primary/[0.03]"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor="acceptPix"
                        className="cursor-pointer font-semibold text-slate-950 text-sm flex items-center gap-1.5"
                      >
                        Pagamento via Pix
                      </Label>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Transferência Direta
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Permite que clientes selecionem Pix no checkout do cardápio de vendas e no balcão.
                    </p>
                  </div>
                  <Switch
                    id="acceptPix"
                    checked={acceptPix}
                    onCheckedChange={setAcceptPix}
                    disabled={isPending}
                  />
                </div>

                {acceptPix && (
                  <div className="pt-3 border-t border-primary/10 space-y-3.5 animate-in fade-in slide-in-from-top-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="sm:w-1/3">
                        <Label
                          htmlFor="pixKey"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Chave Pix do Restaurante:
                        </Label>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Chave cadastrada no seu banco (CNPJ, celular, e-mail ou aleatória)
                        </p>
                      </div>
                      <div className="sm:w-2/3">
                        <Input
                          id="pixKey"
                          name="pixKey"
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                          placeholder="CNPJ, Celular, E-mail ou Chave Aleatória"
                          className="h-9 text-xs bg-white"
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Como o Pix será exibido para o cliente no Cardápio:
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setPixMode("QRCODE")}
                          disabled={isPending}
                          className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                            pixMode === "QRCODE"
                              ? "border-teal-500 bg-teal-50/70 ring-1 ring-teal-500/20"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              pixMode === "QRCODE"
                                ? "bg-teal-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <QrCodeIcon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">
                                QR Code + Copia e Cola
                              </span>
                              <span className="rounded-full bg-teal-100 px-1.5 py-0.2 text-[9px] font-semibold text-teal-800">
                                Recomendado
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-500 leading-tight">
                              Gera o QR Code com o valor exato do pedido. O cliente escaneia ou copia sem precisar digitar valor.
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPixMode("MANUAL")}
                          disabled={isPending}
                          className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                            pixMode === "MANUAL"
                              ? "border-teal-500 bg-teal-50/70 ring-1 ring-teal-500/20"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              pixMode === "MANUAL"
                                ? "bg-teal-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <KeyRoundIcon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 block">
                              Apenas Chave Pix (Manual)
                            </span>
                            <p className="mt-0.5 text-[11px] text-slate-500 leading-tight">
                              Mostra somente o texto da chave para o cliente copiar e digitar o valor manualmente no app do banco.
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Imagens nos adicionais */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition hover:border-slate-300">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="showOptionImages"
                    className="cursor-pointer font-semibold text-slate-950 text-sm"
                  >
                    Imagens nos adicionais
                  </Label>
                  <p className="text-xs text-slate-500">
                    Exibe miniaturas de fotos ao lado de cada adicional no app do cliente.
                  </p>
                </div>
                <Switch
                  id="showOptionImages"
                  checked={showOptionImages}
                  onCheckedChange={setShowOptionImages}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Recursos e canais são ativados ou desativados em tempo real no app.
            </p>
            <Button
              type="submit"
              className="h-10 gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition w-full sm:w-auto"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2Icon size={15} className="animate-spin" />
                  <span>Salvando alterações...</span>
                </>
              ) : (
                <>
                  <SaveIcon size={15} />
                  <span>Salvar Configurações de Módulos</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
