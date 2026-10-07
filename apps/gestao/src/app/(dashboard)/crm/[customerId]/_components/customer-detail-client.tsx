"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ClockIcon,
  CoinsIcon,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareIcon,
  PackageIcon,
  PhoneIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  UserIcon,
  WalletIcon,
  XIcon,
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

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  PENDING: {
    label: "Pendente",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  IN_PREPARATION: {
    label: "Em preparo",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  READY_FOR_PICKUP: {
    label: "Pronto",
    badgeClass: "border-purple-200 bg-purple-50 text-purple-700",
  },
  OUT_FOR_DELIVERY: {
    label: "Em entrega",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  FINISHED: {
    label: "Finalizado",
    badgeClass: "border-primary/20 bg-primary/10 text-primary font-semibold",
  },
  COMPLETED: {
    label: "Concluído",
    badgeClass: "border-primary/20 bg-primary/10 text-primary font-semibold",
  },
  DELIVERED: {
    label: "Entregue",
    badgeClass: "border-primary/20 bg-primary/10 text-primary font-semibold",
  },
  CANCELLED: {
    label: "Cancelado",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-500",
  },
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
  const [addressPageSize, setAddressPageSize] = React.useState(6);
  const [copiedAddressId, setCopiedAddressId] = React.useState<string | null>(null);

  const filteredAddresses = React.useMemo(() => {
    if (!addressSearch.trim()) return parsedAddresses;
    const term = addressSearch.toLowerCase();
    return parsedAddresses.filter(
      (a) =>
        a.fullString.toLowerCase().includes(term) ||
        a.streetTitle.toLowerCase().includes(term) ||
        a.subLocation.toLowerCase().includes(term),
    );
  }, [parsedAddresses, addressSearch]);

  const totalAddressPages = Math.max(1, Math.ceil(filteredAddresses.length / addressPageSize));
  const validAddressPage = Math.min(addressPage, totalAddressPages);

  const paginatedAddresses = React.useMemo(() => {
    const start = (validAddressPage - 1) * addressPageSize;
    return filteredAddresses.slice(start, start + addressPageSize);
  }, [filteredAddresses, validAddressPage, addressPageSize]);

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

  const isFilteringOrders =
    orderSearch.trim() !== "" || orderStatus !== "ALL" || orderSort !== "newest";

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
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <PhoneIcon size={13} className="text-slate-400" />
                {formatPhone(customer.phone)}
              </span>
              {customer.email && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <MailIcon size={13} className="text-slate-400" />
                    {customer.email}
                  </span>
                </>
              )}
              {waUrl && (
                <>
                  <span className="text-slate-300">•</span>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <ExternalLinkIcon size={12} />
                    <span>Conversar no WhatsApp</span>
                  </a>
                </>
              )}
            </div>
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

      {/* ── 1ª LINHA: Dados do Cliente + Cashback e Carteira ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Card: Dados do Cliente */}
        <Card className="flex flex-col justify-between border-slate-200/80 bg-white shadow-sm lg:col-span-7 xl:col-span-8">
          <div>
            <CardHeader className="border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 font-display text-base font-bold text-slate-900">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <UserIcon size={16} />
                  </div>
                  <span>Dados do Cliente</span>
                </CardTitle>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Segmento: {segmentLabel}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-4 sm:p-5">
              {/* Informações Cadastrais */}
              <div>
                <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Informações de Contato
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {/* WhatsApp */}
                  <div className="space-y-1 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <PhoneIcon size={13} className="text-slate-400" />
                      <span>WhatsApp / Fone</span>
                    </div>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {formatPhone(customer.phone)}
                    </p>
                  </div>

                  {/* E-mail */}
                  <div className="space-y-1 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <MailIcon size={13} className="text-slate-400" />
                      <span>E-mail</span>
                    </div>
                    <p
                      className="truncate text-sm font-semibold text-slate-900"
                      title={customer.email ?? undefined}
                    >
                      {customer.email || "Não informado"}
                    </p>
                  </div>

                  {/* CPF */}
                  <div className="space-y-1 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <CreditCardIcon size={13} className="text-slate-400" />
                      <span>CPF</span>
                    </div>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {customer.cpf || "Não informado"}
                    </p>
                  </div>

                  {/* Aniversário */}
                  <div className="space-y-1 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <CalendarIcon size={13} className="text-slate-400" />
                      <span>Aniversário</span>
                    </div>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {customer.birthDate ? formatDate(customer.birthDate) : "Não informado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Métricas de Compras */}
              <div>
                <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Resumo de Consumo e Fidelidade
                </h4>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                  {/* Total de Pedidos */}
                  <div className="space-y-1 rounded-xl border border-slate-200/70 bg-white p-3 transition-colors hover:border-slate-300">
                    <span className="block truncate text-[11px] font-medium text-slate-500">
                      Total de Pedidos
                    </span>
                    <p className="font-display text-xl font-bold text-slate-900">
                      {customer.totalOrders}
                    </p>
                    <span className="block truncate text-[10px] text-slate-400">
                      pedidos feitos
                    </span>
                  </div>

                  {/* Ticket Médio */}
                  <div className="space-y-1 rounded-xl border border-slate-200/70 bg-white p-3 transition-colors hover:border-slate-300">
                    <span className="block truncate text-[11px] font-medium text-slate-500">
                      Ticket Médio
                    </span>
                    <p className="font-display text-xl font-bold text-slate-900">
                      {formatCurrency(customer.avgTicket)}
                    </p>
                    <span className="block truncate text-[10px] text-slate-400">
                      por pedido
                    </span>
                  </div>

                  {/* Total Gasto */}
                  <div className="space-y-1 rounded-xl border border-primary/20 bg-primary/[0.03] p-3 transition-colors hover:border-primary/40">
                    <span className="block truncate text-[11px] font-medium text-primary">
                      Total Gasto
                    </span>
                    <p className="font-display text-xl font-bold text-primary">
                      {formatCurrency(customer.totalSpent)}
                    </p>
                    <span className="block truncate text-[10px] text-primary/70">
                      acumulado
                    </span>
                  </div>

                  {/* Primeiro Pedido */}
                  <div className="space-y-1 rounded-xl border border-slate-200/70 bg-white p-3 transition-colors hover:border-slate-300">
                    <span className="block truncate text-[11px] font-medium text-slate-500">
                      Primeiro Pedido
                    </span>
                    <p className="font-display text-sm font-bold text-slate-800">
                      {formatDate(customer.firstOrderAt)}
                    </p>
                    <span className="block truncate text-[10px] text-slate-400">
                      data de início
                    </span>
                  </div>

                  {/* Último Pedido */}
                  <div className="col-span-2 space-y-1 rounded-xl border border-slate-200/70 bg-white p-3 transition-colors hover:border-slate-300 sm:col-span-1">
                    <span className="block truncate text-[11px] font-medium text-slate-500">
                      Último Pedido
                    </span>
                    <p className="font-display text-sm font-bold text-slate-800">
                      {formatDate(customer.lastOrderAt)}
                    </p>
                    <span className="block truncate text-[10px] text-slate-400">
                      atividade recente
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Card: Cashback e Carteira */}
        <Card className="flex flex-col justify-between border-slate-200/80 bg-white shadow-sm lg:col-span-5 xl:col-span-4">
          <div>
            <CardHeader className="border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 font-display text-base font-bold text-slate-900">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <WalletIcon size={16} />
                  </div>
                  <span>Cashback e Carteira</span>
                </CardTitle>
                {(walletData?.balance ?? 0) > 0 ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Com Saldo
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    Sem Saldo
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4 sm:p-5">
              {/* Destaque Saldo Disponível */}
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/[0.04] to-transparent p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Saldo Disponível
                  </span>
                  <CoinsIcon size={18} className="text-primary" />
                </div>
                <p className="mt-1 font-display text-3xl font-extrabold text-primary">
                  {formatCurrency(walletData?.balance ?? 0)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Disponível para abater na finalização de novos pedidos.
                </p>
              </div>

              {/* Métricas secundárias da carteira */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                  <span className="block text-[11px] font-medium text-slate-500">
                    Total Ganho
                  </span>
                  <p className="mt-0.5 font-display text-base font-bold text-slate-900">
                    {formatCurrency(walletData?.totalEarned ?? 0)}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Cashback acumulado
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                  <span className="block text-[11px] font-medium text-slate-500">
                    Total Resgatado
                  </span>
                  <p className="mt-0.5 font-display text-base font-bold text-slate-900">
                    {formatCurrency(walletData?.totalRedeemed ?? 0)}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Utilizado em compras
                  </span>
                </div>
              </div>

              {(walletData?.points ?? 0) > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 px-3.5 py-2.5 text-xs">
                  <span className="font-medium text-slate-600">
                    Pontos Fidelidade
                  </span>
                  <span className="font-display font-bold text-slate-900">
                    {(walletData?.points ?? 0).toFixed(0)} pts
                  </span>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* ── 2ª LINHA: Grid de Histórico de Pedidos ─────────────── */}
      <Card className="w-full overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {/* Cabeçalho do Card */}
        <CardHeader className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2.5 font-display text-base font-bold text-slate-900">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <PackageIcon size={16} />
                </div>
                <span>Histórico de Pedidos</span>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {filteredOrders.length} {filteredOrders.length === 1 ? "pedido" : "pedidos"}
                </span>
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Acompanhe todos os pedidos realizados pelo cliente com status, itens, valores e datas.
              </p>
            </div>

            {filteredOrders.length > 0 && (
              <div className="flex items-center gap-2 self-start rounded-xl border border-primary/20 bg-primary/[0.03] px-3.5 py-1.5 text-xs sm:self-auto">
                <span className="font-medium text-slate-500">Total listado:</span>
                <span className="font-display text-sm font-bold text-primary">
                  {formatCurrency(totalFilteredSum)}
                </span>
              </div>
            )}
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="mt-4 grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-12 sm:items-center">
            {/* Busca por ID ou Item */}
            <div className="relative sm:col-span-5">
              <SearchIcon
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por #ID ou nome do item..."
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
                    <SlidersHorizontalIcon size={12} className="shrink-0 text-primary" />
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
              <span className="text-xs font-medium text-amber-600">
                Filtros aplicados ({filteredOrders.length} resultado
                {filteredOrders.length !== 1 ? "s" : ""})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetOrderFilters}
                className="h-7 gap-1 px-2 text-xs font-semibold text-primary hover:bg-primary/10"
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
            <div className="space-y-3 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <PackageIcon size={24} />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-slate-800">
                  Nenhum pedido encontrado
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
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
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="w-[110px] text-xs font-semibold text-slate-700">
                        Pedido
                      </TableHead>
                      <TableHead className="w-[170px] text-xs font-semibold text-slate-700">
                        Data e Hora
                      </TableHead>
                      <TableHead className="w-[130px] text-xs font-semibold text-slate-700">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">
                        Itens do Pedido
                      </TableHead>
                      <TableHead className="w-[130px] text-right text-xs font-semibold text-slate-700">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {paginatedOrders.map((order) => {
                      const statusInfo =
                        STATUS_CONFIG[order.status] ?? {
                          label: order.status,
                          badgeClass: "border-slate-200 bg-slate-100 text-slate-600",
                        };

                      return (
                        <TableRow
                          key={order.id}
                          className="transition-colors hover:bg-primary/[0.02]"
                        >
                          {/* Pedido */}
                          <TableCell className="font-display text-sm font-bold text-slate-900">
                            #{order.id}
                          </TableCell>

                          {/* Data */}
                          <TableCell className="text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon size={12} className="shrink-0 text-slate-400" />
                              {formatDateTime(order.createdAt)}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                statusInfo.badgeClass,
                              )}
                            >
                              {statusInfo.label}
                            </span>
                          </TableCell>

                          {/* Itens */}
                          <TableCell className="text-xs text-slate-600">
                            {order.orderProducts && order.orderProducts.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {order.orderProducts.slice(0, 3).map((p, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                  >
                                    <strong className="font-semibold text-primary">
                                      {p.quantity}x
                                    </strong>
                                    <span className="max-w-[180px] truncate">
                                      {p.productNameSnapshot}
                                    </span>
                                  </span>
                                ))}
                                {order.orderProducts.length > 3 && (
                                  <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                    +{order.orderProducts.length - 3} mais
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="italic text-slate-400">
                                Sem itens detalhados
                              </span>
                            )}
                          </TableCell>

                          {/* Total */}
                          <TableCell className="text-right font-display text-sm font-bold text-slate-900">
                            {formatCurrency(order.total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Cards para Mobile */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {paginatedOrders.map((order) => {
                  const statusInfo =
                    STATUS_CONFIG[order.status] ?? {
                      label: order.status,
                      badgeClass: "border-slate-200 bg-slate-100 text-slate-600",
                    };

                  return (
                    <div key={order.id} className="space-y-2.5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-slate-900">
                          #{order.id}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            statusInfo.badgeClass,
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <ClockIcon size={12} className="text-slate-400" />
                        {formatDateTime(order.createdAt)}
                      </p>

                      {/* Itens */}
                      <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700">
                        {order.orderProducts?.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[11px]"
                          >
                            <span>
                              <strong className="font-semibold text-primary">
                                {p.quantity}x
                              </strong>{" "}
                              {p.productNameSnapshot}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-1">
                        <span className="text-xs font-medium text-slate-500">
                          Valor total:
                        </span>
                        <span className="font-display text-sm font-bold text-slate-900">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                    de {filteredOrders.length} pedido
                    {filteredOrders.length !== 1 ? "s" : ""}
                  </span>

                  <span className="hidden text-slate-300 sm:inline">|</span>

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
                    Página{" "}
                    <strong className="font-semibold text-slate-900">
                      {validOrderPage}
                    </strong>{" "}
                    de{" "}
                    <strong className="font-semibold text-slate-900">
                      {totalOrderPages}
                    </strong>
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

      {/* ── 3ª LINHA: Endereços de Entrega ───────────────────── */}
      <Card className="w-full overflow-hidden border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2.5 font-display text-base font-bold text-slate-900">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <MapPinIcon size={16} />
                </div>
                <span>Endereços de Entrega</span>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {parsedAddresses.length}
                </span>
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Endereços cadastrados e locais de entrega utilizados nos pedidos do cliente.
              </p>
            </div>

            {/* Busca de endereços (se tiver mais de 1) */}
            {parsedAddresses.length > 1 && (
              <div className="relative w-full sm:w-72">
                <SearchIcon
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  placeholder="Filtrar por rua, bairro ou cidade..."
                  value={addressSearch}
                  onChange={(e) => {
                    setAddressSearch(e.target.value);
                    setAddressPage(1);
                  }}
                  className="h-9 rounded-xl border-slate-200 bg-slate-50/50 pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white"
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
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {parsedAddresses.length === 0 ? (
            <div className="py-10 text-center">
              <MapPinIcon size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhum endereço registrado
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Este cliente ainda não possui endereços salvos ou informados em pedidos.
              </p>
            </div>
          ) : filteredAddresses.length === 0 ? (
            <div className="space-y-2 py-10 text-center">
              <p className="text-xs text-slate-500">
                Nenhum endereço encontrado para &ldquo;{addressSearch}&rdquo;.
              </p>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedAddresses.map((addr) => {
                const isCopied = copiedAddressId === addr.id;

                return (
                  <div
                    key={addr.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-primary/40 hover:shadow-xs"
                  >
                    <div className="space-y-2.5">
                      {/* Top Bar do Card de Endereço */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                            <MapPinIcon size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-sm font-bold text-slate-900 leading-snug break-words">
                              {addr.streetTitle}
                            </p>
                            {addr.subLocation && (
                              <p className="mt-0.5 text-xs text-slate-500 leading-snug">
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
                            "h-8 w-8 shrink-0 rounded-lg transition-colors",
                            isCopied
                              ? "bg-primary/10 text-primary"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                          )}
                        >
                          {isCopied ? (
                            <CheckIcon size={14} className="text-primary" />
                          ) : (
                            <CopyIcon size={14} />
                          )}
                        </Button>
                      </div>

                      {/* Complemento / Referência */}
                      {(addr.complement || addr.reference) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {addr.complement && (
                            <span className="rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              Compl: {addr.complement}
                            </span>
                          )}
                          {addr.reference && (
                            <span className="rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              Ref: {addr.reference}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tag salvo vs de pedido */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          addr.isSaved
                            ? "border border-primary/20 bg-primary/10 text-primary"
                            : "border border-slate-200 bg-slate-100 text-slate-500",
                        )}
                      >
                        {addr.isSaved ? "Endereço cadastrado" : "Registrado em pedido"}
                      </span>
                      {isCopied && (
                        <span className="text-[11px] font-bold text-primary animate-in fade-in">
                          Copiado!
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginação de Endereços */}
          {filteredAddresses.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-4 sm:px-5 sm:py-3 sm:flex-row sm:items-center sm:justify-between rounded-b-2xl">
              {/* Itens por página e contador */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>
                  Exibindo{" "}
                  <strong className="font-semibold text-slate-900">
                    {paginatedAddresses.length}
                  </strong>{" "}
                  de {filteredAddresses.length} endereço{filteredAddresses.length !== 1 ? "s" : ""}
                </span>

                <span className="hidden text-slate-300 sm:inline">|</span>

                <div className="flex items-center gap-1.5">
                  <span>Exibir</span>
                  <Select
                    value={String(addressPageSize)}
                    onValueChange={(val) => {
                      setAddressPageSize(Number(val));
                      setAddressPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-16 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-slate-200 bg-white">
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>por página</span>
                </div>
              </div>

              {/* Controles de navegação de página */}
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-xs text-slate-500">
                  Página{" "}
                  <strong className="font-semibold text-slate-900">
                    {validAddressPage}
                  </strong>{" "}
                  de{" "}
                  <strong className="font-semibold text-slate-900">
                    {totalAddressPages}
                  </strong>
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validAddressPage <= 1}
                    onClick={() => setAddressPage(1)}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Primeira página"
                  >
                    <ChevronsLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validAddressPage <= 1}
                    onClick={() => setAddressPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Página anterior"
                  >
                    <ChevronLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validAddressPage >= totalAddressPages}
                    onClick={() => setAddressPage((p) => Math.min(totalAddressPages, p + 1))}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Próxima página"
                  >
                    <ChevronRightIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validAddressPage >= totalAddressPages}
                    onClick={() => setAddressPage(totalAddressPages)}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Última página"
                  >
                    <ChevronsRightIcon size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Interações (se houver) ────────────────────────────── */}
      {customer.interactions && customer.interactions.length > 0 && (
        <Card className="w-full overflow-hidden border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 p-4 sm:p-5">
            <CardTitle className="flex items-center gap-2.5 font-display text-base font-bold text-slate-900">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <MessageSquareIcon size={16} />
              </div>
              <span>Histórico de Mensagens e Interações</span>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {customer.interactions.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {customer.interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="space-y-2 rounded-xl border border-slate-200/70 bg-slate-50/40 p-3.5"
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
                  <p className="line-clamp-3 text-xs text-slate-600">
                    {interaction.message}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
