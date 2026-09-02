"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DiningTable,
  PaymentMethod,
  PedidoBeneficiosValidado,
  RestaurantComCategoriasEProdutos,
} from "@/lib/db";

import { trackInitiateCheckout, trackPurchase } from "@/hooks/use-pixel-events";
import { createOrder } from "../actions/create-order";
import { criarPreferenciaMercadoPago } from "../actions/criar-preferencia-mercado-pago";
import { getAvailableSchedulingSlots } from "../actions/get-scheduling-slots";
import { getLoyaltyUpsell } from "../actions/get-loyalty-upsell";
import type { LoyaltyUpsell } from "../actions/get-loyalty-upsell";
import { getTables } from "../actions/get-tables";
import { saveAbandonedCart } from "../actions/save-abandoned-cart";
import { validateOrderBenefits } from "../actions/validate-order-benefits";
import { CartContext } from "../contexts/cart";
import { isValidPhoneNumber, normalizePhoneNumber } from "../helpers/phone";
import { formSchema } from "./finish-order-schema";
import type { FormSchema } from "./finish-order-schema";
import { BenefitsSection } from "./sections/benefits-section";
import { FulfillmentSection } from "./sections/fulfillment-section";
import type { SchedulingSlotGroup } from "./sections/fulfillment-section";
import { IdentificationSection } from "./sections/identification-section";
import { OrderSummarySection } from "./sections/order-summary-section";
import { PaymentSection } from "./sections/payment-section";
import { TableSection } from "./sections/table-section";

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

const formatScheduledDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const getSchedulingLabel = (consumptionMethod: ConsumptionMethod) =>
  consumptionMethod === "DELIVERY" ? "entrega" : "retirada";

const createAbandonedCartSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `abandoned-cart-${Date.now().toString()}-${Math.random().toString(36).slice(2, 10)}`;
};

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
  const [loyaltyUpsell, setLoyaltyUpsell] = useState<LoyaltyUpsell | null>(null);
  const [pedidoOfflineConcluido, setPedidoOfflineConcluido] =
    useState<PedidoOfflineConcluido | null>(null);
  const [schedulingSlots, setSchedulingSlots] = useState<SchedulingSlotGroup[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const consumptionMethod: ConsumptionMethod =
    searchParams.get("consumptionMethod") === "DINE_IN"
      ? "DINE_IN"
      : searchParams.get("consumptionMethod") === "DELIVERY"
        ? "DELIVERY"
        : "TAKEAWAY";

  const abandonedCartSessionIdRef = useRef(createAbandonedCartSessionId());
  const validateBenefitsRef = useRef<(() => Promise<void>) | null>(null);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      couponCode: "",
      fulfillmentTiming: "ASAP",
      scheduledFor: "",
      paymentMethod: restaurant.acceptMercadoPago ? "MERCADO_PAGO" : "DINHEIRO",
      changeFor: "",
      consumptionMethod,
      diningTableId: undefined,
    },
  });

  const paymentMethod = form.watch("paymentMethod");
  const watchedName = form.watch("name");
  const watchedPhone = form.watch("phone");
  const watchedCouponCode = form.watch("couponCode");
  const fulfillmentTiming = form.watch("fulfillmentTiming");
  const watchedScheduledFor = form.watch("scheduledFor");
  const needsChangeField = paymentMethod === "DINHEIRO";
  const allowsScheduling = consumptionMethod !== "DINE_IN";
  const schedulingLabel = getSchedulingLabel(consumptionMethod);
  const isOpen = isRestaurantOpen(restaurant.status, restaurant.operatingHours);
  const isActionDisabled = !isOpen && fulfillmentTiming !== "SCHEDULED";

  // When benefits are available (phone validated), use them fully.
  // Otherwise show the raw cart total + proactively fetched upsell rule.
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
    nextLoyaltyRule: loyaltyUpsell,
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

  // Fetch dining tables when sheet opens for DINE_IN orders
  useEffect(() => {
    if (!open || consumptionMethod !== "DINE_IN" || tables.length > 0) return;
    setIsLoadingTables(true);
    void getTables(slug)
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setIsLoadingTables(false));
  }, [open, consumptionMethod, slug, tables.length]);

  // Fetch the proactive upsell rule whenever the sheet opens or cart total changes
  useEffect(() => {
    if (!open) return;
    void getLoyaltyUpsell(slug, total).then(setLoyaltyUpsell).catch(() => null);
    trackInitiateCheckout({ value: total, numItems: products.reduce((s, p) => s + p.quantity, 0) });
  }, [open, slug, total, products]);

  // Cart change always invalidates benefits (subtotal and products changed)
  useEffect(() => {
    setBenefits(null);
    setUseWalletBalance(false);
  }, [products]);

  // Reset only when phone becomes invalid — not on every keystroke while valid
  useEffect(() => {
    if (!isValidPhoneNumber(watchedPhone)) {
      setBenefits(null);
      setUseWalletBalance(false);
    }
  }, [watchedPhone]);

  // Reset only when the coupon is explicitly cleared
  const prevCouponCodeRef = useRef(watchedCouponCode);
  useEffect(() => {
    const prevWasNonEmpty = (prevCouponCodeRef.current?.length ?? 0) > 0;
    const nowEmpty = !watchedCouponCode;
    prevCouponCodeRef.current = watchedCouponCode;
    if (prevWasNonEmpty && nowEmpty) {
      setBenefits(null);
      setUseWalletBalance(false);
    }
  }, [watchedCouponCode]);

  // Keep ref to latest validate fn so the debounce always calls fresh closure
  // silent=true: auto-trigger failures don't show invasive toasts
  validateBenefitsRef.current = () => handleValidateBenefits(useWalletBalance, true);

  // Auto-validate when phone reaches a valid 11-digit number (silent on error)
  useEffect(() => {
    const digits = watchedPhone?.replace(/\D/g, "") ?? "";
    if (digits.length !== 11 || !isValidPhoneNumber(watchedPhone)) return;

    const timeoutId = window.setTimeout(() => {
      void validateBenefitsRef.current?.();
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [watchedPhone]);

  useEffect(() => {
    if (!open || products.length === 0) return;

    const hasCustomerData =
      (watchedName?.trim()?.length ?? 0) > 0 ||
      (watchedPhone?.replace(/\D/g, "").length ?? 0) > 0;

    if (!hasCustomerData) return;

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
      setTables([]);
      form.reset({
        name: "",
        phone: "",
        couponCode: "",
        fulfillmentTiming: "ASAP",
        scheduledFor: "",
        paymentMethod: restaurant.acceptMercadoPago ? "MERCADO_PAGO" : "DINHEIRO",
        changeFor: "",
        consumptionMethod,
        diningTableId: undefined,
      });
    }
    onOpenChange(nextOpen);
  };

  const handleViewOrders = () => {
    if (!pedidoOfflineConcluido) return;
    handleSheetOpenChange(false);
    router.push(
      `/${slug}/orders?phone=${normalizePhoneNumber(pedidoOfflineConcluido.phone)}`,
    );
  };

  const handleValidateBenefits = async (
    nextUseWalletBalance = useWalletBalance,
    silent = false,
  ) => {
    if (!isValidPhoneNumber(watchedPhone)) {
      if (!silent) {
        form.setError("phone", {
          message: "Informe um celular válido para consultar benefícios.",
        });
      }
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
      if (!silent) {
        toast.error("Não foi possível validar cupom e cashback.", {
          description:
            error instanceof Error
              ? error.message
              : "Revise os dados informados e tente novamente.",
        });
      }
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
        diningTableId: data.diningTableId,
        deliveryAddress: consumptionMethod === "DELIVERY" ? data.deliveryAddress : undefined,
        products: products.map((product) => ({
          id: product.id,
          quantity: product.quantity,
          selectedOptions: product.selectedOptions?.map((opt) => opt.id),
          notes: product.notes,
        })),
        slug,
      });

      trackPurchase({ orderId: order.id, value: order.total });

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
      <SheetContent
        side="right"
        className="flex h-full flex-col gap-0 p-0 w-full sm:max-w-[450px]"
      >
        {pedidoOfflineConcluido ? (
          <OrderSuccessView
            pedidoOfflineConcluido={pedidoOfflineConcluido}
            onViewOrders={handleViewOrders}
            onClose={() => handleSheetOpenChange(false)}
          />
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.error("Erro de validação no checkout:", errors);
                toast.error("Por favor, verifique os campos do formulário.", {
                  description:
                    "Alguns dados obrigatórios estão ausentes ou inválidos.",
                });
              })}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <SheetHeader className="pb-3">
                      <SheetTitle className="text-left text-lg">Finalizar pedido</SheetTitle>
                      <SheetDescription className="text-sm">
                        Informe seus dados, valide os benefícios e escolha como prefere pagar.
                      </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-8 py-6">
                      <IdentificationSection form={form} />

                      {allowsScheduling && (
                        <FulfillmentSection
                          form={form}
                          consumptionMethod={consumptionMethod}
                          schedulingLabel={schedulingLabel}
                          schedulingSlots={schedulingSlots}
                          fulfillmentTiming={fulfillmentTiming}
                          isLoading={isLoading}
                        />
                      )}

                      {consumptionMethod === "DINE_IN" && (
                        <TableSection
                          form={form}
                          tables={tables}
                          isLoading={isLoadingTables}
                        />
                      )}

                      <BenefitsSection
                        form={form}
                        benefits={benefits}
                        watchedPhone={watchedPhone}
                        useWalletBalance={useWalletBalance}
                        isValidatingBenefits={isValidatingBenefits}
                        isActionDisabled={isActionDisabled}
                        isCouponsEnabled={restaurant.isCouponsEnabled}
                        isCashbackEnabled={restaurant.isCashbackEnabled}
                        onValidateBenefits={() => void handleValidateBenefits()}
                        onToggleWalletBalance={() => void handleToggleWalletBalance()}
                      />

                      <PaymentSection
                        form={form}
                        needsChangeField={needsChangeField}
                        isActionDisabled={isActionDisabled}
                        acceptMercadoPago={restaurant.acceptMercadoPago}
                      />

                      <OrderSummarySection
                        checkoutSummary={checkoutSummary}
                        isCashbackEnabled={restaurant.isCashbackEnabled}
                      />
                    </div>
                  </div>
                </ScrollArea>
              </div>

              <div className="flex flex-col gap-2.5 p-4 border-t bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
                {isActionDisabled && (
                  <p
                    role="alert"
                    className="rounded-xl bg-rose-50 p-2 text-center text-xs font-semibold text-rose-600 border border-rose-100 mb-1"
                  >
                    O restaurante está fechado e não aceita pedidos imediatos. Agende para continuar.
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-destructive text-base font-bold shadow-lg shadow-destructive/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  disabled={isLoading || isActionDisabled}
                >
                  {isLoading ? (
                    <Loader2Icon className="animate-spin mr-2 h-4 w-4" />
                  ) : null}
                  {paymentMethod === "MERCADO_PAGO" ? "Ir para Pagamento" : "Confirmar Pedido"}
                </Button>
                <Button
                  className="w-full h-10 rounded-2xl text-slate-500 font-medium text-sm"
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

interface OrderSuccessViewProps {
  pedidoOfflineConcluido: PedidoOfflineConcluido;
  onViewOrders: () => void;
  onClose: () => void;
}

const OrderSuccessView = ({
  pedidoOfflineConcluido,
  onViewOrders,
  onClose,
}: OrderSuccessViewProps) => (
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
              Seu pedido já foi salvo e a equipe do restaurante foi avisada.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <div className="rounded-2xl border border-green-100 bg-green-50 p-3 text-sm text-green-900">
              {pedidoOfflineConcluido.paymentMethod === "DINHEIRO"
                ? "O pagamento será feito em dinheiro no balcão ou na entrega."
                : "O pagamento será concluído na maquininha no balcão ou na entrega."}
            </div>

            <div className="rounded-2xl border bg-muted p-3 text-sm">
              Total registrado:{" "}
              <strong>{formatCurrency(pedidoOfflineConcluido.total)}</strong>
            </div>

            {pedidoOfflineConcluido.scheduledFor ? (
              <div className="rounded-2xl border bg-muted p-3 text-sm">
                Pedido agendado para{" "}
                <strong>{formatScheduledDate(pedidoOfflineConcluido.scheduledFor)}</strong>.
              </div>
            ) : null}

            {pedidoOfflineConcluido.changeFor ? (
              <div className="rounded-2xl border bg-muted p-3 text-sm">
                Troco solicitado para{" "}
                <strong>{formatCurrency(pedidoOfflineConcluido.changeFor)}</strong>.
              </div>
            ) : null}
          </div>
        </div>
      </ScrollArea>
    </div>
    <div className="flex flex-col gap-2.5 p-4 border-t bg-background">
      <Button className="rounded-full h-10 text-sm" onClick={onViewOrders}>
        Ver meus pedidos
      </Button>
      <Button
        className="rounded-full h-10 text-sm"
        variant="outline"
        onClick={onClose}
      >
        Fechar
      </Button>
    </div>
  </div>
);

export default FinishOrderSheet;
