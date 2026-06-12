"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2Icon,
  CreditCardIcon,
  HandCoinsIcon,
  Loader2Icon,
  MapPinIcon,
  ShoppingBagIcon,
  TicketPercentIcon,
  TrendingUpIcon,
  UserIcon,
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
import { isRestaurantOpen } from "@/helpers/restaurant-status";
import type {
  ConsumptionMethod,
  PaymentMethod,
  PedidoBeneficiosValidado,
  RestaurantComCategoriasEProdutos,
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
      message: "O nome é obrigatório.",
    }),
    phone: z
      .string()
      .trim()
      .min(1, {
        message: "O celular é obrigatório.",
      })
      .refine((value) => isValidPhoneNumber(value), {
        message: "Celular inválido.",
      }),
    couponCode: z
      .string()
      .trim()
      .max(40, {
        message: "O cupom deve ter no máximo 40 caracteres.",
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
          message: "Informe um valor de troco válido.",
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
        message: "Data e hora de agendamento inválidas.",
      });
      return;
    }

    if (scheduledFor.getTime() < Date.now() + 15 * 60 * 1000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledFor"],
        message: "Agende com pelo menos 15 minutos de antecedência.",
      });
    }
  });

type FormSchema = z.infer<typeof formSchema>;

interface FinishOrderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: RestaurantComCategoriasEProdutos;
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
  icon: React.ReactNode;
}> = [
  {
    value: "MERCADO_PAGO",
    titulo: "Mercado Pago",
    descricao: "Pagamento online seguro e rápido.",
    icon: <CreditCardIcon size={20} className="text-blue-600" />,
  },
  {
    value: "DINHEIRO",
    titulo: "Dinheiro",
    descricao: "Pagamento presencial com troco opcional.",
    icon: <HandCoinsIcon size={20} className="text-emerald-600" />,
  },
  {
    value: "CARTAO_PRESENCIAL",
    titulo: "Cartão (Presencial)",
    descricao: "Maquininha no balcão ou entrega.",
    icon: <CreditCardIcon size={20} className="text-slate-600" />,
  },
];

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 border-b pb-2 mb-4">
    <div className="text-primary">{icon}</div>
    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h3>
  </div>
);

const FinishOrderSheet = ({
  open,
  onOpenChange,
  restaurant,
}: FinishOrderSheetProps) => {
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
  const isOpen = isRestaurantOpen(
    restaurant.status,
    restaurant.operatingHours,
  );

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
        
        // Se houver slots, selecionar o primeiro por padrão se nenhum estiver selecionado
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
        message: "Informe um celular válido para consultar benefícios.",
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

      toast.error("Não foi possível validar cupom e cashback.", {
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
      toast.error("Não foi possível finalizar o pedido.", {
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
      <SheetContent side="right" className="flex h-full flex-col gap-0 p-0 w-full sm:max-w-[450px]">
        {pedidoOfflineConcluido ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2 text-left">
                      <CheckCircle2Icon className="text-green-600" />
                      Pedido recebido
                    </SheetTitle>
                    <SheetDescription>
                      Seu pedido já foi salvo e a equipe do restaurante foi
                      avisada.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 py-5">
                    <div className="rounded-3xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">
                      {pedidoOfflineConcluido.paymentMethod === "DINHEIRO"
                        ? "O pagamento será feito em dinheiro no balcão ou na entrega."
                        : "O pagamento será concluído na maquininha no balcão ou na entrega."}
                    </div>

                    <div className="rounded-3xl border bg-muted p-4 text-sm">
                      Total registrado:{" "}
                      <strong>
                        {formatCurrency(pedidoOfflineConcluido.total)}
                      </strong>
                    </div>

                    {pedidoOfflineConcluido.scheduledFor ? (
                      <div className="rounded-3xl border bg-muted p-4 text-sm">
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
                      <div className="rounded-3xl border bg-muted p-4 text-sm">
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
            <div className="flex flex-col gap-3 p-6 border-t bg-background">
              <Button className="rounded-full" onClick={handleViewOrders}>
                Ver meus pedidos
              </Button>
              <Button
                className="rounded-full"
                variant="outline"
                onClick={() => handleSheetOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.error("Erro de validação no checkout:", errors);
                toast.error("Por favor, verifique os campos do formulário.", {
                  description: "Alguns dados obrigatórios estão ausentes ou inválidos.",
                });
              })}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <SheetHeader className="pb-4">
                      <SheetTitle className="text-left">
                        Finalizar pedido
                      </SheetTitle>
                      <SheetDescription>
                        Informe seus dados, valide os benefícios e escolha como
                        prefere pagar.
                      </SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-10 py-8">
                      {/* Identificação */}
                      <section>
                        <SectionHeader icon={<UserIcon size={18} />} title="Identificação" />
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Seu nome</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Digite seu nome..."
                                    className="rounded-2xl"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Seu celular</FormLabel>
                                <FormControl>
                                  <PatternFormat
                                    placeholder="Digite seu celular..."
                                    format="(##) #####-####"
                                    customInput={Input}
                                    className="rounded-2xl"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </section>

                      {/* Entrega / Agendamento */}
                      {allowsScheduling && (
                        <section>
                          <SectionHeader icon={<MapPinIcon size={18} />} title="Entrega / Retirada" />
                          <div className="rounded-[28px] border bg-slate-50/50 p-5 space-y-4">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">
                                Horário da {schedulingLabel}
                              </p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Escolha se deseja receber o pedido o quanto antes
                                ou em um horário agendado.
                              </p>
                            </div>

                            <FormField
                              control={form.control}
                              name="fulfillmentTiming"
                              render={({ field }) => (
                                <FormItem className="space-y-3">
                                  <FormControl>
                                    <div className="grid gap-3">
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
                                          title: "Agendar horário",
                                          description: "Escolha uma data e hora futura.",
                                        },
                                      ].map((option) => (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() => field.onChange(option.value)}
                                          className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                            field.value === option.value
                                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                              : "border-border bg-background hover:bg-slate-50"
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
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {fulfillmentTiming === "SCHEDULED" && (
                              <FormField
                                control={form.control}
                                name="scheduledFor"
                                render={({ field }) => (
                                  <FormItem className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <FormLabel className="text-xs font-bold uppercase text-slate-400">Data e hora</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl">
                                          <SelectValue placeholder="Escolha um horário..." />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="rounded-2xl">
                                        {schedulingSlots.length > 0 ? (
                                          schedulingSlots.map((group) => (
                                            <SelectGroup key={group.date}>
                                              <SelectLabel className="text-primary font-bold">{group.label}</SelectLabel>
                                              {group.items.map((slot) => (
                                                <SelectItem 
                                                  key={slot.value} 
                                                  value={slot.value}
                                                  className="rounded-lg"
                                                >
                                                  {slot.label}
                                                </SelectItem>
                                              ))}
                                            </SelectGroup>
                                          ))
                                        ) : (
                                          <div className="p-4 text-center text-xs text-muted-foreground">
                                            {isLoading ? "Carregando horários..." : "Nenhum horário disponível."}
                                          </div>
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </section>
                      )}

                      {/* Benefícios */}
                      <section>
                        <SectionHeader icon={<TicketPercentIcon size={18} />} title="Benefícios" />
                        <div className="rounded-[28px] border bg-slate-50/50 p-5 space-y-6">
                          <FormField
                            control={form.control}
                            name="couponCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cupom de desconto</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input
                                      placeholder="Ex.: BEMVINDO10"
                                      autoCapitalize="characters"
                                      className="rounded-xl uppercase"
                                      {...field}
                                      value={field.value ?? ""}
                                    />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl px-4"
                                    disabled={isValidatingBenefits || !watchedPhone}
                                    onClick={() => handleValidateBenefits()}
                                  >
                                    {isValidatingBenefits ? (
                                      <Loader2Icon className="animate-spin h-4 w-4" />
                                    ) : (
                                      "Aplicar"
                                    )}
                                  </Button>
                                </div>
                                <FormMessage />
                                {!watchedPhone && (
                                  <p className="text-[10px] text-muted-foreground mt-1 italic">
                                    * Informe seu celular para aplicar cupons.
                                  </p>
                                )}
                              </FormItem>
                            )}
                          />

                          {benefits ? (
                            <div className="space-y-3 animate-in fade-in duration-500">
                              <div className="rounded-2xl border bg-white p-4 text-sm shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                      <WalletCardsIcon size={20} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800">Seu Cashback</p>
                                      <p className="text-xs text-muted-foreground">
                                        Saldo: <strong>{formatCurrency(benefits.wallet?.currentBalance ?? 0)}</strong>
                                      </p>
                                    </div>
                                  </div>

                                  {(benefits.wallet?.currentBalance ?? 0) > 0 && (
                                    <Button
                                      type="button"
                                      variant={useWalletBalance ? "default" : "outline"}
                                      className="h-8 rounded-full text-xs px-4"
                                      disabled={isValidatingBenefits}
                                      onClick={handleToggleWalletBalance}
                                    >
                                      {useWalletBalance ? "Remover" : "Usar"}
                                    </Button>
                                  )}
                                </div>

                                {useWalletBalance && benefits.wallet?.availableToRedeem ? (
                                  <p className="mt-3 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 inline-block">
                                    Resgate de {formatCurrency(benefits.wallet.availableToRedeem)} aplicado!
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </section>

                      {/* Pagamento */}
                      <section>
                        <SectionHeader icon={<HandCoinsIcon size={18} />} title="Pagamento" />
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormControl>
                                  <div className="grid gap-3">
                                    {paymentOptions.map((option) => (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => field.onChange(option.value)}
                                        className={`flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all ${
                                          field.value === option.value
                                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                            : "border-border bg-background hover:bg-slate-50"
                                        }`}
                                      >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                          {option.icon}
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-bold">
                                            {option.titulo}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {option.descricao}
                                          </p>
                                        </div>
                                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                          field.value === option.value ? "border-primary" : "border-slate-300"
                                        }`}>
                                          {field.value === option.value && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {needsChangeField && (
                            <FormField
                              control={form.control}
                              name="changeFor"
                              render={({ field }) => (
                                <FormItem className="animate-in fade-in slide-in-from-top-2">
                                  <FormLabel>Troco para quanto?</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ex.: 50,00"
                                      inputMode="decimal"
                                      className="rounded-xl"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </section>

                      {/* Resumo */}
                      <section>
                        <SectionHeader icon={<ShoppingBagIcon size={18} />} title="Resumo do Pedido" />
                        <div className="rounded-[32px] border bg-slate-50/80 p-6 space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Subtotal</span>
                            <span className="font-semibold">{formatCurrency(checkoutSummary.subtotal)}</span>
                          </div>

                          {checkoutSummary.couponDiscountAmount > 0 && (
                            <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
                              <span>Cupom de Desconto</span>
                              <span>-{formatCurrency(checkoutSummary.couponDiscountAmount)}</span>
                            </div>
                          )}

                          {checkoutSummary.cashbackRedeemedAmount > 0 && (
                            <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
                              <span>Cashback Resgatado</span>
                              <span>-{formatCurrency(checkoutSummary.cashbackRedeemedAmount)}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-2">
                            <span className="font-bold text-slate-800">Total Final</span>
                            <span className="text-xl font-extrabold text-primary">
                              {formatCurrency(checkoutSummary.total)}
                            </span>
                          </div>

                          {checkoutSummary.cashbackEarnedAmount > 0 && (
                            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 border border-emerald-100">
                              <WalletCardsIcon size={16} className="text-emerald-600" />
                              <p className="text-[11px] font-medium text-emerald-700">
                                Este pedido vai te render <strong>{formatCurrency(checkoutSummary.cashbackEarnedAmount)}</strong> de cashback!
                              </p>
                            </div>
                          )}

                          {checkoutSummary.nextLoyaltyRule && (
                            <div className="mt-2 flex flex-col gap-1 rounded-xl bg-blue-50 px-4 py-3 border border-blue-100 animate-pulse">
                              <div className="flex items-center gap-2">
                                <TrendingUpIcon size={16} className="text-blue-600" />
                                <p className="text-[11px] font-bold text-blue-700">
                                  Dica de Ouro!
                                </p>
                              </div>
                              <p className="text-[11px] text-blue-600">
                                Adicione mais <strong>{formatCurrency(checkoutSummary.nextLoyaltyRule.remainingAmount)}</strong> e ganhe <strong>{checkoutSummary.nextLoyaltyRule.cashbackPercent}%</strong> de cashback em vez de {((checkoutSummary.cashbackEarnedAmount / checkoutSummary.total) * 100).toFixed(0)}%!
                              </p>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              <div className="flex flex-col gap-3 p-6 border-t bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
                {!isOpen && fulfillmentTiming !== "SCHEDULED" && (
                  <p className="rounded-xl bg-rose-50 p-3 text-center text-xs font-semibold text-rose-600 border border-rose-100 mb-2">
                    O restaurante está fechado e não aceita pedidos imediatos.
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-14 w-full rounded-2xl bg-destructive text-lg font-bold shadow-lg shadow-destructive/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  disabled={isLoading || (!isOpen && fulfillmentTiming !== "SCHEDULED")}
                >
                  {isLoading ? (
                    <Loader2Icon className="animate-spin mr-2" />
                  ) : null}
                  {paymentMethod === "MERCADO_PAGO"
                    ? "Ir para Pagamento"
                    : "Confirmar Pedido"}
                </Button>
                <Button
                  className="w-full h-12 rounded-2xl text-slate-500 font-medium"
                  variant="ghost"
                  type="button"
                  onClick={() => handleSheetOpenChange(false)}
                >
                  Voltar ao Carrinho
                </Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default FinishOrderSheet;
