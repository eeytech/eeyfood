"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon, CheckIcon, CopyIcon, Loader2Icon, QrCodeIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { gerarPayloadPix } from "@/lib/pix";

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
  CustomerAddress,
  DiningTable,
  PaymentMethod,
  PedidoBeneficiosValidado,
  RestaurantComCategoriasEProdutos,
} from "@/lib/db";

import { trackInitiateCheckout, trackPurchase } from "@/hooks/use-pixel-events";
import { createOrder } from "../actions/create-order";
import { criarCheckoutOnline } from "../actions/criar-checkout-online";
import { getAvailableSchedulingSlots } from "../actions/get-scheduling-slots";
import { getLoyaltyUpsell } from "../actions/get-loyalty-upsell";
import type { LoyaltyUpsell } from "../actions/get-loyalty-upsell";
import { getCustomerAddresses } from "../actions/get-customer-addresses";
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
  consumptionMethod?: ConsumptionMethod;
}

interface PedidoOfflineConcluido {
  orderId?: number;
  phone: string;
  total: number;
  scheduledFor?: string;
  paymentMethod: PaymentMethod;
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

export const FinishOrderSheet = ({
  open,
  onOpenChange,
  restaurant,
  consumptionMethod: consumptionMethodProp,
}: FinishOrderSheetProps) => {
  const router = useRouter();
  const slug = restaurant.slug;
  const { products, total, clearCart } = useContext(CartContext);
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingBenefits, setIsValidatingBenefits] = useState(false);
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [benefits, setBenefits] = useState<PedidoBeneficiosValidado | null>(null);
  const [loyaltyUpsell, setLoyaltyUpsell] = useState<LoyaltyUpsell | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [pedidoOfflineConcluido, setPedidoOfflineConcluido] =
    useState<PedidoOfflineConcluido | null>(null);
  const [schedulingSlots, setSchedulingSlots] = useState<SchedulingSlotGroup[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const consumptionMethod: ConsumptionMethod =
    consumptionMethodProp ??
    (searchParams.get("consumptionMethod") === "DINE_IN"
      ? "DINE_IN"
      : searchParams.get("consumptionMethod") === "DELIVERY"
        ? "DELIVERY"
        : "TAKEAWAY");

  const onlinePaymentGateway =
    restaurant.onlinePaymentGateway ?? "MERCADO_PAGO";
  const allowsOnlinePayment =
    restaurant.acceptMercadoPago &&
    onlinePaymentGateway !== "DISABLED" &&
    consumptionMethod !== "DINE_IN";

  const queryTableId = searchParams.get("tableId") || undefined;
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
      paymentMethod: allowsOnlinePayment
        ? onlinePaymentGateway === "INFINITEPAY"
          ? "INFINITEPAY"
          : "MERCADO_PAGO"
        : (restaurant.acceptPix ?? true)
          ? "PIX"
          : "DINHEIRO",
      changeFor: "",
      consumptionMethod,
      diningTableId: consumptionMethod === "DINE_IN" ? queryTableId : undefined,
      deliveryAddressMode: "NEW",
      selectedAddressId: undefined,
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      complement: "",
      city: "",
      state: "",
    },
  });

  const paymentMethod = form.watch("paymentMethod");
  const watchedName = form.watch("name");
  const watchedPhone = form.watch("phone");
  const watchedCouponCode = form.watch("couponCode");
  const watchedNeighborhood = form.watch("neighborhood");
  const watchedCep = form.watch("cep");
  const watchedStreet = form.watch("street");
  const watchedNumber = form.watch("number");
  const watchedCity = form.watch("city");
  const watchedState = form.watch("state");
  const watchedSelectedAddressId = form.watch("selectedAddressId");
  const watchedAddressMode = form.watch("deliveryAddressMode");
  const fulfillmentTiming = form.watch("fulfillmentTiming");
  const watchedScheduledFor = form.watch("scheduledFor");
  const needsChangeField = paymentMethod === "DINHEIRO";
  const allowsScheduling =
    restaurant.isOrderSchedulingEnabled !== false && consumptionMethod !== "DINE_IN";
  const schedulingLabel = getSchedulingLabel(consumptionMethod);
  const { isOpen } = isRestaurantOpen(restaurant.status, restaurant.operatingHours);
  const isActionDisabled = allowsScheduling
    ? !isOpen && fulfillmentTiming !== "SCHEDULED"
    : !isOpen;

  const defaultDeliveryFee =
    consumptionMethod === "DELIVERY"
      ? (restaurant.freeDeliveryThreshold !== null &&
         restaurant.freeDeliveryThreshold !== undefined &&
         total >= Number(restaurant.freeDeliveryThreshold)
          ? 0
          : Number(restaurant.deliveryFee ?? 0))
      : 0;

  // When benefits are available (phone validated), use them fully.
  // Otherwise show the raw cart total + proactively fetched upsell rule.
  const checkoutSummary = benefits ?? {
    subtotal: total,
    deliveryFee: defaultDeliveryFee,
    discountAmount: 0,
    couponDiscountAmount: 0,
    cashbackRedeemedAmount: 0,
    total: total + defaultDeliveryFee,
    cashbackEarnedAmount: 0,
    appliedCoupon: null,
    wallet: null,
    nextLoyaltyRule: loyaltyUpsell,
  };

  const minOrderValue =
    consumptionMethod === "DELIVERY"
      ? Math.max(
          Number(restaurant.minimumOrderValue || 0),
          Number(checkoutSummary.matchedDeliveryRule?.minimumOrderValue || 0),
        )
      : 0;

  const isBelowMinimumOrder =
    consumptionMethod === "DELIVERY" && minOrderValue > 0 && total < minOrderValue;

  useEffect(() => {
    if (!allowsScheduling && form.getValues("fulfillmentTiming") !== "ASAP") {
      form.setValue("fulfillmentTiming", "ASAP");
      form.setValue("scheduledFor", "");
    }
  }, [allowsScheduling, form]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (allowsScheduling && fulfillmentTiming === "SCHEDULED" && schedulingSlots.length === 0) {
        const slots = await getAvailableSchedulingSlots(slug);
        setSchedulingSlots(slots);

        if (slots.length > 0 && slots[0].items.length > 0 && !form.getValues("scheduledFor")) {
          form.setValue("scheduledFor", slots[0].items[0].value);
        }
      }
    };

    void fetchSlots();
  }, [allowsScheduling, fulfillmentTiming, slug, schedulingSlots.length, form]);

  // Fetch dining tables when sheet opens for DINE_IN orders
  useEffect(() => {
    if (!open || consumptionMethod !== "DINE_IN") return;
    if (tables.length === 0) {
      setIsLoadingTables(true);
      void getTables(slug)
        .then((fetchedTables) => {
          setTables(fetchedTables);
          if (queryTableId && !form.getValues("diningTableId")) {
            form.setValue("diningTableId", queryTableId);
          }
        })
        .catch(() => setTables([]))
        .finally(() => setIsLoadingTables(false));
    } else if (queryTableId && !form.getValues("diningTableId")) {
      form.setValue("diningTableId", queryTableId);
    }
  }, [open, consumptionMethod, slug, tables.length, queryTableId, form]);

  // Fetch the proactive upsell rule whenever the sheet opens or cart total changes
  useEffect(() => {
    if (!open) return;
    const cartItems = products.map((p) => ({
      productId: p.id,
      menuCategoryId: p.menuCategoryId,
    }));
    void getLoyaltyUpsell(slug, total, cartItems).then(setLoyaltyUpsell).catch(() => null);
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

  // Auto-fetch saved addresses when phone reaches 11 digits
  useEffect(() => {
    const digits = watchedPhone?.replace(/\D/g, "") ?? "";
    if (digits.length !== 11 || !isValidPhoneNumber(watchedPhone)) {
      setCustomerAddresses([]);
      return;
    }

    let isMounted = true;
    setIsLoadingAddresses(true);

    getCustomerAddresses(watchedPhone)
      .then((addresses) => {
        if (!isMounted) return;
        setCustomerAddresses(addresses);
        if (addresses.length > 0) {
          form.setValue("deliveryAddressMode", "SAVED");
          const currentSelected = form.getValues("selectedAddressId");
          if (!currentSelected || !addresses.some((a) => a.id === currentSelected)) {
            form.setValue("selectedAddressId", addresses[0].id);
          }
        } else {
          form.setValue("deliveryAddressMode", "NEW");
        }
      })
      .catch((err) => {
        console.error("Falha ao buscar endereços do cliente:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingAddresses(false);
      });

    return () => {
      isMounted = false;
    };
  }, [watchedPhone, form]);

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

  // Se pagamento online não for permitido (ou for consumo no local), garante método alternativo
  useEffect(() => {
    const currentMethod = form.getValues("paymentMethod");
    if (
      !allowsOnlinePayment &&
      (currentMethod === "MERCADO_PAGO" || currentMethod === "INFINITEPAY")
    ) {
      form.setValue(
        "paymentMethod",
        (restaurant.acceptPix ?? true) ? "PIX" : "DINHEIRO",
      );
    }
  }, [allowsOnlinePayment, form, restaurant.acceptPix]);

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

  // Auto-validate benefits whenever the neighborhood, CEP or delivery address changes
  useEffect(() => {
    if (consumptionMethod !== "DELIVERY") return;

    const timeoutId = window.setTimeout(() => {
      void validateBenefitsRef.current?.();
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [
    watchedNeighborhood,
    watchedCep,
    watchedStreet,
    watchedNumber,
    watchedCity,
    watchedState,
    watchedSelectedAddressId,
    watchedAddressMode,
    consumptionMethod,
    watchedPhone,
  ]);

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
      setCustomerAddresses([]);
      form.reset({
        name: "",
        phone: "",
        couponCode: "",
        fulfillmentTiming: "ASAP",
        scheduledFor: "",
        paymentMethod: allowsOnlinePayment
          ? onlinePaymentGateway === "INFINITEPAY"
            ? "INFINITEPAY"
            : "MERCADO_PAGO"
          : (restaurant.acceptPix ?? true)
            ? "PIX"
            : "DINHEIRO",
        changeFor: "",
        consumptionMethod,
        diningTableId: consumptionMethod === "DINE_IN" ? queryTableId : undefined,
        deliveryAddressMode: "NEW",
        selectedAddressId: undefined,
        street: "",
        number: "",
        neighborhood: "",
        complement: "",
      });
    }
    onOpenChange(nextOpen);
  };

  const handleViewOrders = () => {
    if (!pedidoOfflineConcluido) return;
    handleSheetOpenChange(false);
    router.push(
      `/orders?phone=${normalizePhoneNumber(pedidoOfflineConcluido.phone)}`,
    );
  };

  const handleValidateBenefits = async (
    nextUseWalletBalance = useWalletBalance,
    silent = false,
  ) => {
    const phoneValid = isValidPhoneNumber(watchedPhone);
    if (!phoneValid && !silent && watchedPhone) {
      form.setError("phone", {
        message: "Informe um celular válido para consultar benefícios.",
      });
    }

    const currentAddressMode = form.getValues("deliveryAddressMode");
    const currentSelectedId = form.getValues("selectedAddressId");
    let currentNeighborhood: string | undefined;
    let currentCep: string | undefined;
    let currentFormattedAddress: string | undefined;

    if (currentAddressMode === "SAVED" && currentSelectedId) {
      const saved = customerAddresses.find((a) => a.id === currentSelectedId);
      currentNeighborhood = saved?.neighborhood;
      if (saved) {
        const cityState = saved.city ? `, ${saved.city}${saved.state ? ` - ${saved.state}` : ""}` : "";
        currentFormattedAddress = `${saved.street}, ${saved.number} - ${saved.neighborhood}${saved.complement ? ` (${saved.complement})` : ""}${cityState}`;
      }
    } else {
      currentNeighborhood = form.getValues("neighborhood");
      currentCep = form.getValues("cep");
      const street = form.getValues("street");
      const number = form.getValues("number");
      const city = form.getValues("city");
      const state = form.getValues("state");
      if (street && number) {
        const cityState = city ? `, ${city}${state ? ` - ${state}` : ""}` : "";
        const cepSuffix = currentCep ? ` - CEP: ${currentCep}` : "";
        currentFormattedAddress = `${street}, ${number} - ${currentNeighborhood || ""}${cityState}${cepSuffix}`;
      }
    }

    try {
      setIsValidatingBenefits(true);

      const validatedBenefits = await validateOrderBenefits({
        customerPhone: phoneValid ? watchedPhone : undefined,
        slug,
        consumptionMethod,
        couponCode: watchedCouponCode,
        useWalletBalance: nextUseWalletBalance,
        deliveryNeighborhood: currentNeighborhood,
        deliveryCep: currentCep,
        deliveryAddress: currentFormattedAddress,
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
        toast.error("Não foi possível validar benefícios.", {
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

      let customerAddressId: string | undefined;
      let deliveryAddressData:
        | {
            street: string;
            number: string;
            neighborhood: string;
            complement?: string;
            cep?: string;
            city?: string;
            state?: string;
          }
        | undefined;
      let formattedDeliveryAddress: string | undefined;

      if (consumptionMethod === "DELIVERY") {
        if (data.deliveryAddressMode === "SAVED" && data.selectedAddressId) {
          customerAddressId = data.selectedAddressId;
          const saved = customerAddresses.find((a) => a.id === data.selectedAddressId);
          if (saved) {
            const cityState = saved.city ? `, ${saved.city}${saved.state ? ` - ${saved.state}` : ""}` : "";
            formattedDeliveryAddress = `${saved.street}, ${saved.number} - ${saved.neighborhood}${saved.complement ? ` (${saved.complement})` : ""}${cityState}`;
          }
        } else if (data.street && data.number && data.neighborhood) {
          deliveryAddressData = {
            street: data.street,
            number: data.number,
            neighborhood: data.neighborhood,
            complement: data.complement || undefined,
            cep: data.cep || undefined,
            city: data.city || undefined,
            state: data.state || undefined,
          };
          const cityState = data.city ? `, ${data.city}${data.state ? ` - ${data.state}` : ""}` : "";
          const cepSuffix = data.cep ? ` - CEP: ${data.cep}` : "";
          formattedDeliveryAddress = `${data.street}, ${data.number} - ${data.neighborhood}${data.complement ? ` (${data.complement})` : ""}${cityState}${cepSuffix}`;
        }
      }

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
        deliveryAddress: formattedDeliveryAddress,
        customerAddressId,
        deliveryAddressData,
        deliveryCep: data.deliveryAddressMode === "SAVED" ? undefined : (data.cep || undefined),
        deliveryNeighborhood:
          data.deliveryAddressMode === "SAVED" && data.selectedAddressId
            ? customerAddresses.find((a) => a.id === data.selectedAddressId)?.neighborhood
            : data.neighborhood,
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          quantity: product.quantity,
          selectedOptions: product.selectedOptions?.map((opt) => opt.id),
          notes: product.notes,
        })),
        slug,
      });

      trackPurchase({ orderId: Number(order.id), value: Number(order.total) });

      const isOrderFree = Number(order.total) <= 0 || Boolean((order as { isFree?: boolean }).isFree);

      if (isOrderFree) {
        abandonedCartSessionIdRef.current = createAbandonedCartSessionId();
        clearCart();
        setPedidoOfflineConcluido({
          phone: data.phone,
          total: 0,
          scheduledFor: order.scheduledFor
            ? new Date(order.scheduledFor).toISOString()
            : undefined,
          paymentMethod: data.paymentMethod,
          changeFor,
        });
        return;
      }

      if (
        data.paymentMethod === "MERCADO_PAGO" ||
        data.paymentMethod === "INFINITEPAY"
      ) {
        const orderSummary = products
          .map((product) => `${String(product.quantity)}x ${product.name}`)
          .join(", ")
          .slice(0, 240);

        const result = await criarCheckoutOnline({
          gateway: data.paymentMethod,
          orderId: Number(order.id),
          orderTotal: Number(order.total),
          orderSummary,
          slug,
          consumptionMethod,
          phone: data.phone,
          infinitePayHandle: restaurant.infinitePayHandle,
          mercadoPagoAccessToken: restaurant.mercadoPagoAccessToken,
        });

        if (result.isFree || !result.initPoint) {
          abandonedCartSessionIdRef.current = createAbandonedCartSessionId();
          clearCart();
          setPedidoOfflineConcluido({
            orderId: Number(order.id),
            phone: data.phone,
            total: 0,
            scheduledFor: order.scheduledFor
              ? new Date(order.scheduledFor).toISOString()
              : undefined,
            paymentMethod: data.paymentMethod,
            changeFor,
          });
          return;
        }

        abandonedCartSessionIdRef.current = createAbandonedCartSessionId();
        clearCart();
        window.location.assign(result.initPoint);
        return;
      }

      abandonedCartSessionIdRef.current = createAbandonedCartSessionId();
      clearCart();
      setPedidoOfflineConcluido({
        orderId: Number(order.id),
        phone: data.phone,
        total: Number(order.total),
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
            pixKey={restaurant.pixKey}
            pixMode={restaurant.pixMode ?? "QRCODE"}
            restaurantName={restaurant.name}
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

                      {(consumptionMethod === "DELIVERY" || allowsScheduling) && (
                        <FulfillmentSection
                          form={form}
                          consumptionMethod={consumptionMethod}
                          schedulingLabel={schedulingLabel}
                          schedulingSlots={schedulingSlots}
                          fulfillmentTiming={fulfillmentTiming}
                          isLoading={isLoading}
                          customerAddresses={customerAddresses}
                          isLoadingAddresses={isLoadingAddresses}
                          allowsScheduling={allowsScheduling}
                        />
                      )}

                      {consumptionMethod === "DINE_IN" && (
                        <TableSection
                          form={form}
                          tables={tables}
                          isLoading={isLoadingTables}
                        />
                      )}

                      {restaurant.isCouponsEnabled && (
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
                      )}

                      <PaymentSection
                        form={form}
                        needsChangeField={needsChangeField}
                        isActionDisabled={isActionDisabled}
                        acceptMercadoPago={allowsOnlinePayment}
                        onlinePaymentGateway={onlinePaymentGateway}
                        acceptPix={restaurant.acceptPix ?? true}
                        pixKey={restaurant.pixKey}
                        pixMode={restaurant.pixMode ?? "QRCODE"}
                        isOrderFree={checkoutSummary.total <= 0}
                      />

                      <OrderSummarySection
                        checkoutSummary={checkoutSummary}
                        isCashbackEnabled={restaurant.isCashbackEnabled}
                        consumptionMethod={consumptionMethod}
                        minimumOrderValue={minOrderValue}
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
                    {allowsScheduling
                      ? "O restaurante está fechado e não aceita pedidos imediatos. Agende para continuar."
                      : "O restaurante está fechado no momento e não está aceitando pedidos."}
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-destructive text-base font-bold shadow-lg shadow-destructive/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  disabled={isLoading || isActionDisabled || isBelowMinimumOrder}
                >
                  {isLoading ? (
                    <Loader2Icon className="animate-spin mr-2 h-4 w-4" />
                  ) : null}
                  {isBelowMinimumOrder
                    ? "Pedido mínimo não atingido"
                    : (paymentMethod === "MERCADO_PAGO" ||
                        paymentMethod === "INFINITEPAY") &&
                      checkoutSummary.total > 0
                    ? "Ir para Pagamento Online"
                    : "Confirmar Pedido"}
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
  pixKey?: string | null;
  pixMode?: "QRCODE" | "MANUAL" | string;
  restaurantName?: string;
  onViewOrders: () => void;
  onClose: () => void;
}

const OrderSuccessView = ({
  pedidoOfflineConcluido,
  pixKey,
  pixMode = "QRCODE",
  restaurantName,
  onViewOrders,
  onClose,
}: OrderSuccessViewProps) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const pixPayload = useMemo(() => {
    if (!pixKey || pedidoOfflineConcluido.total <= 0) return "";
    return gerarPayloadPix({
      chavePix: pixKey,
      nomeRecebedor: restaurantName || "EEYFOOD",
      cidadeRecebedor: "BRASIL",
      valor: pedidoOfflineConcluido.total,
      identificador: pedidoOfflineConcluido.orderId
        ? String(pedidoOfflineConcluido.orderId)
        : "***",
      descricao: `Pedido #${pedidoOfflineConcluido.orderId ?? ""} ${restaurantName ?? ""}`.trim(),
    });
  }, [pixKey, pedidoOfflineConcluido.total, pedidoOfflineConcluido.orderId, restaurantName]);

  const handleCopyPixKey = () => {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey);
    setCopiedKey(true);
    toast.success("Chave Pix copiada!");
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleCopyPixPayload = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopiedPayload(true);
    toast.success("Código Pix Copia e Cola copiado! Cole no app do seu banco.");
    setTimeout(() => setCopiedPayload(false), 3000);
  };

  return (
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
              {pedidoOfflineConcluido.total <= 0
                ? "Pedido 100% coberto por benefícios/desconto. Nenhum pagamento adicional é necessário."
                : pedidoOfflineConcluido.paymentMethod === "DINHEIRO"
                  ? "O pagamento será feito em dinheiro no balcão ou na entrega."
                  : pedidoOfflineConcluido.paymentMethod === "PIX"
                    ? "Pedido registrado com sucesso! Realize a transferência via Pix para prosseguir."
                    : "O pagamento será concluído na maquininha no balcão ou na entrega."}
            </div>

            {pedidoOfflineConcluido.paymentMethod === "PIX" && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white">
                      <QrCodeIcon size={14} />
                    </div>
                    <span>
                      {pixMode === "MANUAL" ? "Chave Pix para Pagamento" : "Pagamento via Pix (QR Code)"}
                    </span>
                  </div>
                  {pixMode === "QRCODE" && (
                    <span className="rounded-full bg-teal-600/10 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                      Valor Exato
                    </span>
                  )}
                </div>

                {pixMode === "QRCODE" ? (
                  pixKey ? (
                    <div className="space-y-3">
                      {/* Valor do Pix */}
                      <div className="rounded-xl bg-white border border-teal-100 p-2.5 text-center shadow-2xs">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Total a Pagar
                        </span>
                        <span className="text-xl font-black text-teal-700 font-display">
                          {formatCurrency(pedidoOfflineConcluido.total)}
                        </span>
                      </div>

                      {/* Imagem do QR Code */}
                      {pixPayload && (
                        <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-teal-200/80 shadow-2xs">
                          <QRCodeSVG
                            value={pixPayload}
                            size={180}
                            level="M"
                            includeMargin={true}
                            className="rounded-xl"
                          />
                          <span className="text-[11px] font-medium text-slate-500 mt-2 text-center">
                            Aponte a câmera do aplicativo do seu banco para o QR Code acima
                          </span>
                        </div>
                      )}

                      {/* Pix Copia e Cola */}
                      {pixPayload && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-teal-950 block">
                            Ou use o Pix Copia e Cola:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              readOnly
                              value={pixPayload}
                              className="flex-1 h-9 px-2.5 text-[11px] font-mono bg-white border border-teal-200 rounded-xl text-slate-700 truncate select-all focus:outline-hidden"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white shrink-0 shadow-xs px-3"
                              onClick={handleCopyPixPayload}
                            >
                              {copiedPayload ? (
                                <>
                                  <CheckIcon size={14} />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <CopyIcon size={14} />
                                  <span>Copiar</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      <p className="text-[11px] text-teal-800 leading-relaxed text-center pt-0.5">
                        O valor já está fixado no código para evitar divergências. Após transferir, o restaurante confirmará seu pedido!
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-teal-800">
                      O pagamento será realizado via Pix diretamente ao entregador na entrega ou no balcão da loja.
                    </p>
                  )
                ) : pixKey ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-teal-200/80 p-2.5 shadow-2xs">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase font-semibold text-slate-400">Chave Pix</p>
                        <p className="text-xs font-mono font-bold text-slate-900 truncate select-all">
                          {pixKey}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-xs shrink-0"
                        onClick={handleCopyPixKey}
                      >
                        {copiedKey ? (
                          <>
                            <CheckIcon size={13} />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <CopyIcon size={13} />
                            <span>Copiar Chave</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-teal-800 leading-tight">
                      Transfira o valor de <strong>{formatCurrency(pedidoOfflineConcluido.total)}</strong> para a chave acima e envie o comprovante ao restaurante.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-teal-800">
                    O pagamento será realizado via Pix diretamente ao entregador na entrega ou no balcão da loja.
                  </p>
                )}
              </div>
            )}

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

            {pedidoOfflineConcluido.paymentMethod === "DINHEIRO" &&
            pedidoOfflineConcluido.changeFor ? (
              <div className="rounded-2xl border bg-muted p-3 text-sm">
                Troco solicitado para:{" "}
                <strong>{formatCurrency(pedidoOfflineConcluido.changeFor)}</strong>
              </div>
            ) : null}
          </div>
        </div>
      </ScrollArea>
    </div>

    <div className="flex flex-col gap-2 p-4 border-t">
      <Button
        className="h-10 w-full rounded-2xl text-sm font-semibold"
        onClick={onViewOrders}
      >
        Acompanhar meus pedidos
      </Button>
      <Button
        className="h-10 w-full rounded-2xl text-slate-500 font-medium text-sm"
        variant="ghost"
        onClick={onClose}
      >
        Fechar
      </Button>
    </div>
  </div>
  );
};

export default FinishOrderSheet;
