"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2Icon,
  Loader2Icon,
  TicketPercentIcon,
  TrendingUpIcon,
  WalletCardsIcon,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency } from "@/helpers/format-currency";
import type {
  ConsumptionMethod,
  PaymentMethod,
  PedidoBeneficiosValidado,
} from "@/lib/db";

import { createOrder } from "../actions/create-order";
import { criarPreferenciaMercadoPago } from "../actions/criar-preferencia-mercado-pago";
import { getAvailableSchedulingSlots } from "../actions/get-scheduling-slots";
import { saveAbandonedCart } from "../actions/save-abandoned-cart";
import { validateOrderBenefits } from "../actions/validate-order-benefits";
import { CartContext } from "../contexts/cart";
import { isValidPhoneNumber, normalizePhoneNumber } from "../helpers/phone";

const formSchema = z
  .object({
    name: z.string().trim().min(1, {
      message: "O nome e obrigatorio.",
    }),
    phone: z
      .string()
      .trim()
      .min(1, {
        message: "O celular e obrigatorio.",
      })
      .refine((value) => isValidPhoneNumber(value), {
        message: "Celular invalido.",
      }),
    couponCode: z
      .string()
      .trim()
      .max(40, {
        message: "O cupom deve ter no maximo 40 caracteres.",
      })
      .optional(),
    fulfillmentTiming: z.enum(["ASAP", "SCHEDULED"]),
    scheduledFor: z.string().trim().optional(),
    paymentMethod: z.enum([
      "MERCADO_PAGO",
      "DINHEIRO",
      "CARTAO_PRESENCIAL",
    ]),
    changeFor: z.string().trim().optional(),
  })
  .superRefine((values, context) => {
    if (values.paymentMethod === "DINHEIRO" && values.changeFor) {
      const parsedValue = Number(values.changeFor.replace(",", "."));

      if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["changeFor"],
          message: "Informe um valor de troco valido.",
        });
      }
    }

    if (values.fulfillmentTiming !== "SCHEDULED") {
      return;
    }

    if (!values.scheduledFor) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledFor"],
        message: "Selecione a data e hora do agendamento.",
      });
      return;
    }

    const scheduledFor = new Date(values.scheduledFor);

    if (Number.isNaN(scheduledFor.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledFor"],
        message: "Data e hora de agendamento invalidas.",
      });
      return;
    }

    if (scheduledFor.getTime() < Date.now() + 15 * 60 * 1000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledFor"],
        message: "Agende com pelo menos 15 minutos de antecedencia.",
      });
    }
  });

type FormSchema = z.infer<typeof formSchema>;

interface FinishOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PedidoOfflineConcluido {
  phone: string;
  total: number;
  scheduledFor?: string;
  paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">;
  changeFor?: number;
}

interface SchedulingSlotGroup {
  label: string;
  date: string;
  items: Array<{
    value: string;
    label: string;
  }>;
}

const formatScheduledDate = (value: string) => {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getSchedulingLabel = (consumptionMethod: ConsumptionMethod) => {
  return consumptionMethod === "DELIVERY" ? "entrega" : "retirada";
};

const createAbandonedCartSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `abandoned-cart-${Date.now().toString()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

const paymentOptions: Array<{
  value: PaymentMethod;
  titulo: string;
  descricao: string;
}> = [
  {
    value: "MERCADO_PAGO",
    titulo: "Mercado Pago",
    descricao: "Pagamento online com redirecionamento imediato.",
  },
  {
    value: "DINHEIRO",
    titulo: "Dinheiro",
    descricao: "Pagamento no balcao ou na entrega, com troco opcional.",
  },
  {
    value: "CARTAO_PRESENCIAL",
    titulo: "Maquininha no balcao/entrega",
    descricao: "Pagamento presencial com cartao ao receber o pedido.",
  },
];

const FinishOrderDialog = ({ open, onOpenChange }: FinishOrderDialogProps) => {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { products, total, clearCart } = useContext(CartContext);
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingBenefits, setIsValidatingBenefits] = useState(false);
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [benefits, setBenefits] = useState<PedidoBeneficiosValidado | null>(null);
  const [pedidoOfflineConcluido, setPedidoOfflineConcluido] =
    useState<PedidoOfflineConcluido | null>(null);
  const [schedulingSlots, setSchedulingSlots] = useState<SchedulingSlotGroup[]>([]);
  const abandonedCartSessionIdRef = useRef(createAbandonedCartSessionId());

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      couponCode: "",
      fulfillmentTiming: "ASAP",
      scheduledFor: "",
      paymentMethod: "MERCADO_PAGO",
      changeFor: "",
    },
  });

  const paymentMethod = form.watch("paymentMethod");
  const watchedName = form.watch("name");
  const watchedPhone = form.watch("phone");
  const watchedCouponCode = form.watch("couponCode");
  const fulfillmentTiming = form.watch("fulfillmentTiming");
  const watchedScheduledFor = form.watch("scheduledFor");
  const needsChangeField = paymentMethod === "DINHEIRO";

  const consumptionMethod: ConsumptionMethod =
    searchParams.get("consumptionMethod") === "DINE_IN"
      ? "DINE_IN"
      : searchParams.get("consumptionMethod") === "DELIVERY"
        ? "DELIVERY"
        : "TAKEAWAY";
  const allowsScheduling = consumptionMethod !== "DINE_IN";
  const schedulingLabel = getSchedulingLabel(consumptionMethod);

  const checkoutSummary = benefits ?? {
    subtotal: total,
    deliveryFee: 0,
    discountAmount: 0,
    couponDiscountAmount: 0,
    cashbackRedeemedAmount: 0,
    total,
    cashbackEarnedAmount: 0,
    appliedCoupon: null,
    wallet: null,
  };

  useEffect(() => {
    const fetchSlots = async () => {
      if (fulfillmentTiming === "SCHEDULED" && schedulingSlots.length === 0) {
        const slots = await getAvailableSchedulingSlots(slug);
        setSchedulingSlots(slots);
        
        if (slots.length > 0 && slots[0].items.length > 0 && !form.getValues("scheduledFor")) {
          form.setValue("scheduledFor", slots[0].items[0].value);
        }
      }
    };

    void fetchSlots();
  }, [fulfillmentTiming, slug, schedulingSlots.length, form]);

  useEffect(() => {
    setBenefits(null);
    setUseWalletBalance(false);
  }, [products, watchedPhone, watchedCouponCode]);

  useEffect(() => {
    if (!open || products.length === 0) {
      return;
    }

    const hasCustomerData =
      (watchedName?.trim()?.length ?? 0) > 0 ||
      (watchedPhone?.replace(/\D/g, "").length ?? 0) > 0;

    if (!hasCustomerData) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveAbandonedCart({
        sessionId: abandonedCartSessionIdRef.current,
        slug,
        customerName: watchedName,
        customerPhone: watchedPhone,
        consumptionMethod,
        paymentMethod,
        couponCode: watchedCouponCode,
        useWalletBalance,
        scheduledFor:
          fulfillmentTiming === "SCHEDULED" && watchedScheduledFor
            ? new Date(watchedScheduledFor).toISOString()
            : undefined,
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          quantity: product.quantity,
          price: product.price,
          notes: product.notes,
        })),
      }).catch((error: unknown) => {
        console.error("Falha ao salvar carrinho abandonado.", error);
      });
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    consumptionMethod,
    fulfillmentTiming,
    open,
    paymentMethod,
    products,
    slug,
    useWalletBalance,
    watchedCouponCode,
    watchedName,
    watchedPhone,
    watchedScheduledFor,
  ]);

  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPedidoOfflineConcluido(null);
      setBenefits(null);
      setUseWalletBalance(false);
      form.reset();
    }

    onOpenChange(nextOpen);
  };

  const handleViewOrders = () => {
    if (!pedidoOfflineConcluido) {
      return;
    }

    handleSheetOpenChange(false);
    router.push(
      `/${slug}/orders?phone=${normalizePhoneNumber(pedidoOfflineConcluido.phone)}`,
    );
  };

  const handleValidateBenefits = async (nextUseWalletBalance = useWalletBalance) => {
    if (!isValidPhoneNumber(watchedPhone)) {
      form.setError("phone", {
        message: "Informe um celular valido para consultar beneficios.",
      });
      return;
    }

    try {
      setIsValidatingBenefits(true);

      const validatedBenefits = await validateOrderBenefits({
        customerPhone: watchedPhone,
        slug,
        couponCode: watchedCouponCode,
        useWalletBalance: nextUseWalletBalance,
        products: products.map((product) => ({
          id: product.id,
          quantity: product.quantity,
          selectedOptions: product.selectedOptions?.map((opt) => opt.id),
          notes: product.notes,
        })),
      });

      setUseWalletBalance(nextUseWalletBalance);
      setBenefits(validatedBenefits);
    } catch (error) {
      setBenefits(null);
      if (nextUseWalletBalance !== useWalletBalance) {
        setUseWalletBalance(false);
      }

      toast.error("Nao foi possivel validar cupom e cashback.", {
        description:
          error instanceof Error
            ? error.message
            : "Revise os dados informados e tente novamente.",
      });
    } finally {
      setIsValidatingBenefits(false);
    }
  };

  const handleToggleWalletBalance = async () => {
    await handleValidateBenefits(!useWalletBalance);
  };

  const onSubmit = async (data: FormSchema) => {
    try {
      setIsLoading(true);
      toast.info("Processando seu pedido...", {
        description: "Aguarde um momento enquanto finalizamos tudo.",
      });

      const changeFor =
        data.paymentMethod === "DINHEIRO" && data.changeFor
          ? Number(data.changeFor.replace(",", "."))
          : undefined;

      const order = await createOrder({
        consumptionMethod,
        paymentMethod: data.paymentMethod,
        changeFor,
        customerPhone: data.phone,
        customerName: data.name,
        scheduledFor:
          allowsScheduling &&
          data.fulfillmentTiming === "SCHEDULED" &&
          data.scheduledFor
            ? new Date(data.scheduledFor).toISOString()
            : undefined,
        abandonedCartSessionId: abandonedCartSessionIdRef.current,
        couponCode: data.couponCode,
        useWalletBalance,
        products: products.map((product) => ({
          id: product.id,
          quantity: product.quantity,
          selectedOptions: product.selectedOptions?.map((opt) => opt.id),
          notes: product.notes,
        })),
        slug,
      });

      if (data.paymentMethod === "MERCADO_PAGO") {
        const orderSummary = products
          .map((product) => `${String(product.quantity)}x ${product.name}`)
          .join(", ")
          .slice(0, 240);

        const { initPoint } = await criarPreferenciaMercadoPago({
          orderId: order.id,
          orderTotal: order.total,
          orderSummary,
          slug,
          consumptionMethod,
          phone: data.phone,
        });

        abandonedCartSessionIdRef.current = createAbandonedCartSessionId();
        clearCart();
        window.location.assign(initPoint);
        return;
      }

      abandonedCartSessionIdRef.current = createAbandonedCartSessionId();
      clearCart();
      setPedidoOfflineConcluido({
        phone: data.phone,
        total: order.total,
        scheduledFor: order.scheduledFor
          ? new Date(order.scheduledFor).toISOString()
          : undefined,
        paymentMethod: data.paymentMethod,
        changeFor,
      });
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel finalizar o pedido.", {
        description:
          error instanceof Error
            ? error.message
            : "Revise os dados e tente novamente em instantes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="flex h-full flex-col gap-0 p-0 w-full sm:max-w-md md:max-w-lg lg:max-w-xl">
        {pedidoOfflineConcluido ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <SheetHeader className="pb-3">
                    <SheetTitle className="flex items-center gap-2 text-left text-lg">
                      <CheckCircle2Icon className="text-green-600" size={20} />
                      Pedido recebido
                    </SheetTitle>
                    <SheetDescription className="text-base">
                      Seu pedido ja foi salvo e a equipe do restaurante foi
                      avisada.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-3 py-4">
                    <div className="rounded-2xl border border-green-100 bg-green-50 p-3 text-sm text-green-900">
                      {pedidoOfflineConcluido.paymentMethod === "DINHEIRO"
                        ? "O pagamento sera feito em dinheiro no balcao ou na entrega."
                        : "O pagamento sera concluido na maquininha no balcao ou na entrega."}
                    </div>

                    <div className="rounded-2xl border bg-muted p-3 text-sm">
                      Total registrado:{" "}
                      <strong>
                        {formatCurrency(pedidoOfflineConcluido.total)}
                      </strong>
                    </div>

                    {pedidoOfflineConcluido.scheduledFor ? (
                      <div className="rounded-2xl border bg-muted p-3 text-sm">
                        Pedido agendado para{" "}
                        <strong>
                          {formatScheduledDate(
                            pedidoOfflineConcluido.scheduledFor,
                          )}
                        </strong>
                        .
                      </div>
                    ) : null}

                    {pedidoOfflineConcluido.changeFor ? (
                      <div className="rounded-2xl border bg-muted p-3 text-sm">
                        Troco solicitado para{" "}
                        <strong>
                          {formatCurrency(pedidoOfflineConcluido.changeFor)}
                        </strong>
                        .
                      </div>
                    ) : null}
                  </div>
                </div>
              </ScrollArea>
            </div>
            <div className="flex flex-col gap-2.5 p-4 border-t bg-background">
              <Button className="rounded-full h-10 text-base" onClick={handleViewOrders}>
                Ver meus pedidos
              </Button>
              <Button
                className="rounded-full h-10 text-sm"
                variant="outline"
                onClick={() => {
                  handleSheetOpenChange(false);
                  router.push(`/${slug}/menu?consumptionMethod=${consumptionMethod}`);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.error("Erro de validacao no checkout:", errors);
                toast.error("Por favor, verifique os campos do formulario.", {
                  description: "Alguns dados obrigatorios estao ausentes ou invalidos.",
                });
              })}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <SheetHeader className="pb-3">
                      <SheetTitle className="text-left text-lg">
                        Finalizar pedido
                      </SheetTitle>
                      <SheetDescription className="text-sm">
                        Informe seus dados, valide os beneficios e escolha como
                        prefere pagar.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-5 py-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-sm">Seu nome</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Digite seu nome..."
                                className="h-9 text-base rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-sm">Seu celular</FormLabel>
                            <FormControl>
                              <PatternFormat
                                placeholder="Digite seu celular..."
                                format="(##) #####-####"
                                customInput={Input}
                                className="h-9 text-base rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="couponCode"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-sm">Cupom de desconto</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex.: BEMVINDO10"
                                autoCapitalize="characters"
                                className="h-9 text-base rounded-xl uppercase"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {allowsScheduling ? (
                        <div className="rounded-[24px] border bg-slate-50/80 p-3.5">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">
                              Horario da {schedulingLabel}
                            </p>
                            <p className="text-xs text-muted-foreground leading-tight">
                              Escolha se deseja receber o pedido o quanto antes
                              ou em um horario agendado.
                            </p>
                          </div>

                          <FormField
                            control={form.control}
                            name="fulfillmentTiming"
                            render={({ field }) => (
                              <FormItem className="mt-3 space-y-2">
                                <FormControl>
                                  <div className="grid gap-2.5">
                                    {[
                                      {
                                        value: "ASAP" as const,
                                        title: "O quanto antes",
                                        description:
                                          consumptionMethod === "DELIVERY"
                                            ? "Preparo e despacho imediato."
                                            : "Preparo imediato para retirada.",
                                      },
                                      {
                                        value: "SCHEDULED" as const,
                                        title: "Agendar horario",
                                        description:
                                          consumptionMethod === "DELIVERY"
                                            ? "Defina a data e hora desejadas."
                                            : "Defina a data e hora desejadas.",
                                      },
                                    ].map((option) => (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() =>
                                          field.onChange(option.value)
                                        }
                                        className={`rounded-xl border px-3 py-2 text-left transition ${
                                          field.value === option.value
                                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                            : "border-border bg-background"
                                        }`}
                                      >
                                        <p className="text-sm font-bold">
                                          {option.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {option.description}
                                        </p>
                                      </button>
                                    ))}
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />

                          {fulfillmentTiming === "SCHEDULED" ? (
                            <FormField
                              control={form.control}
                              name="scheduledFor"
                              render={({ field }) => (
                                <FormItem className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
                                  <FormLabel className="text-xs font-bold uppercase text-slate-400">Data e hora</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-9 rounded-xl text-sm">
                                        <SelectValue placeholder="Escolha um horário..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-xl">
                                      {schedulingSlots.length > 0 ? (
                                        schedulingSlots.map((group) => (
                                          <SelectGroup key={group.date}>
                                            <SelectLabel className="text-primary font-bold text-sm">{group.label}</SelectLabel>
                                            {group.items.map((slot) => (
                                              <SelectItem
                                                key={slot.value}
                                                value={slot.value}
                                                className="rounded-lg text-sm"
                                              >
                                                {slot.label}
                                              </SelectItem>
                                            ))}
                                          </SelectGroup>
                                        ))
                                      ) : (
                                        <div className="p-3 text-center text-sm text-muted-foreground">
                                          {isLoading ? "Carregando horários..." : "Nenhum horário disponível."}
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          ) : null}
                        </div>
                      ) : null}

                      <div className="rounded-[24px] border bg-slate-50/80 p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="flex items-center gap-1.5 text-sm font-semibold">
                              <TicketPercentIcon size={14} />
                              Cupons e cashback
                            </p>
                            <p className="text-xs text-muted-foreground leading-tight">
                              Validamos o cupom e o saldo pelo celular
                              informado.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full h-8 text-xs px-3"
                            disabled={
                              isValidatingBenefits || products.length === 0
                            }
                            onClick={() => handleValidateBenefits()}
                          >
                            {isValidatingBenefits ? (
                              <Loader2Icon className="animate-spin h-3.5 w-3.5 mr-1" />
                            ) : null}
                            Validar beneficios
                          </Button>
                        </div>

                        {benefits ? (
                          <div className="mt-3 space-y-2.5">
                            <div className="rounded-xl border bg-background p-3 text-sm">
                              {benefits.appliedCoupon ? (
                                <p className="font-medium text-slate-900">
                                  Cupom aplicado: {benefits.appliedCoupon.code}
                                </p>
                              ) : (
                                <p className="font-medium text-slate-900 text-xs">
                                  Nenhum cupom aplicado.
                                </p>
                              )}
                              <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
                                {benefits.appliedCoupon?.description ??
                                  "Voce pode seguir sem desconto promocional."}
                              </p>
                            </div>

                            <div className="rounded-xl border bg-background p-3 text-sm">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="flex items-center gap-1.5 font-medium text-slate-900 text-xs">
                                    <WalletCardsIcon size={14} />
                                    Saldo de cashback
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    Saldo: <strong>{formatCurrency(benefits.wallet?.currentBalance ?? 0)}</strong>
                                  </p>
                                </div>

                                {(benefits.wallet?.currentBalance ?? 0) > 0 ? (
                                  <Button
                                    type="button"
                                    variant={
                                      useWalletBalance ? "default" : "outline"
                                    }
                                    className="rounded-full h-7 text-xs px-3"
                                    disabled={isValidatingBenefits}
                                    onClick={handleToggleWalletBalance}
                                  >
                                    {useWalletBalance
                                      ? "Remover"
                                      : "Usar"}
                                  </Button>
                                ) : null}
                              </div>

                              {useWalletBalance &&
                              benefits.wallet?.availableToRedeem ? (
                                <p className="mt-2 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg inline-block">
                                  Resgate aplicado: <strong>{formatCurrency(benefits.wallet.availableToRedeem)}</strong>
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-muted-foreground italic">
                            O total final sera revalidado no momento da confirmacao.
                          </p>
                        )}
                      </div>

                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm">Forma de pagamento</FormLabel>
                            <FormControl>
                              <div className="grid gap-2.5">
                                {paymentOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => field.onChange(option.value)}
                                    className={`rounded-xl border px-3 py-2.5 text-left transition ${
                                      field.value === option.value
                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                        : "border-border bg-background"
                                    }`}
                                  >
                                    <p className="text-sm font-bold">
                                      {option.titulo}
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-tight">
                                      {option.descricao}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {needsChangeField ? (
                        <FormField
                          control={form.control}
                          name="changeFor"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-sm">
                                Troco para quanto?
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex.: 50,00"
                                  inputMode="decimal"
                                  className="h-9 text-base rounded-xl"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      ) : null}

                      <div className="rounded-[24px] border bg-muted/50 p-3.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Subtotal</span>
                          <span className="font-semibold">
                            {formatCurrency(checkoutSummary.subtotal)}
                          </span>
                        </div>

                        {checkoutSummary.couponDiscountAmount > 0 ? (
                          <div className="mt-1.5 flex items-center justify-between text-emerald-700">
                            <span>Desconto cupom</span>
                            <strong>
                              -{formatCurrency(checkoutSummary.couponDiscountAmount)}
                            </strong>
                          </div>
                        ) : null}

                        {checkoutSummary.cashbackRedeemedAmount > 0 ? (
                          <div className="mt-1.5 flex items-center justify-between text-emerald-700">
                            <span>Cashback resgatado</span>
                            <strong>
                              -{formatCurrency(checkoutSummary.cashbackRedeemedAmount)}
                            </strong>
                          </div>
                        ) : null}

                        <div className="mt-2.5 flex items-center justify-between border-t pt-2.5">
                          <span className="font-bold text-slate-800">Total Final</span>
                          <span className="text-xl font-extrabold text-primary">
                            {formatCurrency(checkoutSummary.total)}
                          </span>
                        </div>

                        {checkoutSummary.cashbackEarnedAmount > 0 ? (
                          <p className="mt-2.5 text-xs text-muted-foreground italic leading-tight">
                            Este pedido gera{" "}
                            <strong>
                              {formatCurrency(
                                checkoutSummary.cashbackEarnedAmount,
                              )}
                            </strong>{" "}
                            em cashback para a proxima compra.
                          </p>
                        ) : null}

                        {checkoutSummary.nextLoyaltyRule && (
                          <div className="mt-3 flex flex-col gap-1 rounded-xl bg-blue-50 px-3 py-2 border border-blue-100 animate-pulse">
                            <div className="flex items-center gap-1.5">
                              <TrendingUpIcon size={14} className="text-blue-600" />
                              <p className="text-xs font-bold text-blue-700">
                                Dica: Peça mais {formatCurrency(checkoutSummary.nextLoyaltyRule.remainingAmount)}!
                              </p>
                            </div>
                            <p className="text-xs text-blue-600 leading-tight">
                              Ganhe <strong>{checkoutSummary.nextLoyaltyRule.cashbackPercent}%</strong> de cashback em vez de {((checkoutSummary.cashbackEarnedAmount / checkoutSummary.total) * 100).toFixed(0)}%!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              <div className="flex flex-col gap-2.5 p-4 border-t bg-background">
                <Button
                  type="submit"
                  variant="destructive"
                  className="rounded-full h-11 text-base font-bold shadow-lg shadow-destructive/20"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2Icon className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  {paymentMethod === "MERCADO_PAGO"
                    ? "Ir para pagamento"
                    : "Confirmar pedido"}
                </Button>
                <Button
                  className="w-full h-10 rounded-full text-slate-500 font-medium text-sm"
                  variant="outline"
                  type="button"
                  onClick={() => handleSheetOpenChange(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default FinishOrderDialog;
