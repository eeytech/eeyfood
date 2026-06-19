"use client";

import {
  BanknoteIcon,
  CreditCardIcon,
  InfoIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { useDeferredValue, useMemo, useState, useTransition } from "react";

import { finalizarVendaPdv } from "@/app/[slug]/pdv/actions";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PdvProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryName: string;
  isActive: boolean;
  trackInventory: boolean;
  stockQuantity: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PdvFrenteCaixaProps {
  slug: string;
  restaurantName: string;
  products: PdvProduct[];
}

type PaymentMethod = "DINHEIRO" | "CARTAO_PRESENCIAL";

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

const PdvFrenteCaixa = ({
  slug,
  restaurantName,
  products,
}: PdvFrenteCaixaProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("DINHEIRO");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPending, startTransition] = useTransition();

  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearchValue = deferredSearchValue.trim().toLowerCase();

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.filter((p) => p.isActive).map((p) => p.categoryName)),
    ).sort();
    return ["TODOS", ...cats];
  }, [products]);

  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false;
    if (
      selectedCategory !== "TODOS" &&
      product.categoryName !== selectedCategory
    )
      return false;
    if (!normalizedSearchValue) return true;
    return (
      product.name.toLowerCase().includes(normalizedSearchValue) ||
      product.categoryName.toLowerCase().includes(normalizedSearchValue) ||
      product.description.toLowerCase().includes(normalizedSearchValue)
    );
  });

  const totalItems = cartItems.reduce((accumulator, item) => {
    return accumulator + item.quantity;
  }, 0);

  const total = cartItems.reduce((accumulator, item) => {
    return accumulator + item.price * item.quantity;
  }, 0);

  const addProduct = (product: PdvProduct) => {
    setFeedback(null);
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (!existingItem) {
        return [
          ...currentItems,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
          },
        ];
      }

      if (
        product.trackInventory &&
        existingItem.quantity >= product.stockQuantity
      ) {
        return currentItems;
      }

      return currentItems.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  };

  const decreaseProduct = (productId: string) => {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const increaseProduct = (productId: string) => {
    const product = products.find(
      (currentProduct) => currentProduct.id === productId,
    );

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId
          ? product?.trackInventory && item.quantity >= product.stockQuantity
            ? item
            : { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    );
  };

  const getAvailableStockLabel = (product: PdvProduct) => {
    if (!product.trackInventory) return "Sem controle";
    return `Estoque ${String(product.stockQuantity)}`;
  };

  const getAvailableStockVariant = (product: PdvProduct) => {
    if (!product.trackInventory) return "secondary" as const;
    return product.stockQuantity > 0 ? ("success" as const) : ("danger" as const);
  };

  const removeProduct = (productId: string) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.id !== productId),
    );
  };

  const clearSale = () => {
    setCartItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("DINHEIRO");
  };

  const handleFinishSale = () => {
    setFeedback(null);

    startTransition(async () => {
      const result = await finalizarVendaPdv({
        slug,
        customerName,
        customerPhone,
        paymentMethod,
        products: cartItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      });

      if (!result.success) {
        setFeedback({ type: "error", message: result.message });
        return;
      }

      clearSale();
      setFeedback({
        type: "success",
        message: `${result.message} Pedido #${String(result.orderId)} fechado em ${formatCurrency(result.total ?? 0)}.`,
      });
    });
  };

  return (
    <section className="space-y-4">
      <Card className="border-white/80 bg-white/85">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="w-fit" variant="secondary">
              Frente de caixa
            </Badge>
            <CardTitle className="mt-2 font-display text-xl">
              PDV de {restaurantName}
            </CardTitle>
            <CardDescription>
              Venda presencial de balcao com busca rapida de itens e fechamento
              imediato.
            </CardDescription>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Card className="bg-slate-950 text-white">
              <CardContent className="p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Itens
                </p>
                <p className="mt-1 font-display text-xl">{String(totalItems)}</p>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Total
                </p>
                <p className="mt-1 font-display text-xl">
                  {formatCurrency(total)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50">
              <CardContent className="p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">
                  Fluxo
                </p>
                <p className="mt-1 text-xs font-medium text-emerald-900">
                  Pedido pago e finalizado na hora
                </p>
              </CardContent>
            </Card>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Buscar produtos</CardTitle>
              <CardDescription>
                Procure por nome, categoria ou descricao e adicione ao carrinho.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Ex.: combo, coca, batata..."
                  className="pl-11"
                />
              </div>
            </CardContent>
          </Card>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="h-auto flex-wrap gap-1 bg-muted/60 p-1">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="text-xs">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {filteredProducts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[120px] flex-col items-center justify-center gap-2 p-4 text-center">
                <SearchIcon className="text-slate-400" size={20} />
                <p className="font-medium text-slate-900">
                  Nenhum produto encontrado
                </p>
                <p className="text-sm text-muted-foreground">
                  Ajuste a busca ou a categoria para localizar itens.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50/80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {product.name}
                        </p>
                        <button
                          type="button"
                          title={product.description}
                          className="shrink-0 text-muted-foreground transition hover:text-slate-700"
                        >
                          <InfoIcon size={12} />
                        </button>
                      </div>
                    </div>
                    <Badge
                      variant={getAvailableStockVariant(product)}
                      className="shrink-0 text-xs"
                    >
                      {getAvailableStockLabel(product)}
                    </Badge>
                    <p className="w-20 shrink-0 text-right font-display text-sm font-semibold">
                      {formatCurrency(product.price)}
                    </p>
                    <Button
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      disabled={
                        product.trackInventory && product.stockQuantity <= 0
                      }
                      onClick={() => addProduct(product)}
                    >
                      <PlusIcon size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Card className="border-white/80 bg-slate-950 text-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10">
                  <ShoppingCartIcon size={13} />
                </div>
                <div>
                  <CardTitle className="font-display text-base">
                    Resumo da venda
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-300">
                    Operacao pensada para caixa rapido e sem friccao.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-200">
                    Nome do cliente
                  </label>
                  <Input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Opcional. Padrao: Cliente do balcao"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-200">
                    Celular do cliente
                  </label>
                  <Input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="Opcional. Informe para cashback"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("DINHEIRO")}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    paymentMethod === "DINHEIRO"
                      ? "border-white bg-white text-slate-950"
                      : "border-white/10 bg-white/5 text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BanknoteIcon size={14} />
                    <span className="text-sm font-medium">Dinheiro</span>
                  </div>
                  <p className="mt-1 text-xs opacity-80">Recebimento em especie.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CARTAO_PRESENCIAL")}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    paymentMethod === "CARTAO_PRESENCIAL"
                      ? "border-white bg-white text-slate-950"
                      : "border-white/10 bg-white/5 text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCardIcon size={14} />
                    <span className="text-sm font-medium">Cartao presencial</span>
                  </div>
                  <p className="mt-1 text-xs opacity-80">Maquininha no caixa.</p>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Itens selecionados</CardTitle>
              <CardDescription>
                Ajuste as quantidades antes de concluir a venda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {cartItems.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-5 text-center">
                  <p className="text-sm font-medium text-slate-900">
                    Carrinho vazio
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Adicione produtos para liberar o fechamento.
                  </p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border bg-slate-50/80 p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-950">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.price)} / un.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProduct(item.id)}
                        className="text-xs font-medium text-rose-600"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => decreaseProduct(item.id)}
                        >
                          <MinusIcon size={12} />
                        </Button>
                        <div className="flex h-7 min-w-9 items-center justify-center rounded-lg border bg-white px-2 text-sm font-semibold">
                          {String(item.quantity)}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => increaseProduct(item.id)}
                        >
                          <PlusIcon size={12} />
                        </Button>
                      </div>

                      <p className="font-display text-sm font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              )}

              <div className="rounded-xl border bg-slate-950 p-3 text-white">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Quantidade total</span>
                  <span>{String(totalItems)} itens</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">Total da venda</span>
                  <span className="font-display text-xl font-semibold">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

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

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isPending || cartItems.length === 0}
                  onClick={clearSale}
                >
                  Limpar venda
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={isPending || cartItems.length === 0}
                  onClick={handleFinishSale}
                >
                  {isPending ? "Fechando venda..." : "Fechar conta agora"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PdvFrenteCaixa;
