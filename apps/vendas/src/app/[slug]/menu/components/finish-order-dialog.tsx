"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useContext, useState } from "react";
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
import type { ConsumptionMethod, PaymentMethod } from "@/lib/db";

import { createOrder } from "../actions/create-order";
import { criarPreferenciaMercadoPago } from "../actions/criar-preferencia-mercado-pago";
import { CartContext } from "../contexts/cart";
import { isValidCpf, removeCpfPunctuation } from "../helpers/cpf";

const formSchema = z
  .object({
    name: z.string().trim().min(1, {
      message: "O nome é obrigatório.",
    }),
    cpf: z
      .string()
      .trim()
      .min(1, {
        message: "O CPF é obrigatório.",
      })
      .refine((value) => isValidCpf(value), {
        message: "CPF inválido.",
      }),
    paymentMethod: z.enum([
      "MERCADO_PAGO",
      "DINHEIRO",
      "CARTAO_PRESENCIAL",
    ]),
    changeFor: z.string().trim().optional(),
  })
  .superRefine((values, context) => {
    if (values.paymentMethod !== "DINHEIRO" || !values.changeFor) {
      return;
    }

    const parsedValue = Number(values.changeFor.replace(",", "."));

    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["changeFor"],
        message: "Informe um valor de troco válido.",
      });
    }
  });

type FormSchema = z.infer<typeof formSchema>;

interface FinishOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PedidoOfflineConcluido {
  cpf: string;
  paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">;
  changeFor?: number;
}

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
    descricao: "Pagamento no balcão ou na entrega, com troco opcional.",
  },
  {
    value: "CARTAO_PRESENCIAL",
    titulo: "Maquininha no balcão/entrega",
    descricao: "Pagamento presencial com cartão ao receber o pedido.",
  },
];

const FinishOrderDialog = ({ open, onOpenChange }: FinishOrderDialogProps) => {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { products, total, clearCart } = useContext(CartContext);
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [pedidoOfflineConcluido, setPedidoOfflineConcluido] =
    useState<PedidoOfflineConcluido | null>(null);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      cpf: "",
      paymentMethod: "MERCADO_PAGO",
      changeFor: "",
    },
    shouldUnregister: true,
  });

  const paymentMethod = form.watch("paymentMethod");
  const needsChangeField = paymentMethod === "DINHEIRO";

  const consumptionMethod: ConsumptionMethod =
    searchParams.get("consumptionMethod") === "DINE_IN"
      ? "DINE_IN"
      : "TAKEAWAY";

  const handleDrawerOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPedidoOfflineConcluido(null);
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
      `/${slug}/orders?cpf=${removeCpfPunctuation(pedidoOfflineConcluido.cpf)}`,
    );
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
        customerCpf: data.cpf,
        customerName: data.name,
        products,
        slug,
      });

      if (data.paymentMethod === "MERCADO_PAGO") {
        const { initPoint } = await criarPreferenciaMercadoPago({
          products,
          orderId: order.id,
          slug,
          consumptionMethod,
          cpf: data.cpf,
        });

        clearCart();
        window.location.assign(initPoint);
        return;
      }

      clearCart();
      setPedidoOfflineConcluido({
        cpf: data.cpf,
        paymentMethod: data.paymentMethod,
        changeFor,
      });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível finalizar o pedido.", {
        description: "Revise os dados e tente novamente em instantes.",
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
                Seu pedido já foi salvo e a equipe do restaurante foi avisada.
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 p-5">
              <div className="rounded-3xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">
                {pedidoOfflineConcluido.paymentMethod === "DINHEIRO"
                  ? "O pagamento será feito em dinheiro no balcão ou na entrega."
                  : "O pagamento será concluído na maquininha no balcão ou na entrega."}
              </div>

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
                Informe seus dados e escolha como prefere pagar.
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
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seu CPF</FormLabel>
                        <FormControl>
                          <PatternFormat
                            placeholder="Digite seu CPF..."
                            format="###.###.###-##"
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
                                className={`rounded-3xl border px-4 py-3 text-left transition ${field.value === option.value ? "border-primary bg-primary/5" : "border-border bg-background"}`}
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

                  <div className="rounded-3xl border bg-muted/50 p-4 text-sm">
                    Total do pedido: <strong>{formatCurrency(total)}</strong>
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
