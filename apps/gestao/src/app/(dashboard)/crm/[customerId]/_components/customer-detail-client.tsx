"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CopyIcon,
  MapPinIcon,
  MessageSquareIcon,
  PackageIcon,
  SearchIcon,
  ShoppingBagIcon,
  SlidersHorizontalIcon,
  WalletIcon,
  XIcon,
  ExternalLinkIcon,
  CalendarIcon,
  ClockIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface CustomerOrderProduct {
  id?: string;
  quantity: number;
  productNameSnapshot: string;
  priceSnapshot?: number;
  product?: {
    id: string;
    name: string;
    imageUrl?: string | null;
  } | null;
}

export interface CustomerOrder {
  id: number;
  createdAt: string | Date | null;
  status: string;
  total: number;
  deliveryAddress?: string | null;
  orderProducts: CustomerOrderProduct[];
}

export interface CustomerSavedAddress {
  id?: string;
  customerPhone?: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city?: string | null;
  state?: string | null;
  reference?: string | null;
  lastUsedAt?: string | Date | null;
}

export interface CustomerInteraction {
  id: string;
  type: string;
  message: string;
  sentAt: string | Date | null;
}

export interface CustomerDetailProps {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    cpf?: string | null;
    birthDate?: string | Date | null;
    segment: string;
    totalOrders: number;
    avgTicket: number;
    totalSpent: number;
    firstOrderAt?: string | Date | null;
    lastOrderAt?: string | Date | null;
    interactions?: CustomerInteraction[];
  };
  orders: CustomerOrder[];
  addresses: CustomerSavedAddress[];
  walletData?: {
    balance: number;
    totalEarned: number;
    totalRedeemed: number;
    points?: number | null;
  } | null;
}

interface ParsedAddress {
  id: string;
  streetTitle: string;
  subLocation: string;
  complement?: string | null;
  reference?: string | null;
  fullString: string;
  isSaved: boolean;
}

const SEGMENT_LABELS: Record<string, string> = {
  NEW: "Novo",
  VIP: "VIP",
  INACTIVE: "Inativo",
  AT_RISK: "Em Risco",
  RECOVERED: "Recuperado",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  IN_PREPARATION: "Em preparo",
  READY_FOR_PICKUP: "Pronto",
  OUT_FOR_DELIVERY: "Em entrega",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function formatPhone(phone?: string | null) {
  if (!phone) return "—";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return phone;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

const formatDate = (d?: Date | string | null) =>
  d
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(d))
    : "—";

const formatDateTime = (d?: Date | string | null) =>
  d
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(d))
    : "—";

export function CustomerDetailClient({
  customer,
  orders,
  addresses,
  walletData,
}: CustomerDetailProps) {
  // ─── Endereços Parsing ───────────────────────────────────────
  const parsedAddresses = React.useMemo(() => {
    const list: ParsedAddress[] = [];
    const seen = new Set<string>();

    for (const a of addresses || []) {
      const parts = [
        `${a.street}, ${a.number}`,
        a.complement ? `(${a.complement})` : null,
        a.neighborhood,
        a.city ? `${a.city}${a.state ? `/${a.state}` : ""}` : null,
        a.reference ? `Ref: ${a.reference}` : null,
      ].filter(Boolean);
      const str = parts.join(" - ");
      if (str && !seen.has(str)) {
        seen.add(str);
        list.push({
          id: a.id || `addr-saved-${list.length}`,
          streetTitle: `${a.street}, ${a.number}`,
          subLocation: [a.neighborhood, a.city ? `${a.city}${a.state ? ` - ${a.state}` : ""}` : null]
            .filter(Boolean)
            .join(" • "),
          complement: a.complement,
          reference: a.reference,
          fullString: str,
          isSaved: true,
        });
      }
    }

    for (const o of orders || []) {
      if (o.deliveryAddress && !seen.has(o.deliveryAddress.trim())) {
        const raw = o.deliveryAddress.trim();
        seen.add(raw);
        list.push({
          id: `addr-order-${o.id}`,
          streetTitle: raw.split("-")[0]?.trim() || raw,
          subLocation: raw.includes("-") ? raw.split("-").slice(1).join(" - ").trim() : "",
          complement: null,
          reference: null,
          fullString: raw,
          isSaved: false,
        });
      }
    }

    return list;
  }, [addresses, orders]);

  // ─── Endereços Filter & Pagination ───────────────────────────
  const [addressSearch, setAddressSearch] = React.useState("");
  const [addressPage, setAddressPage] = React.useState(1);
  const [copiedAddressId, setCopiedAddressId] = React.useState<string | null>(null);
  const ADDRESS_PAGE_SIZE = 3;

  const filteredAddresses = React.useMemo(() => {
    if (!addressSearch.trim()) return parsedAddresses;
    const term = addressSearch.toLowerCase();
    return parsedAddresses.filter((a) =>
      a.fullString.toLowerCase().includes(term) ||
      a.streetTitle.toLowerCase().includes(term) ||
      a.subLocation.toLowerCase().includes(term),
    );
  }, [parsedAddresses, addressSearch]);

  const totalAddressPages = Math.max(1, Math.ceil(filteredAddresses.length / ADDRESS_PAGE_SIZE));
  const validAddressPage = Math.min(addressPage, totalAddressPages);

  const paginatedAddresses = React.useMemo(() => {
    const start = (validAddressPage - 1) * ADDRESS_PAGE_SIZE;
    return filteredAddresses.slice(start, start + ADDRESS_PAGE_SIZE);
  }, [filteredAddresses, validAddressPage]);

  const handleCopyAddress = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAddressId(id);
      setTimeout(() => setCopiedAddressId(null), 2000);
    }
  };

  // ─── Pedidos Filter, Sort & Pagination ───────────────────────
  const [orderSearch, setOrderSearch] = React.useState("");
  const [orderStatus, setOrderStatus] = React.useState<string>("ALL");
  const [orderSort, setOrderSort] = React.useState<string>("newest");
  const [orderPage, setOrderPage] = React.useState(1);
  const [orderPageSize, setOrderPageSize] = React.useState(10);

  const filteredOrders = React.useMemo(() => {
    let result = [...orders];

    // Status filter
    if (orderStatus !== "ALL") {
      result = result.filter((o) => o.status === orderStatus);
    }

    // Search filter (ID or items)
    if (orderSearch.trim()) {
      const term = orderSearch.toLowerCase().trim().replace(/^#/, "");
      result = result.filter((o) => {
        const matchesId = String(o.id).includes(term);
        const matchesItems = o.orderProducts?.some((p) =>
          p.productNameSnapshot?.toLowerCase().includes(term),
        );
        return matchesId || matchesItems;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (orderSort === "newest") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      if (orderSort === "oldest") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      if (orderSort === "highest_value") {
        return b.total - a.total;
      }
      if (orderSort === "lowest_value") {
        return a.total - b.total;
      }
      return 0;
    });

    return result;
  }, [orders, orderStatus, orderSearch, orderSort]);

  const totalFilteredSum = React.useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [filteredOrders]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize));
  const validOrderPage = Math.min(orderPage, totalOrderPages);

  const paginatedOrders = React.useMemo(() => {
    const start = (validOrderPage - 1) * orderPageSize;
    return filteredOrders.slice(start, start + orderPageSize);
  }, [filteredOrders, validOrderPage, orderPageSize]);

  const isFilteringOrders = orderSearch.trim() !== "" || orderStatus !== "ALL" || orderSort !== "newest";

  const handleResetOrderFilters = () => {
    setOrderSearch("");
    setOrderStatus("ALL");
    setOrderSort("newest");
    setOrderPage(1);
  };

  const segmentLabel = SEGMENT_LABELS[customer.segment] ?? customer.segment;

  // Clean WhatsApp phone number for link
  const rawDigits = customer.phone.replace(/\D/g, "");
  const waUrl = rawDigits
    ? `https://wa.me/${rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`}`
    : null;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-display text-sm font-bold">
            {customer.name?.slice(0, 2).toUpperCase() || "CL"}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                {customer.name}
              </h1>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {segmentLabel}
              </span>
            </div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>WhatsApp: {formatPhone(customer.phone)}</span>
              {customer.email && <span>• {customer.email}</span>}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline ml-1"
                >
                  <ExternalLinkIcon size={12} />
                  <span>Conversar</span>
                </a>
              )}
            </p>
          </div>
        </div>

        <Link href="/crm">
          <Button
            variant="outline"
            className="h-10 gap-1.5 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-xs hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
          >
            <ArrowLeftIcon size={14} />
            <span>Voltar para Clientes</span>
          </Button>
        </Link>
      </div>

      {/* ── Main 2-column Grid ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left Column: Perfil, Endereços, Carteira, Interações ── */}
        <div className="space-y-4">
          {/* Card: Dados do Cliente */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2.5 font-display text-base font-bold text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <ShoppingBagIcon size={16} />
                </div>
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">WhatsApp / Telefone</span>
                <span className="font-semibold text-slate-900">{formatPhone(customer.phone)}</span>
              </div>
              {customer.email && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">E-mail</span>
                  <span className="font-medium text-slate-900 truncate max-w-[180px]">{customer.email}</span>
                </div>
              )}
              {customer.cpf && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">CPF</span>
                  <span className="font-medium text-slate-900">{customer.cpf}</span>
                </div>
              )}
              {customer.birthDate && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Aniversário</span>
                  <span className="font-medium text-slate-900">{formatDate(customer.birthDate)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                <span className="text-slate-500">Total de pedidos</span>
                <span className="font-bold text-slate-900">{customer.totalOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ticket médio</span>
                <span className="font-bold text-slate-900">{formatCurrency(customer.avgTicket)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total gasto</span>
                <span className="font-bold text-primary">{formatCurrency(customer.totalSpent)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Primeiro pedido</span>
                <span className="text-slate-700">{formatDate(customer.firstOrderAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Último pedido</span>
                <span className="text-slate-700">{formatDate(customer.lastOrderAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card: Endereços de Entrega (com Busca, Paginação e Copiar) */}
          <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 font-display text-base font-bold text-slate-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <MapPinIcon size={16} />
                  </div>
                  <span>Endereços de Entrega</span>
                </CardTitle>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {parsedAddresses.length}
                </span>
              </div>

              {/* Busca de endereços (se tiver mais de 1) */}
              {parsedAddresses.length > 1 && (
                <div className="relative mt-3">
                  <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Filtrar por rua, bairro ou cidade..."
                    value={addressSearch}
                    onChange={(e) => {
                      setAddressSearch(e.target.value);
                      setAddressPage(1);
                    }}
                    className="h-8 rounded-lg border-slate-200 bg-slate-50/50 pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white"
                  />
                  {addressSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddressSearch("");
                        setAddressPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-2.5">
              {parsedAddresses.length === 0 ? (
                <div className="py-6 text-center">
                  <MapPinIcon size={24} className="mx-auto text-slate-300 mb-1.5" />
                  <p className="text-xs text-slate-400 italic">Nenhum endereço de entrega registrado.</p>
                </div>
              ) : filteredAddresses.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-slate-500">Nenhum endereço encontrado para &ldquo;{addressSearch}&rdquo;.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddressSearch("");
                      setAddressPage(1);
                    }}
                    className="h-7 text-xs font-semibold text-primary"
                  >
                    Limpar busca
                  </Button>
                </div>
              ) : (
                paginatedAddresses.map((addr) => {
                  const isCopied = copiedAddressId === addr.id;

                  return (
                    <div
                      key={addr.id}
                      className="group relative flex flex-col gap-1.5 rounded-xl border border-primary/20 bg-primary/[0.02] p-3 text-slate-700 transition-all hover:border-primary/40 hover:bg-primary/[0.04]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <MapPinIcon size={14} className="text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-xs leading-snug break-words">
                              {addr.streetTitle}
                            </p>
                            {addr.subLocation && (
                              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                {addr.subLocation}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botão Copiar */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyAddress(addr.id, addr.fullString)}
                          title="Copiar endereço completo"
                          className={cn(
                            "h-7 w-7 shrink-0 rounded-lg transition-colors",
                            isCopied
                              ? "bg-primary/10 text-primary"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                          )}
                        >
                          {isCopied ? <CheckIcon size={13} className="text-primary" /> : <CopyIcon size={13} />}
                        </Button>
                      </div>

                      {/* Complemento / Referência */}
                      {(addr.complement || addr.reference) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-5">
                          {addr.complement && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              Compl: {addr.complement}
                            </span>
                          )}
                          {addr.reference && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              Ref: {addr.reference}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tag salvo vs de pedido */}
                      <div className="flex items-center justify-between pl-5 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {addr.isSaved ? "Endereço cadastrado" : "Registrado em pedido"}
                        </span>
                        {isCopied && (
                          <span className="text-[10px] font-semibold text-primary animate-in fade-in">
                            Copiado!
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Paginação de Endereços */}
              {filteredAddresses.length > ADDRESS_PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                  <span>
                    {validAddressPage} de {totalAddressPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={validAddressPage <= 1}
                      onClick={() => setAddressPage((p) => Math.max(1, p - 1))}
                      className="h-7 w-7 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeftIcon size={13} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={validAddressPage >= totalAddressPages}
                      onClick={() => setAddressPage((p) => Math.min(totalAddressPages, p + 1))}
                      className="h-7 w-7 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRightIcon size={13} />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Cashback e Carteira */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2.5 font-display text-base font-bold text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <WalletIcon size={16} />
                </div>
                Cashback e Carteira
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Saldo disponível</span>
                <span className="font-bold text-primary text-base">
                  {formatCurrency(walletData?.balance ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total ganho</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(walletData?.totalEarned ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total resgatado</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(walletData?.totalRedeemed ?? 0)}
                </span>
              </div>
              {(walletData?.points ?? 0) > 0 && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                  <span className="text-slate-500">Pontos acumulados</span>
                  <span className="font-bold text-slate-900">
                    {(walletData?.points ?? 0).toFixed(0)} pts
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Histórico de Interações */}
          {customer.interactions && customer.interactions.length > 0 && (
            <Card className="border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 font-display text-base font-bold text-slate-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <MessageSquareIcon size={16} />
                  </div>
                  Histórico de Interações ({customer.interactions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3">
                {customer.interactions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="space-y-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {interaction.type === "CART_RECOVERY"
                          ? "Recuperação"
                          : interaction.type === "CAMPAIGN"
                          ? "Campanha"
                          : interaction.type}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(interaction.sentAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {interaction.message}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Column: Histórico de Pedidos com Filtros e Paginação ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Cabeçalho do Card */}
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2.5 font-display text-base font-bold text-slate-900">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <PackageIcon size={16} />
                    </div>
                    <span>Histórico de Pedidos</span>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {filteredOrders.length} {filteredOrders.length === 1 ? "pedido" : "pedidos"}
                    </span>
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    Acompanhe todos os pedidos realizados pelo cliente com status, itens e valores.
                  </p>
                </div>

                {filteredOrders.length > 0 && (
                  <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-primary/20 bg-primary/[0.03] px-3 py-1.5 text-xs">
                    <span className="text-slate-500 font-medium">Total listado:</span>
                    <span className="font-bold text-primary font-display text-sm">
                      {formatCurrency(totalFilteredSum)}
                    </span>
                  </div>
                )}
              </div>

              {/* Barra de Filtros e Busca */}
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-12 sm:items-center pt-2">
                {/* Busca por ID ou Item */}
                <div className="relative sm:col-span-5">
                  <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar por #ID ou item..."
                    value={orderSearch}
                    onChange={(e) => {
                      setOrderSearch(e.target.value);
                      setOrderPage(1);
                    }}
                    className="h-9 rounded-xl border-slate-200 bg-slate-50/50 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white"
                  />
                  {orderSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderSearch("");
                        setOrderPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>

                {/* Filtro de Status */}
                <div className="sm:col-span-4">
                  <Select
                    value={orderStatus}
                    onValueChange={(val) => {
                      setOrderStatus(val);
                      setOrderPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700">
                      <SelectValue placeholder="Status do pedido" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white">
                      <SelectItem value="ALL">Todos os status</SelectItem>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="IN_PREPARATION">Em preparo</SelectItem>
                      <SelectItem value="READY_FOR_PICKUP">Pronto</SelectItem>
                      <SelectItem value="OUT_FOR_DELIVERY">Em entrega</SelectItem>
                      <SelectItem value="FINISHED">Finalizado</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Ordenação */}
                <div className="sm:col-span-3">
                  <Select
                    value={orderSort}
                    onValueChange={(val) => {
                      setOrderSort(val);
                      setOrderPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5 truncate">
                        <SlidersHorizontalIcon size={12} className="text-primary shrink-0" />
                        <SelectValue placeholder="Ordenar" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white">
                      <SelectItem value="newest">Mais recentes</SelectItem>
                      <SelectItem value="oldest">Mais antigos</SelectItem>
                      <SelectItem value="highest_value">Maior valor</SelectItem>
                      <SelectItem value="lowest_value">Menor valor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botão limpar filtros se ativo */}
              {isFilteringOrders && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-amber-600 font-medium">
                    Filtros aplicados ({filteredOrders.length} resultado{filteredOrders.length !== 1 ? "s" : ""})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetOrderFilters}
                    className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 gap-1 px-2"
                  >
                    <XIcon size={12} />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </CardHeader>

            {/* Conteúdo da Tabela */}
            <CardContent className="p-0">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <PackageIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-800">
                      Nenhum pedido encontrado
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      {isFilteringOrders
                        ? "Nenhum pedido corresponde aos filtros ou busca selecionados. Tente ajustar os critérios."
                        : "Este cliente ainda não realizou nenhum pedido cadastrado no sistema."}
                    </p>
                  </div>
                  {isFilteringOrders && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetOrderFilters}
                      className="h-8 rounded-full border-slate-200 text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      Limpar todos os filtros
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Tabela para Desktop e Tablets */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/80">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="w-[100px] text-xs font-semibold text-slate-700">Pedido</TableHead>
                          <TableHead className="w-[140px] text-xs font-semibold text-slate-700">Data e Hora</TableHead>
                          <TableHead className="w-[120px] text-xs font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-700">Itens do Pedido</TableHead>
                          <TableHead className="w-[110px] text-right text-xs font-semibold text-slate-700">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {paginatedOrders.map((order) => (
                          <TableRow
                            key={order.id}
                            className="transition-colors hover:bg-primary/[0.02]"
                          >
                            {/* Pedido */}
                            <TableCell className="font-display font-bold text-slate-900 text-sm">
                              #{order.id}
                            </TableCell>

                            {/* Data */}
                            <TableCell className="text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <CalendarIcon size={12} className="text-slate-400 shrink-0" />
                                {formatDateTime(order.createdAt)}
                              </span>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-normal",
                                  order.status === "CANCELLED"
                                    ? "border border-slate-200 bg-slate-100 text-slate-500"
                                    : "border border-primary/20 bg-primary/10 text-primary",
                                )}
                              >
                                {STATUS_LABELS[order.status] ?? order.status}
                              </span>
                            </TableCell>

                            {/* Itens */}
                            <TableCell className="text-xs text-slate-600 max-w-[280px]">
                              {order.orderProducts && order.orderProducts.length > 0 ? (
                                <div className="space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {order.orderProducts.slice(0, 2).map((p, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 text-[11px]"
                                      >
                                        <strong className="text-primary font-semibold">{p.quantity}x</strong>
                                        <span className="truncate max-w-[140px]">{p.productNameSnapshot}</span>
                                      </span>
                                    ))}
                                    {order.orderProducts.length > 2 && (
                                      <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                        +{order.orderProducts.length - 2} mais
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Sem itens detalhados</span>
                              )}
                            </TableCell>

                            {/* Total */}
                            <TableCell className="text-right font-display font-bold text-slate-900 text-sm">
                              {formatCurrency(order.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Cards para Mobile */}
                  <div className="divide-y divide-slate-100 sm:hidden">
                    {paginatedOrders.map((order) => (
                      <div key={order.id} className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-slate-900 text-sm">
                            #{order.id}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              order.status === "CANCELLED"
                                ? "border border-slate-200 bg-slate-100 text-slate-500"
                                : "border border-primary/20 bg-primary/10 text-primary",
                            )}
                          >
                            {STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </div>

                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <ClockIcon size={12} className="text-slate-400" />
                          {formatDateTime(order.createdAt)}
                        </p>

                        {/* Itens */}
                        <div className="rounded-lg bg-slate-50 p-2 space-y-1 text-xs text-slate-700">
                          {order.orderProducts?.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <span>
                                <strong className="text-primary font-semibold">{p.quantity}x</strong>{" "}
                                {p.productNameSnapshot}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                          <span className="text-xs text-slate-500 font-medium">Valor total:</span>
                          <span className="font-display font-bold text-slate-900 text-sm">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Barra de Paginação de Pedidos */}
                  <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Itens por página e contador */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>
                        Exibindo{" "}
                        <strong className="font-semibold text-slate-900">
                          {paginatedOrders.length}
                        </strong>{" "}
                        de {filteredOrders.length} pedido{filteredOrders.length !== 1 ? "s" : ""}
                      </span>

                      <span className="hidden sm:inline text-slate-300">|</span>

                      <div className="flex items-center gap-1.5">
                        <span>Exibir</span>
                        <Select
                          value={String(orderPageSize)}
                          onValueChange={(val) => {
                            setOrderPageSize(Number(val));
                            setOrderPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 w-16 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg border-slate-200 bg-white">
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                        <span>por página</span>
                      </div>
                    </div>

                    {/* Controles de navegação de página */}
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span className="text-xs text-slate-500">
                        Página <strong className="font-semibold text-slate-900">{validOrderPage}</strong> de{" "}
                        <strong className="font-semibold text-slate-900">{totalOrderPages}</strong>
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={validOrderPage <= 1}
                          onClick={() => setOrderPage(1)}
                          className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                          title="Primeira página"
                        >
                          <ChevronsLeftIcon size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={validOrderPage <= 1}
                          onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                          className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                          title="Página anterior"
                        >
                          <ChevronLeftIcon size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={validOrderPage >= totalOrderPages}
                          onClick={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                          className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                          title="Próxima página"
                        >
                          <ChevronRightIcon size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={validOrderPage >= totalOrderPages}
                          onClick={() => setOrderPage(totalOrderPages)}
                          className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                          title="Última página"
                        >
                          <ChevronsRightIcon size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
