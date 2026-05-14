"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2Icon,
  Loader2Icon,
  TicketPercentIcon,
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/helpers/format-currency";
import type {
  ConsumptionMethod,
  PaymentMethod,
  PedidoBeneficiosValidado,
} from "@/lib/db";

import { createOrder } from "../actions/create-order";
import { criarPreferenciaMercadoPago } from "../actions/criar-preferencia-mercado-pago";
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

const formatDateTimeLocalInput = (date: Date) => {
  const adjustedDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60 * 1000,
  );

  return adjustedDate.toISOString().slice(0, 16);
};

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
    shouldUnregister: true,
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
  const minimumScheduleValue = formatDateTimeLocalInput(
    new Date(Date.now() + 15 * 60 * 1000),
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
    setBenefits(null);
    setUseWalletBalance(false);
  }, [products, watchedPhone, watchedCouponCode]);

  useEffect(() => {
    if (!open || products.length === 0) {
      return;
    }

    const hasCustomerData =
      watchedName.trim().length > 0 || watchedPhone.replace(/\D/g, "").length > 0;

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

  const handleDrawerOpenChange = (nextOpen: boolean) => {
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

    handleDrawerOpenChange(false);
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
        products,
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
        products,
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
    <Drawer open={open} onOpenChange={handleDrawerOpenChange}>
      <DrawerTrigger asChild></DrawerTrigger>
      <DrawerContent>
        {pedidoOfflineConcluido ? (
          <>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <CheckCircle2Icon className="text-green-600" />
                Pedido recebido
              </DrawerTitle>
              <DrawerDescription>
                Seu pedido ja foi salvo e a equipe do restaurante foi avisada.
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 p-5">
              <div className="rounded-3xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">
                {pedidoOfflineConcluido.paymentMethod === "DINHEIRO"
                  ? "O pagamento sera feito em dinheiro no balcao ou na entrega."
                  : "O pagamento sera concluido na maquininha no balcao ou na entrega."}
              </div>

              <div className="rounded-3xl border bg-muted p-4 text-sm">
                Total registrado:{" "}
                <strong>{formatCurrency(pedidoOfflineConcluido.total)}</strong>
              </div>

              {pedidoOfflineConcluido.scheduledFor ? (
                <div className="rounded-3xl border bg-muted p-4 text-sm">
                  Pedido agendado para{" "}
                  <strong>
                    {formatScheduledDate(pedidoOfflineConcluido.scheduledFor)}
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

              <DrawerFooter className="px-0">
                <Button className="rounded-full" onClick={handleViewOrders}>
                  Ver meus pedidos
                </Button>
                <DrawerClose asChild>
                  <Button className="rounded-full" variant="outline">
                    Fechar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </>
        ) : (
          <>
            <DrawerHeader>
              <DrawerTitle>Finalizar pedido</DrawerTitle>
              <DrawerDescription>
                Informe seus dados, valide os beneficios e escolha como prefere
                pagar.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-5">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seu nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite seu nome..." {...field} />
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
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="couponCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cupom de desconto</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex.: BEMVINDO10"
                            autoCapitalize="characters"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {allowsScheduling ? (
                    <div className="rounded-[28px] border bg-slate-50/80 p-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">
                          Horario da {schedulingLabel}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Escolha se deseja receber o pedido o quanto antes ou em
                          um horario agendado.
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="fulfillmentTiming"
                        render={({ field }) => (
                          <FormItem className="mt-4 space-y-3">
                            <FormControl>
                              <div className="grid gap-3">
                                {[
                                  {
                                    value: "ASAP" as const,
                                    title: "O quanto antes",
                                    description:
                                      consumptionMethod === "DELIVERY"
                                        ? "Vamos preparar e despachar assim que o pedido entrar."
                                        : "Vamos preparar para retirada assim que o pedido entrar.",
                                  },
                                  {
                                    value: "SCHEDULED" as const,
                                    title: "Agendar horario",
                                    description:
                                      consumptionMethod === "DELIVERY"
                                        ? "Defina a data e hora desejadas para a entrega."
                                        : "Defina a data e hora desejadas para a retirada.",
                                  },
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => field.onChange(option.value)}
                                    className={`rounded-3xl border px-4 py-3 text-left transition ${
                                      field.value === option.value
                                        ? "border-primary bg-primary/5"
                                        : "border-border bg-background"
                                    }`}
                                  >
                                    <p className="font-medium">{option.title}</p>
                                    <p className="text-sm text-muted-foreground">
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

                      {fulfillmentTiming === "SCHEDULED" ? (
                        <FormField
                          control={form.control}
                          name="scheduledFor"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Data e hora</FormLabel>
                              <FormControl>
                                <Input
                                  type="datetime-local"
                                  min={minimumScheduleValue}
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  <div className="rounded-[28px] border bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <TicketPercentIcon size={16} />
                          Cupons e cashback
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Validamos o cupom e o saldo pelo celular informado.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        disabled={isValidatingBenefits || products.length === 0}
                        onClick={() => handleValidateBenefits()}
                      >
                        {isValidatingBenefits ? (
                          <Loader2Icon className="animate-spin" />
                        ) : null}
                        Validar beneficios
                      </Button>
                    </div>

                    {benefits ? (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-3xl border bg-background p-4 text-sm">
                          {benefits.appliedCoupon ? (
                            <p className="font-medium text-slate-900">
                              Cupom aplicado: {benefits.appliedCoupon.code}
                            </p>
                          ) : (
                            <p className="font-medium text-slate-900">
                              Nenhum cupom aplicado.
                            </p>
                          )}
                          <p className="mt-1 text-muted-foreground">
                            {benefits.appliedCoupon?.description ??
                              "Voce pode seguir sem desconto promocional."}
                          </p>
                        </div>

                        <div className="rounded-3xl border bg-background p-4 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="flex items-center gap-2 font-medium text-slate-900">
                                <WalletCardsIcon size={16} />
                                Saldo de cashback
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                Disponivel agora:{" "}
                                <strong>
                                  {formatCurrency(
                                    benefits.wallet?.currentBalance ?? 0,
                                  )}
                                </strong>
                              </p>
                            </div>

                            {(benefits.wallet?.currentBalance ?? 0) > 0 ? (
                              <Button
                                type="button"
                                variant={useWalletBalance ? "default" : "outline"}
                                className="rounded-full"
                                disabled={isValidatingBenefits}
                                onClick={handleToggleWalletBalance}
                              >
                                {useWalletBalance
                                  ? "Remover saldo"
                                  : "Usar saldo"}
                              </Button>
                            ) : null}
                          </div>

                          {useWalletBalance &&
                          benefits.wallet?.availableToRedeem ? (
                            <p className="mt-3 text-emerald-700">
                              Resgate aplicado:{" "}
                              <strong>
                                {formatCurrency(
                                  benefits.wallet.availableToRedeem,
                                )}
                              </strong>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">
                        O total final continua sendo revalidado no servidor no
                        momento da confirmacao.
                      </p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Forma de pagamento</FormLabel>
                        <FormControl>
                          <div className="grid gap-3">
                            {paymentOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => field.onChange(option.value)}
                                className={`rounded-3xl border px-4 py-3 text-left transition ${
                                  field.value === option.value
                                    ? "border-primary bg-primary/5"
                                    : "border-border bg-background"
                                }`}
                              >
                                <p className="font-medium">{option.titulo}</p>
                                <p className="text-sm text-muted-foreground">
                                  {option.descricao}
                                </p>
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {needsChangeField ? (
                    <FormField
                      control={form.control}
                      name="changeFor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precisa de troco para quanto?</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex.: 50,00"
                              inputMode="decimal"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  <div className="rounded-[28px] border bg-muted/50 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Subtotal</span>
                      <strong>{formatCurrency(checkoutSummary.subtotal)}</strong>
                    </div>

                    {checkoutSummary.couponDiscountAmount > 0 ? (
                      <div className="mt-2 flex items-center justify-between text-emerald-700">
                        <span>Desconto por cupom</span>
                        <strong>
                          -{formatCurrency(checkoutSummary.couponDiscountAmount)}
                        </strong>
                      </div>
                    ) : null}

                    {checkoutSummary.cashbackRedeemedAmount > 0 ? (
                      <div className="mt-2 flex items-center justify-between text-emerald-700">
                        <span>Cashback resgatado</span>
                        <strong>
                          -{formatCurrency(checkoutSummary.cashbackRedeemedAmount)}
                        </strong>
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between border-t pt-3 text-base">
                      <span className="font-medium">Total do pedido</span>
                      <strong>{formatCurrency(checkoutSummary.total)}</strong>
                    </div>

                    {checkoutSummary.cashbackEarnedAmount > 0 ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Apos o pagamento, este pedido gera{" "}
                        <strong>
                          {formatCurrency(checkoutSummary.cashbackEarnedAmount)}
                        </strong>{" "}
                        em cashback.
                      </p>
                    ) : null}
                  </div>

                  <DrawerFooter className="px-0">
                    <Button
                      type="submit"
                      variant="destructive"
                      className="rounded-full"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2Icon className="animate-spin" /> : null}
                      {paymentMethod === "MERCADO_PAGO"
                        ? "Ir para pagamento"
                        : "Confirmar pedido"}
                    </Button>
                    <DrawerClose asChild>
                      <Button className="w-full rounded-full" variant="outline">
                        Cancelar
                      </Button>
                    </DrawerClose>
                  </DrawerFooter>
                </form>
              </Form>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default FinishOrderDialog;
