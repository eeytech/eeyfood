"use client";

import type { MesaComanda, PaymentMethod, PedidoRecebimento } from "@fsw/db";
import {
  ArrowLeftRightIcon,
  BanknoteIcon,
  CreditCardIcon,
  Loader2Icon,
  PlusIcon,
  ScissorsIcon,
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
  buscarPagamentosParciaisAction,
  fecharComandaAction,
  registrarPagamentoParcialAction,
  transferirMesaAction,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type TableFilter = "TODAS" | "LIVRES" | "OCUPADAS";

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
  // ── Table state ────────────────────────────────────────────────────────
  const [tables, setTables] = useState(initialTables);
  const [selectedTableId, setSelectedTableId] = useState(
    initialTables[0]?.table.id ?? "",
  );
  const [tableFilter, setTableFilter] = useState<TableFilter>("TODAS");

  // ── Product search ─────────────────────────────────────────────────────
  const [selectedProductCategory, setSelectedProductCategory] =
    useState("TODOS");
  const [searchValue, setSearchValue] = useState("");

  // ── Opening ────────────────────────────────────────────────────────────
  const [openingCustomerName, setOpeningCustomerName] = useState("");

  // ── Feedback ───────────────────────────────────────────────────────────
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Transfer dialog ────────────────────────────────────────────────────
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [targetTableId, setTargetTableId] = useState("");

  // ── Division / partial payment ─────────────────────────────────────────
  const [divisaoPessoas, setDivisaoPessoas] = useState(1);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set<string>());
  const [paidAmount, setPaidAmount] = useState(0);

  const deferredSearchValue = useDeferredValue(searchValue);
  const websocketUrl =
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "http://localhost:4000";

  // ── Derived state (declared before effects that depend on them) ────────
  const selectedMesa = useMemo(() => {
    return tables.find((mesa) => mesa.table.id === selectedTableId) ?? null;
  }, [selectedTableId, tables]);

  const occupiedTables = tables.filter((mesa) => mesa.currentOrder).length;
  const freeTables = tables.length - occupiedTables;

  const displayedTables = useMemo(() => {
    if (tableFilter === "LIVRES") return tables.filter((m) => !m.currentOrder);
    if (tableFilter === "OCUPADAS")
      return tables.filter((m) => m.currentOrder);
    return tables;
  }, [tables, tableFilter]);

  const productCategories = useMemo(() => {
    const cats = Array.from(
      new Set(products.filter((p) => p.isActive).map((p) => p.categoryName)),
    ).sort();
    return ["TODOS", ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearchValue = deferredSearchValue.trim().toLowerCase();

    return products.filter((product) => {
      if (!product.isActive) return false;
      if (
        selectedProductCategory !== "TODOS" &&
        product.categoryName !== selectedProductCategory
      )
        return false;
      if (!normalizedSearchValue) return true;
      return (
        product.name.toLowerCase().includes(normalizedSearchValue) ||
        product.categoryName.toLowerCase().includes(normalizedSearchValue) ||
        product.description.toLowerCase().includes(normalizedSearchValue)
      );
    });
  }, [deferredSearchValue, products, selectedProductCategory]);

  const selectedOrderItemsCount =
    selectedMesa?.currentOrder?.orderProducts.reduce((accumulator, item) => {
      return accumulator + item.quantity;
    }, 0) ?? 0;

  const transferTargetTables = useMemo(
    () =>
      tables.filter(
        (m) => !m.currentOrder && m.table.id !== selectedMesa?.table.id,
      ),
    [tables, selectedMesa?.table.id],
  );

  const orderTotal = selectedMesa?.currentOrder?.total ?? 0;
  const remainingAmount = Math.max(
    Number((orderTotal - paidAmount).toFixed(2)),
    0,
  );

  const selectedItemsTotal = useMemo(
    () =>
      selectedMesa?.currentOrder?.orderProducts
        .filter((item) => selectedItemIds.has(item.id))
        .reduce((acc, item) => acc + item.lineTotal, 0) ?? 0,
    [selectedMesa?.currentOrder?.orderProducts, selectedItemIds],
  );

  const valorPorPessoa =
    divisaoPessoas > 0
      ? Number((remainingAmount / divisaoPessoas).toFixed(2))
      : remainingAmount;

  // ── Auto-select first table ────────────────────────────────────────────
  useEffect(() => {
    if (selectedTableId || tables.length === 0) {
      return;
    }
    setSelectedTableId(tables[0].table.id);
  }, [selectedTableId, tables]);

  // ── Load existing partial payments when active order changes ───────────
  const activeOrderId = selectedMesa?.currentOrder?.id;

  useEffect(() => {
    setSelectedItemIds(new Set());
    setDivisaoPessoas(1);

    if (!activeOrderId) {
      setPaidAmount(0);
      return;
    }

    let cancelled = false;
    void buscarPagamentosParciaisAction(activeOrderId).then(({ totalPago }) => {
      if (!cancelled) setPaidAmount(totalPago);
    });
    return () => {
      cancelled = true;
    };
  }, [activeOrderId]);

  // ── WebSocket sync ─────────────────────────────────────────────────────
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

  // ── Local optimistic update helper ─────────────────────────────────────
  const updateMesaOrder = (updatedOrder: PedidoRecebimento) => {
    setTables((currentTables) =>
      currentTables.map((mesa) =>
        mesa.table.id === updatedOrder.diningTable?.id
          ? {
              ...mesa,
              currentOrder:
                updatedOrder.status === "FINISHED" ||
                updatedOrder.status === "CANCELLED"
                  ? null
                  : updatedOrder,
            }
          : mesa,
      ),
    );
  };

  const toggleSelectedItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // ── Action handlers ────────────────────────────────────────────────────
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
        setPaidAmount(0);
        setSelectedItemIds(new Set());
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

  const handleTransferirMesa = () => {
    if (!selectedMesa?.currentOrder || !targetTableId) return;
    setFeedback(null);

    const orderId = selectedMesa.currentOrder.id;
    const oldTableId = selectedMesa.table.id;
    const newTableId = targetTableId;
    const newTableName =
      tables.find((m) => m.table.id === newTableId)?.table.name ?? "nova mesa";

    startTransition(async () => {
      try {
        const updatedOrder = await transferirMesaAction({
          slug,
          orderId,
          novoTableId: newTableId,
        });

        setTables((currentTables) =>
          currentTables.map((mesa) => {
            if (mesa.table.id === oldTableId)
              return { ...mesa, currentOrder: null };
            if (mesa.table.id === newTableId)
              return { ...mesa, currentOrder: updatedOrder };
            return mesa;
          }),
        );
        setSelectedTableId(newTableId);
        setIsTransferOpen(false);
        setTargetTableId("");
        setFeedback({
          type: "success",
          message: `Comanda transferida para ${newTableName} com sucesso.`,
        });
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Nao foi possivel transferir a comanda.",
        });
      }
    });
  };

  const handlePagamentoParcial = (
    paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">,
  ) => {
    if (!selectedMesa?.currentOrder || selectedItemsTotal <= 0) return;
    setFeedback(null);

    const orderId = selectedMesa.currentOrder.id;
    const amount = Number(selectedItemsTotal.toFixed(2));

    startTransition(async () => {
      try {
        const result = await registrarPagamentoParcialAction({
          slug,
          orderId,
          amount,
          paymentMethod,
        });

        setPaidAmount((prev) => Number((prev + result.amountPaid).toFixed(2)));
        setSelectedItemIds(new Set());
        setFeedback({
          type: "success",
          message: `Pagamento parcial de ${formatCurrency(result.amountPaid)} registrado.`,
        });
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Nao foi possivel registrar o pagamento parcial.",
        });
      }
    });
  };

  return (
    <section className="space-y-4">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <Card className="border-white/80 bg-white/85">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="w-fit" variant="secondary">
              Comanda digital
            </Badge>
            <CardTitle className="mt-2 font-display text-xl">
              Salao de {restaurantName}
            </CardTitle>
            <CardDescription>
              Abra mesas, lance itens em tempo real e acompanhe o status da
              conta em qualquer dispositivo.
            </CardDescription>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Card className="bg-white">
              <CardContent className="p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Mesas livres
                </p>
                <p className="mt-1 font-display text-xl">
                  {String(freeTables)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-950 text-white">
              <CardContent className="p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Mesas ocupadas
                </p>
                <p className="mt-1 font-display text-xl">
                  {String(occupiedTables)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50">
              <CardContent className="p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">
                  Itens na mesa
                </p>
                <p className="mt-1 font-display text-xl">
                  {String(selectedOrderItemsCount)}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* ── Table list sidebar ──────────────────────────────────────── */}
        <Card className="xl:sticky xl:top-4 xl:self-start">
          <CardHeader className="pb-3">
            <CardTitle>Mesas</CardTitle>
            <CardDescription>
              Toque em uma mesa para abrir ou operar a comanda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs
              value={tableFilter}
              onValueChange={(v) => setTableFilter(v as TableFilter)}
            >
              <TabsList className="w-full">
                <TabsTrigger value="TODAS" className="flex-1 text-xs">
                  Todas ({String(tables.length)})
                </TabsTrigger>
                <TabsTrigger value="LIVRES" className="flex-1 text-xs">
                  Livres ({String(freeTables)})
                </TabsTrigger>
                <TabsTrigger value="OCUPADAS" className="flex-1 text-xs">
                  Ocupadas ({String(occupiedTables)})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-2 gap-2">
              {displayedTables.map((mesa) => (
                <button
                  key={mesa.table.id}
                  type="button"
                  onClick={() => setSelectedTableId(mesa.table.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    selectedTableId === mesa.table.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {mesa.table.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {String(mesa.table.seats)} lugares
                      </p>
                    </div>
                    <Badge
                      variant={getMesaStatusVariant(mesa)}
                      className="shrink-0 text-xs"
                    >
                      {getMesaStatusLabel(mesa)}
                    </Badge>
                  </div>
                  {mesa.currentOrder ? (
                    <p className="mt-2 text-xs font-medium text-slate-900">
                      {formatCurrency(mesa.currentOrder.total)}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Pronta para abrir
                    </p>
                  )}
                </button>
              ))}

              {displayedTables.length === 0 && (
                <div className="col-span-2 rounded-xl border border-dashed py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma mesa neste filtro.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Main panel ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {selectedMesa ? (
            <>
              {/* Selected table header card */}
              <Card className="border-white/80 bg-slate-950 text-white">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <Badge
                        variant="secondary"
                        className="w-fit bg-white/10 text-white"
                      >
                        {selectedMesa.currentOrder
                          ? "Mesa em atendimento"
                          : "Mesa livre"}
                      </Badge>
                      <CardTitle className="mt-2 font-display text-xl">
                        {selectedMesa.table.name}
                      </CardTitle>
                      <CardDescription className="text-slate-300">
                        {selectedMesa.currentOrder
                          ? `Comanda aberta em ${formatDateTime(selectedMesa.currentOrder.createdAt)}`
                          : "Abra a mesa para comecar a lancar itens."}
                      </CardDescription>

                      {selectedMesa.currentOrder && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                          onClick={() => {
                            setTargetTableId("");
                            setIsTransferOpen(true);
                          }}
                          disabled={isPending}
                        >
                          <ArrowLeftRightIcon size={13} />
                          Transferir mesa
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Status da conta
                        </p>
                        <p className="mt-1.5 text-sm font-medium text-white">
                          {selectedMesa.currentOrder
                            ? "Em aberto"
                            : "Aguardando abertura"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Total atual
                        </p>
                        <p className="mt-1 font-display text-xl font-semibold">
                          {formatCurrency(
                            selectedMesa.currentOrder?.total ?? 0,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {!selectedMesa.currentOrder ? (
                /* Open table form */
                <Card>
                  <CardHeader>
                    <CardTitle>Abrir mesa</CardTitle>
                    <CardDescription>
                      Registre um nome de referencia opcional e inicie a
                      comanda.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="max-w-md">
                      <label className="mb-2 block text-sm font-medium">
                        Nome do cliente ou referencia
                      </label>
                      <Input
                        value={openingCustomerName}
                        onChange={(event) =>
                          setOpeningCustomerName(event.target.value)
                        }
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
                /* Active order panels */
                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
                  {/* Product launcher */}
                  <div className="space-y-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Lancar itens</CardTitle>
                        <CardDescription>
                          Toque para enviar os itens da mesa direto para a
                          comanda.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="relative">
                          <SearchIcon
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                            size={18}
                          />
                          <Input
                            value={searchValue}
                            onChange={(event) =>
                              setSearchValue(event.target.value)
                            }
                            placeholder="Buscar produto para a mesa..."
                            className="pl-11"
                          />
                        </div>

                        <Tabs
                          value={selectedProductCategory}
                          onValueChange={setSelectedProductCategory}
                        >
                          <TabsList className="h-auto flex-wrap gap-1 bg-muted/60 p-1">
                            {productCategories.map((cat) => (
                              <TabsTrigger
                                key={cat}
                                value={cat}
                                className="text-xs"
                              >
                                {cat}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>

                        {filteredProducts.length === 0 ? (
                          <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-5 text-center">
                            <p className="text-sm font-medium text-slate-900">
                              Nenhum produto encontrado
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Ajuste a busca ou categoria.
                            </p>
                          </div>
                        ) : (
                          <Card className="overflow-hidden">
                            <div className="divide-y">
                              {filteredProducts.map((product) => (
                                <div
                                  key={product.id}
                                  className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50/80"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                      {product.name}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      product.trackInventory
                                        ? product.stockQuantity > 0
                                          ? "success"
                                          : "danger"
                                        : "secondary"
                                    }
                                    className="shrink-0 text-xs"
                                  >
                                    {product.trackInventory
                                      ? `Est. ${String(product.stockQuantity)}`
                                      : "Livre"}
                                  </Badge>
                                  <p className="w-20 shrink-0 text-right font-display text-sm font-semibold">
                                    {formatCurrency(product.price)}
                                  </p>
                                  <Button
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    disabled={
                                      isPending ||
                                      (product.trackInventory &&
                                        product.stockQuantity <= 0)
                                    }
                                    onClick={() => handleAddProduct(product.id)}
                                  >
                                    <PlusIcon size={14} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bill panel */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Conta da mesa</CardTitle>
                        <CardDescription>
                          Acompanhe itens lancados e finalize quando necessario.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Customer */}
                        <div className="rounded-lg border bg-slate-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Cliente
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-slate-950">
                            {selectedMesa.currentOrder.customerName}
                          </p>
                        </div>

                        {/* Item list with checkboxes for partial payment */}
                        <div className="space-y-1.5">
                          {selectedMesa.currentOrder.orderProducts.length ===
                          0 ? (
                            <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-5 text-center">
                              <p className="text-sm font-medium text-slate-900">
                                Nenhum item lancado ainda
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Use a busca ao lado para comecar a comanda.
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-muted-foreground">
                                Marque itens para divisao parcial
                              </p>
                              {selectedMesa.currentOrder.orderProducts.map(
                                (item) => (
                                  <div
                                    key={item.id}
                                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition ${
                                      selectedItemIds.has(item.id)
                                        ? "border-amber-300 bg-amber-50"
                                        : "border-border bg-slate-50/80"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedItemIds.has(item.id)}
                                      onChange={() =>
                                        toggleSelectedItem(item.id)
                                      }
                                      disabled={isPending}
                                      className="h-4 w-4 shrink-0 cursor-pointer rounded accent-amber-500"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-slate-950">
                                        {item.product.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {String(item.quantity)} ×{" "}
                                        {formatCurrency(item.price)}
                                      </p>
                                      {item.notes && (
                                        <p className="mt-0.5 text-xs italic text-amber-600/80">
                                          {item.notes}
                                        </p>
                                      )}
                                    </div>
                                    <p className="shrink-0 text-sm font-semibold text-slate-950">
                                      {formatCurrency(item.lineTotal)}
                                    </p>
                                  </div>
                                ),
                              )}
                            </>
                          )}
                        </div>

                        {/* Total block */}
                        <div className="rounded-xl border bg-slate-950 p-3 text-white">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Itens lancados</span>
                            <span>
                              {String(selectedOrderItemsCount)} unidades
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Total da conta
                            </span>
                            <span className="font-display text-xl font-semibold">
                              {formatCurrency(selectedMesa.currentOrder.total)}
                            </span>
                          </div>
                        </div>

                        {/* ── Division section ──────────────────────── */}
                        {selectedMesa.currentOrder.orderProducts.length >
                          0 && (
                          <div className="space-y-3 rounded-xl border p-3">
                            <div className="flex items-center gap-1.5">
                              <ScissorsIcon
                                size={13}
                                className="text-muted-foreground"
                              />
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Opcoes de divisao
                              </p>
                            </div>

                            {/* A) Division by people */}
                            <div>
                              <label className="mb-1.5 block text-xs font-medium">
                                Dividir por pessoas
                              </label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={divisaoPessoas}
                                  onChange={(e) =>
                                    setDivisaoPessoas(
                                      Math.max(1, Number(e.target.value) || 1),
                                    )
                                  }
                                  className="h-8 w-20 text-center"
                                />
                                <span className="text-xs text-muted-foreground">
                                  pessoas
                                </span>
                                <span className="ml-auto text-sm font-semibold text-slate-900">
                                  {formatCurrency(valorPorPessoa)} / pessoa
                                </span>
                              </div>
                            </div>

                            {/* B) Partial by selected items */}
                            {selectedItemIds.size > 0 ? (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-amber-800">
                                    {selectedItemIds.size} item(s)
                                    selecionado(s)
                                  </span>
                                  <span className="text-sm font-semibold text-amber-900">
                                    {formatCurrency(selectedItemsTotal)}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-amber-700">
                                  Registra pagamento parcial sem encerrar a
                                  comanda.
                                </p>
                                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                  <Button
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() =>
                                      handlePagamentoParcial("DINHEIRO")
                                    }
                                    className="gap-1.5"
                                  >
                                    <BanknoteIcon size={13} />
                                    Parcial dinheiro
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isPending}
                                    onClick={() =>
                                      handlePagamentoParcial(
                                        "CARTAO_PRESENCIAL",
                                      )
                                    }
                                    className="gap-1.5"
                                  >
                                    <CreditCardIcon size={13} />
                                    Parcial cartao
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Marque itens acima para registrar um pagamento
                                parcial.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Already paid / remaining balance */}
                        {paidAmount > 0 && (
                          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                            <div>
                              <p className="text-xs font-medium text-emerald-800">
                                Ja pago
                              </p>
                              <p className="font-display text-base font-semibold text-emerald-700">
                                {formatCurrency(paidAmount)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-slate-700">
                                Saldo restante a pagar
                              </p>
                              <p className="font-display text-lg font-semibold text-slate-900">
                                {formatCurrency(remainingAmount)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Payment buttons (unchanged) */}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            disabled={isPending}
                            onClick={() => handleCloseBill("DINHEIRO")}
                          >
                            <CreditCardIcon size={15} />
                            Fechar em dinheiro
                          </Button>
                          <Button
                            disabled={isPending}
                            variant="outline"
                            onClick={() =>
                              handleCloseBill("CARTAO_PRESENCIAL")
                            }
                          >
                            <ShoppingBasketIcon size={15} />
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
                  Cadastre mesas no banco para comecar a operar a comanda
                  digital.
                </p>
              </CardContent>
            </Card>
          )}

          {feedback ? (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
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

      {/* ── Transfer dialog ──────────────────────────────────────────────── */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transferir mesa</DialogTitle>
            <DialogDescription>
              Selecione a mesa de destino. Apenas mesas livres estao
              disponiveis.
            </DialogDescription>
          </DialogHeader>

          {transferTargetTables.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma mesa livre disponivel para transferencia no momento.
            </p>
          ) : (
            <Select value={targetTableId} onValueChange={setTargetTableId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a mesa destino..." />
              </SelectTrigger>
              <SelectContent>
                {transferTargetTables.map((mesa) => (
                  <SelectItem key={mesa.table.id} value={mesa.table.id}>
                    {mesa.table.name} — {String(mesa.table.seats)} lugares
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransferOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransferirMesa}
              disabled={
                !targetTableId ||
                isPending ||
                transferTargetTables.length === 0
              }
            >
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" size={14} />
                  Transferindo...
                </>
              ) : (
                "Confirmar transferencia"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ComandaDigital;
