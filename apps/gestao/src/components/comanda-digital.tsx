"use client";

import type { MesaComanda, PaymentMethod, PedidoRecebimento } from "@fsw/db";
import {
  ChefHatIcon,
  CreditCardIcon,
  Loader2Icon,
  SearchIcon,
  ShoppingBasketIcon,
  UsersRoundIcon,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { io } from "socket.io-client";

import {
  abrirMesaAction,
  adicionarItensComandaAction,
  fecharComandaAction,
} from "@/app/[slug]/comandas/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ProdutoComanda {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryName: string;
  isActive: boolean;
  trackInventory: boolean;
  stockQuantity: number;
}

interface ComandaDigitalProps {
  slug: string;
  restaurantName: string;
  initialTables: MesaComanda[];
  products: ProdutoComanda[];
}

interface FeedbackState {
  type: "success" | "error";
  message: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDateTime = (value: Date | string) => {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
};

const getMesaStatusVariant = (mesa: MesaComanda) => {
  return mesa.currentOrder ? ("warning" as const) : ("secondary" as const);
};

const getMesaStatusLabel = (mesa: MesaComanda) => {
  return mesa.currentOrder ? "Ocupada" : "Livre";
};

const ComandaDigital = ({
  slug,
  restaurantName,
  initialTables,
  products,
}: ComandaDigitalProps) => {
  const [tables, setTables] = useState(initialTables);
  const [selectedTableId, setSelectedTableId] = useState(
    initialTables[0]?.table.id ?? "",
  );
  const [searchValue, setSearchValue] = useState("");
  const [openingCustomerName, setOpeningCustomerName] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPending, startTransition] = useTransition();

  const deferredSearchValue = useDeferredValue(searchValue);
  const websocketUrl =
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "http://localhost:4000";

  useEffect(() => {
    if (selectedTableId || tables.length === 0) {
      return;
    }

    setSelectedTableId(tables[0].table.id);
  }, [selectedTableId, tables]);

  const syncTables = useCallback(async () => {
    const response = await fetch(`/api/comandas/${slug}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const updatedTables = (await response.json()) as MesaComanda[];
    setTables(updatedTables);
  }, [slug]);

  useEffect(() => {
    const socket = io(websocketUrl, {
      transports: ["websocket"],
    });

    const handleConnect = () => {
      socket.emit("JOIN_RESTAURANT_ROOM", slug);
    };

    const handleOrderEvent = async (payload: { restaurantSlug: string }) => {
      if (payload.restaurantSlug !== slug) {
        return;
      }

      await syncTables();
    };

    socket.on("connect", handleConnect);
    socket.on("NEW_ORDER", handleOrderEvent);
    socket.on("ORDER_UPDATED", handleOrderEvent);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("NEW_ORDER", handleOrderEvent);
      socket.off("ORDER_UPDATED", handleOrderEvent);
      socket.disconnect();
    };
  }, [slug, syncTables, websocketUrl]);

  const selectedMesa = useMemo(() => {
    return tables.find((mesa) => mesa.table.id === selectedTableId) ?? null;
  }, [selectedTableId, tables]);

  const filteredProducts = useMemo(() => {
    const normalizedSearchValue = deferredSearchValue.trim().toLowerCase();

    return products.filter((product) => {
      if (!product.isActive) {
        return false;
      }

      if (!normalizedSearchValue) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(normalizedSearchValue) ||
        product.categoryName.toLowerCase().includes(normalizedSearchValue) ||
        product.description.toLowerCase().includes(normalizedSearchValue)
      );
    });
  }, [deferredSearchValue, products]);

  const occupiedTables = tables.filter((mesa) => mesa.currentOrder).length;
  const freeTables = tables.length - occupiedTables;
  const selectedOrderItemsCount =
    selectedMesa?.currentOrder?.orderProducts.reduce((accumulator, item) => {
      return accumulator + item.quantity;
    }, 0) ?? 0;

  const updateMesaOrder = (updatedOrder: PedidoRecebimento) => {
    setTables((currentTables) =>
      currentTables.map((mesa) =>
        mesa.table.id === updatedOrder.diningTable?.id
          ? {
              ...mesa,
              currentOrder:
                updatedOrder.status === "FINISHED" || updatedOrder.status === "CANCELLED"
                  ? null
                  : updatedOrder,
            }
          : mesa,
      ),
    );
  };

  const handleOpenTable = () => {
    if (!selectedMesa) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const order = await abrirMesaAction({
          slug,
          diningTableId: selectedMesa.table.id,
          customerName: openingCustomerName,
        });

        updateMesaOrder(order);
        setOpeningCustomerName("");
        setFeedback({
          type: "success",
          message: `Mesa ${selectedMesa.table.name} aberta com sucesso.`,
        });
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Nao foi possivel abrir a mesa.",
        });
      }
    });
  };

  const handleAddProduct = (productId: string) => {
    if (!selectedMesa?.currentOrder) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const order = await adicionarItensComandaAction({
          slug,
          orderId: selectedMesa.currentOrder!.id,
          products: [
            {
              id: productId,
              quantity: 1,
            },
          ],
        });

        updateMesaOrder(order);
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Nao foi possivel lancar o item na comanda.",
        });
      }
    });
  };

  const handleCloseBill = (
    paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">,
  ) => {
    if (!selectedMesa?.currentOrder) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const order = await fecharComandaAction({
          slug,
          orderId: selectedMesa.currentOrder!.id,
          paymentMethod,
        });

        updateMesaOrder(order);
        setFeedback({
          type: "success",
          message: `Conta da ${selectedMesa.table.name} encerrada em ${formatCurrency(order.total)}.`,
        });
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Nao foi possivel fechar a conta da mesa.",
        });
      }
    });
  };

  return (
    <section className="space-y-4">
      <Card className="border-white/80 bg-white/85">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="w-fit" variant="secondary">
              Comanda digital
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">
              Salao de {restaurantName}
            </CardTitle>
            <CardDescription>
              Abra mesas, lance itens em tempo real e acompanhe o status da conta
              em qualquer dispositivo.
            </CardDescription>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="bg-white">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Mesas livres
                </p>
                <p className="mt-2 font-display text-3xl">{String(freeTables)}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-950 text-white">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Mesas ocupadas
                </p>
                <p className="mt-2 font-display text-3xl">
                  {String(occupiedTables)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">
                  Itens na mesa
                </p>
                <p className="mt-2 font-display text-3xl">
                  {String(selectedOrderItemsCount)}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="xl:sticky xl:top-4 xl:self-start">
          <CardHeader>
            <CardTitle>Mesas</CardTitle>
            <CardDescription>
              Toque em uma mesa para abrir ou operar a comanda.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
            {tables.map((mesa) => (
              <button
                key={mesa.table.id}
                type="button"
                onClick={() => setSelectedTableId(mesa.table.id)}
                className={`rounded-[24px] border p-4 text-left transition ${
                  selectedTableId === mesa.table.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{mesa.table.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {String(mesa.table.seats)} lugares
                    </p>
                  </div>
                  <Badge variant={getMesaStatusVariant(mesa)}>
                    {getMesaStatusLabel(mesa)}
                  </Badge>
                </div>
                {mesa.currentOrder ? (
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    Conta atual: {formatCurrency(mesa.currentOrder.total)}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Pronta para abrir
                  </p>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedMesa ? (
            <>
              <Card className="border-white/80 bg-slate-950 text-white">
                <CardHeader>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <Badge variant="secondary" className="w-fit bg-white/10 text-white">
                        {selectedMesa.currentOrder ? "Mesa em atendimento" : "Mesa livre"}
                      </Badge>
                      <CardTitle className="mt-3 font-display text-3xl">
                        {selectedMesa.table.name}
                      </CardTitle>
                      <CardDescription className="text-slate-300">
                        {selectedMesa.currentOrder
                          ? `Comanda aberta em ${formatDateTime(selectedMesa.currentOrder.createdAt)}`
                          : "Abra a mesa para comecar a lancar itens."}
                      </CardDescription>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Status da conta
                        </p>
                        <p className="mt-2 font-medium text-white">
                          {selectedMesa.currentOrder ? "Em aberto" : "Aguardando abertura"}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Total atual
                        </p>
                        <p className="mt-2 font-display text-3xl font-semibold">
                          {formatCurrency(selectedMesa.currentOrder?.total ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {!selectedMesa.currentOrder ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Abrir mesa</CardTitle>
                    <CardDescription>
                      Registre um nome de referencia opcional e inicie a comanda.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="max-w-md">
                      <label className="mb-2 block text-sm font-medium">
                        Nome do cliente ou referencia
                      </label>
                      <Input
                        value={openingCustomerName}
                        onChange={(event) => setOpeningCustomerName(event.target.value)}
                        placeholder="Ex.: Ana, familia Silva, aniversario"
                      />
                    </div>

                    <Button disabled={isPending} onClick={handleOpenTable}>
                      {isPending ? (
                        <>
                          <Loader2Icon className="animate-spin" size={16} />
                          Abrindo mesa...
                        </>
                      ) : (
                        "Abrir comanda"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Lancar itens</CardTitle>
                        <CardDescription>
                          Toque para enviar os itens da mesa direto para a comanda.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="relative">
                          <SearchIcon
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                            size={18}
                          />
                          <Input
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                            placeholder="Buscar produto para a mesa..."
                            className="pl-11"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {filteredProducts.map((product) => (
                            <Card
                              key={product.id}
                              className="border-white/80 bg-white/95 transition hover:-translate-y-0.5 hover:shadow-xl"
                            >
                              <CardHeader className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <Badge variant="secondary">
                                      {product.categoryName}
                                    </Badge>
                                    <CardTitle className="mt-3 text-xl">
                                      {product.name}
                                    </CardTitle>
                                  </div>
                                  <ChefHatIcon className="text-primary" size={18} />
                                </div>
                                <CardDescription className="line-clamp-3 min-h-[60px] leading-6">
                                  {product.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <p className="font-display text-2xl font-semibold">
                                    {formatCurrency(product.price)}
                                  </p>
                                  <Badge
                                    variant={
                                      product.trackInventory
                                        ? product.stockQuantity > 0
                                          ? "success"
                                          : "danger"
                                        : "secondary"
                                    }
                                  >
                                    {product.trackInventory
                                      ? `Estoque ${String(product.stockQuantity)}`
                                      : "Sem controle"}
                                  </Badge>
                                </div>

                                <Button
                                  className="w-full"
                                  disabled={
                                    isPending ||
                                    (product.trackInventory && product.stockQuantity <= 0)
                                  }
                                  onClick={() => handleAddProduct(product.id)}
                                >
                                  Adicionar na comanda
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Conta da mesa</CardTitle>
                        <CardDescription>
                          Acompanhe itens lancados e finalize quando necessario.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="rounded-[24px] border bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Cliente
                          </p>
                          <p className="mt-2 font-medium text-slate-950">
                            {selectedMesa.currentOrder.customerName}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {selectedMesa.currentOrder.orderProducts.length === 0 ? (
                            <div className="rounded-[24px] border border-dashed bg-slate-50 px-5 py-10 text-center">
                              <p className="font-medium text-slate-900">
                                Nenhum item lancado ainda
                              </p>
                              <p className="mt-2 text-sm text-muted-foreground">
                                Use a busca ao lado para comecar a comanda.
                              </p>
                            </div>
                          ) : (
                            selectedMesa.currentOrder.orderProducts.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-[24px] border bg-slate-50/80 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-slate-950">
                                      {item.product.name}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {String(item.quantity)} x {formatCurrency(item.price)}
                                    </p>
                                  </div>
                                  <p className="font-semibold text-slate-950">
                                    {formatCurrency(item.lineTotal)}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="rounded-[24px] border bg-slate-950 p-5 text-white">
                          <div className="flex items-center justify-between text-sm text-slate-300">
                            <span>Itens lancados</span>
                            <span>{String(selectedOrderItemsCount)} unidades</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="font-medium">Total da conta</span>
                            <span className="font-display text-3xl font-semibold">
                              {formatCurrency(selectedMesa.currentOrder.total)}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Button
                            disabled={isPending}
                            onClick={() => handleCloseBill("DINHEIRO")}
                          >
                            <CreditCardIcon size={16} />
                            Fechar em dinheiro
                          </Button>
                          <Button
                            disabled={isPending}
                            variant="outline"
                            onClick={() => handleCloseBill("CARTAO_PRESENCIAL")}
                          >
                            <ShoppingBasketIcon size={16} />
                            Fechar no cartao
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
                <UsersRoundIcon className="text-slate-400" size={28} />
                <p className="font-medium text-slate-900">
                  Nenhuma mesa cadastrada
                </p>
                <p className="text-sm text-muted-foreground">
                  Cadastre mesas no banco para comecar a operar a comanda digital.
                </p>
              </CardContent>
            </Card>
          )}

          {feedback ? (
            <div
              className={`rounded-[24px] border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default ComandaDigital;
