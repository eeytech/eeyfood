"use client";

import type { MesaComanda, PaymentMethod, PedidoRecebimento, Waiter } from "@fsw/db";
import {
  BanknoteIcon,
  CheckIcon,
  CreditCardIcon,
  Loader2Icon,
  MicIcon,
  MicOffIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { io } from "socket.io-client";

import {
  abrirMesaAction,
  adicionarItensComandaAction,
  fecharComandaAction,
} from "@/app/(dashboard)/comandas/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProdutoGarcom {
  id: string;
  name: string;
  price: number;
  categoryName: string;
  isActive: boolean;
  trackInventory: boolean;
  stockQuantity: number;
}

interface GarcomMobileProps {
  slug: string;
  restaurantName: string;
  initialTables: MesaComanda[];
  products: ProdutoGarcom[];
  waiters: Waiter[];
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type Screen = "LOGIN" | "MESAS" | "MESA_DETALHE";

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const GarcomMobile = ({
  slug,
  restaurantName,
  initialTables,
  products,
  waiters,
}: GarcomMobileProps) => {
  const [screen, setScreen] = useState<Screen>(waiters.length === 0 ? "MESAS" : "LOGIN");
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [tables, setTables] = useState(initialTables);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [cart, setCart] = useState<{ productId: string; name: string; qty: number; price: number }[]>([]);
  const [openingName, setOpeningName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  // ── Voice recognition ─────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "http://localhost:4000";

  const deferredSearch = useDeferredValue(searchValue);

  const selectedMesa = useMemo(
    () => tables.find((m) => m.table.id === selectedTableId) ?? null,
    [tables, selectedTableId],
  );

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.filter((p) => p.isActive).map((p) => p.categoryName)),
    ).sort();
    return ["TODOS", ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.isActive) return false;
      if (selectedCategory !== "TODOS" && p.categoryName !== selectedCategory) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q);
    });
  }, [deferredSearch, products, selectedCategory]);

  // ── WebSocket sync ─────────────────────────────────────────────────────
  const syncTables = useCallback(async () => {
    const res = await fetch(`/api/comandas/${slug}`, { cache: "no-store" });
    if (!res.ok) return;
    const updated = (await res.json()) as MesaComanda[];
    setTables(updated);
  }, [slug]);

  useEffect(() => {
    const socket = io(websocketUrl, { transports: ["websocket"] });
    const onConnect = () => socket.emit("JOIN_RESTAURANT_ROOM", slug);
    const onEvent = async (payload: { restaurantSlug: string }) => {
      if (payload.restaurantSlug !== slug) return;
      await syncTables();
    };
    socket.on("connect", onConnect);
    socket.on("NEW_ORDER", onEvent);
    socket.on("ORDER_UPDATED", onEvent);
    return () => {
      socket.off("connect", onConnect);
      socket.off("NEW_ORDER", onEvent);
      socket.off("ORDER_UPDATED", onEvent);
      socket.disconnect();
    };
  }, [slug, syncTables, websocketUrl]);

  // ── Voice recognition ──────────────────────────────────────────────────
  const toggleVoice = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setFeedback("Reconhecimento de voz nao suportado neste navegador.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setSearchValue(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // ── Cart helpers ──────────────────────────────────────────────────────
  const addToCart = (product: ProdutoGarcom) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { productId: product.id, name: product.name, qty: 1, price: product.price }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.qty, 0);

  // ── Open table and send items ──────────────────────────────────────────
  const handleOpenAndSend = () => {
    if (!selectedMesa) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        let order: PedidoRecebimento;
        if (selectedMesa.currentOrder) {
          order = await adicionarItensComandaAction({
            slug,
            orderId: selectedMesa.currentOrder.id,
            products: cart.map((i) => ({ id: i.productId, quantity: i.qty })),
          });
        } else {
          order = await abrirMesaAction({
            slug,
            diningTableId: selectedMesa.table.id,
            customerName: openingName,
          });
          if (cart.length > 0) {
            order = await adicionarItensComandaAction({
              slug,
              orderId: order.id,
              products: cart.map((i) => ({ id: i.productId, quantity: i.qty })),
            });
          }
        }
        setTables((prev) =>
          prev.map((m) =>
            m.table.id === selectedTableId ? { ...m, currentOrder: order } : m,
          ),
        );
        setCart([]);
        setOpeningName("");
        setFeedback(`${cartCount} item(s) lancados na ${selectedMesa.table.name}.`);
        setTimeout(() => setFeedback(null), 3000);
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : "Erro ao lancar itens.");
      }
    });
  };

  const handleCloseBill = (method: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">) => {
    if (!selectedMesa?.currentOrder) return;
    startTransition(async () => {
      try {
        await fecharComandaAction({
          slug,
          orderId: selectedMesa.currentOrder!.id,
          paymentMethod: method,
        });
        setTables((prev) =>
          prev.map((m) => (m.table.id === selectedTableId ? { ...m, currentOrder: null } : m)),
        );
        setScreen("MESAS");
        setSelectedTableId(null);
        setFeedback(`Conta da ${selectedMesa.table.name} encerrada.`);
        setTimeout(() => setFeedback(null), 3000);
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : "Erro ao fechar conta.");
      }
    });
  };

  // ── Screens ────────────────────────────────────────────────────────────

  if (screen === "LOGIN" && waiters.length > 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 p-6">
        <div className="text-center text-white">
          <p className="text-sm uppercase tracking-widest text-slate-400">EeyFood</p>
          <h1 className="mt-1 font-display text-2xl font-bold">{restaurantName}</h1>
          <p className="mt-1 text-slate-400">Selecione seu nome para comecar</p>
        </div>

        <div className="w-full max-w-xs space-y-2">
          {waiters.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                setSelectedWaiterId(w.id);
                setScreen("MESAS");
              }}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selectedWaiterId === w.id
                  ? "border-primary bg-primary text-white"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              <p className="font-semibold">{w.name}</p>
              {w.phone && <p className="text-xs text-slate-400">{w.phone}</p>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "MESA_DETALHE" && selectedMesa) {
    const order = selectedMesa.currentOrder;

    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-3 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setScreen("MESAS");
              setCart([]);
            }}
          >
            <XIcon size={18} />
          </Button>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">{selectedMesa.table.name}</p>
            <p className="text-xs text-muted-foreground">
              {order ? `Total: ${formatCurrency(order.total)}` : "Mesa livre"}
            </p>
          </div>
          {cart.length > 0 && (
            <Badge variant="warning">{String(cartCount)} no carrinho</Badge>
          )}
        </header>

        {/* Items already on table */}
        {order && order.orderProducts.length > 0 && (
          <div className="border-b bg-white px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Na mesa
            </p>
            <div className="space-y-1">
              {order.orderProducts.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {String(item.quantity)}× {item.product.name}
                  </span>
                  <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open table name if free */}
        {!order && (
          <div className="border-b bg-white px-4 py-3">
            <Input
              value={openingName}
              onChange={(e) => setOpeningName(e.target.value)}
              placeholder="Nome do cliente (opcional)"
            />
          </div>
        )}

        {/* Product search */}
        <div className="sticky top-[57px] z-10 border-b bg-white px-4 py-2">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar produto..."
              className="pl-9 pr-10"
            />
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${
                isListening
                  ? "bg-rose-100 text-rose-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Pesquisa por voz"
            >
              {isListening ? <MicOffIcon size={16} /> : <MicIcon size={16} />}
            </button>
          </div>
          {isListening && (
            <p className="mt-1 text-center text-xs text-rose-600 animate-pulse">
              Ouvindo... fale o nome do produto
            </p>
          )}

          {/* Category chips */}
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product list */}
        <div className="flex-1 divide-y overflow-y-auto">
          {filteredProducts.map((product) => {
            const cartItem = cart.find((i) => i.productId === product.id);
            const outOfStock = product.trackInventory && product.stockQuantity <= 0;
            return (
              <div
                key={product.id}
                className={`flex items-center gap-3 px-4 py-3 bg-white ${outOfStock ? "opacity-50" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.categoryName}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  {formatCurrency(product.price)}
                </span>
                {cartItem ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => removeFromCart(product.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      <XIcon size={12} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{cartItem.qty}</span>
                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={() => addToCart(product)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      <PlusIcon size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={outOfStock}
                    onClick={() => addToCart(product)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    <PlusIcon size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer: cart summary + actions */}
        {(cart.length > 0 || (order && order.orderProducts.length > 0)) && (
          <footer className="sticky bottom-0 border-t bg-white px-4 py-3 shadow-lg space-y-2">
            {cart.length > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {String(cartCount)} item(s) no carrinho
                  </span>
                  <span className="font-semibold">{formatCurrency(cartTotal)}</span>
                </div>
                <Button
                  className="w-full"
                  disabled={isPending}
                  onClick={handleOpenAndSend}
                >
                  {isPending ? (
                    <Loader2Icon className="animate-spin" size={16} />
                  ) : (
                    <CheckIcon size={16} />
                  )}
                  Lancar na comanda
                </Button>
              </>
            )}

            {order && cart.length === 0 && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleCloseBill("DINHEIRO")}
                >
                  <BanknoteIcon size={14} />
                  Fechar dinheiro
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleCloseBill("CARTAO_PRESENCIAL")}
                >
                  <CreditCardIcon size={14} />
                  Fechar cartao
                </Button>
              </div>
            )}
          </footer>
        )}

        {feedback && (
          <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white shadow-xl">
            {feedback}
          </div>
        )}
      </div>
    );
  }

  // ── MESAS screen ──────────────────────────────────────────────────────
  const occupied = tables.filter((m) => m.currentOrder).length;
  const free = tables.length - occupied;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            {restaurantName}
          </p>
          <h1 className="font-display text-xl font-bold text-white">Salao</h1>
          {selectedWaiterId && (
            <p className="text-xs text-slate-400">
              Garcom: {waiters.find((w) => w.id === selectedWaiterId)?.name}
            </p>
          )}
        </div>
        <div className="flex gap-3 text-center">
          <div>
            <p className="font-display text-xl font-bold text-white">{String(free)}</p>
            <p className="text-xs text-slate-500">livres</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-amber-400">{String(occupied)}</p>
            <p className="text-xs text-slate-500">ocupadas</p>
          </div>
        </div>
      </header>

      {/* Table grid */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {tables.map((mesa) => {
          const isOccupied = !!mesa.currentOrder;
          return (
            <button
              key={mesa.table.id}
              type="button"
              onClick={() => {
                setSelectedTableId(mesa.table.id);
                setScreen("MESA_DETALHE");
                setCart([]);
              }}
              className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-2 transition active:scale-95 ${
                isOccupied
                  ? "border-amber-400/50 bg-amber-950/40 text-amber-200"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              <span className="text-sm font-bold leading-tight">{mesa.table.name}</span>
              {isOccupied ? (
                <span className="mt-1 text-xs opacity-80">
                  {formatCurrency(mesa.currentOrder!.total)}
                </span>
              ) : (
                <span className="mt-1 text-xs opacity-50">{String(mesa.table.seats)} lug.</span>
              )}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-white px-4 py-2 text-sm text-slate-900 shadow-xl">
          {feedback}
        </div>
      )}
    </div>
  );
};

export default GarcomMobile;
