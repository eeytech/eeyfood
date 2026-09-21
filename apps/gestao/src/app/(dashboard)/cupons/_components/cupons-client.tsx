"use client";

import type { Coupon } from "@fsw/db";
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FilterXIcon,
  FlameIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PercentIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  TicketPercentIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  alternarStatusCupomAction,
  createCouponAction,
  deleteCouponAction,
  updateCouponAction,
} from "@/app/(dashboard)/coupons-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface CuponsClientProps {
  slug: string;
  cupons: Coupon[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDatetime(date: Date | string | null | undefined) {
  if (!date) return "—";
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
}

function toDatetimeLocal(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  discountValue: "",
  minimumOrderValue: "0",
  maxDiscountAmount: "",
  usageLimit: "",
  perCustomerLimit: "1",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

type FormState = typeof EMPTY_FORM;

export function CuponsClient({ slug, cupons }: CuponsClientProps) {
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("RECENT");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Metric stats
  const totalCount = cupons.length;
  const activeCount = cupons.filter((c) => c.isActive).length;
  const totalUsages = cupons.reduce((acc, c) => acc + (c.usageCount || 0), 0);

  const percentageCoupons = cupons.filter(
    (c) => c.discountType === "PERCENTAGE" && c.isActive,
  );
  const avgPercentageDiscount =
    percentageCoupons.length > 0
      ? (
          percentageCoupons.reduce((acc, c) => acc + c.discountValue, 0) /
          percentageCoupons.length
        ).toFixed(0)
      : null;

  // Filtered & Sorted list
  const filteredCupons = useMemo(() => {
    return cupons
      .filter((c) => {
        // Search term
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesCode = c.code.toLowerCase().includes(query);
          const matchesDesc = (c.description || "").toLowerCase().includes(query);
          if (!matchesCode && !matchesDesc) return false;
        }

        // Status filter
        if (statusFilter === "ACTIVE" && !c.isActive) return false;
        if (statusFilter === "INACTIVE" && c.isActive) return false;

        // Type filter
        if (typeFilter !== "ALL" && c.discountType !== typeFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "RECENT") {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        }
        if (sortBy === "MOST_USED") {
          return (b.usageCount || 0) - (a.usageCount || 0);
        }
        if (sortBy === "DISCOUNT_DESC") {
          return b.discountValue - a.discountValue;
        }
        if (sortBy === "CODE") {
          return a.code.localeCompare(b.code);
        }
        return 0;
      });
  }, [cupons, searchQuery, statusFilter, typeFilter, sortBy]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredCupons.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCupons = filteredCupons.slice(startIndex, endIndex);

  const isFiltering =
    searchQuery.trim() !== "" ||
    statusFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    sortBy !== "RECENT";

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setSortBy("RECENT");
    setCurrentPage(1);
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsCreateOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description ?? "",
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minimumOrderValue: String(coupon.minimumOrderValue),
      maxDiscountAmount:
        coupon.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : "",
      usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
      perCustomerLimit: String(coupon.perCustomerLimit),
      startsAt: toDatetimeLocal(coupon.startsAt),
      endsAt: toDatetimeLocal(coupon.endsAt),
      isActive: coupon.isActive,
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  // Submit Create / Edit
  const handleSubmitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    if (form.isActive) {
      formData.set("isActive", "on");
    } else {
      formData.delete("isActive");
    }

    startTransition(async () => {
      if (editingCoupon) {
        formData.set("couponId", editingCoupon.id);
        const result = await updateCouponAction(slug, formData);
        if (result.error) {
          setFormError(result.error);
          toast.error(result.error);
        } else {
          toast.success(`Cupom "${form.code}" atualizado com sucesso!`);
          setIsCreateOpen(false);
          setEditingCoupon(null);
        }
      } else {
        const result = await createCouponAction(slug, formData);
        if (result.error) {
          setFormError(result.error);
          toast.error(result.error);
        } else {
          toast.success(`Cupom "${form.code}" cadastrado com sucesso!`);
          setIsCreateOpen(false);
        }
      }
    });
  };

  // Toggle Status via Switch
  const handleToggleStatus = (
    couponId: string,
    currentStatus: boolean,
    code: string,
  ) => {
    startTransition(async () => {
      const result = await alternarStatusCupomAction(couponId, !currentStatus, slug);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Cupom "${code}" ${!currentStatus ? "ativado" : "desativado"} com sucesso.`,
        );
      }
    });
  };

  // Confirm Delete
  const handleDeleteConfirm = () => {
    if (!deletingCoupon) return;
    const formData = new FormData();
    formData.set("couponId", deletingCoupon.id);

    startTransition(async () => {
      const result = await deleteCouponAction(slug, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Cupom "${deletingCoupon.code}" excluído com sucesso.`);
        setDeletingCoupon(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <TicketPercentIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Cupons de Desconto
            </h1>
            <p className="text-sm text-slate-500">
              Crie campanhas promocionais, cupons com desconto fixo ou percentual e regras de uso.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <PlusIcon size={16} />
          <span>Novo Cupom</span>
        </Button>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total de Cupons */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Cupons
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <TagIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeCount} ativos no restaurante
            </p>
          </CardContent>
        </Card>

        {/* Cupons Ativos */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cupons Ativos
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {activeCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Prontos para uso em pedidos
            </p>
          </CardContent>
        </Card>

        {/* Total de Utilizações */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Usos
              </span>
              <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                <FlameIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-indigo-700">
              {totalUsages}{" "}
              <span className="text-xs font-medium text-slate-500">resgates</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Economia gerada aos clientes
            </p>
          </CardContent>
        </Card>

        {/* Desconto Médio */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Desconto Médio (%)
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <PercentIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {avgPercentageDiscount ? `${avgPercentageDiscount}%` : "—"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {percentageCoupons.length} cupons percentuais ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters Card ────────────────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por código ou descrição do cupom..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="w-full sm:w-36">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="ACTIVE">Ativos</SelectItem>
                    <SelectItem value="INACTIVE">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="w-full sm:w-44">
                <Select
                  value={typeFilter}
                  onValueChange={(val) => {
                    setTypeFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Tipo de desconto..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todos os tipos</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
                    <SelectItem value="FIXED">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="w-full sm:w-44">
                <Select
                  value={sortBy}
                  onValueChange={(val) => {
                    setSortBy(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Ordenar..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="RECENT">Mais recentes</SelectItem>
                    <SelectItem value="MOST_USED">Mais utilizados</SelectItem>
                    <SelectItem value="DISCOUNT_DESC">Maior desconto</SelectItem>
                    <SelectItem value="CODE">Código (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isFiltering && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <FilterXIcon size={14} />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Results counter indicator */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Exibindo{" "}
              <strong className="font-semibold text-slate-900">
                {filteredCupons.length}
              </strong>{" "}
              de {totalCount} cupom{totalCount !== 1 ? "s" : ""}
            </span>
            {isFiltering && (
              <span className="text-[11px] font-medium text-amber-600">
                Filtros aplicados
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Table & List Container ───────────────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {filteredCupons.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <TicketPercentIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhum cupom encontrado
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {isFiltering
                ? "Tente ajustar os termos da busca ou limpar os filtros para visualizar outros cupons."
                : "Nenhum cupom cadastrado neste restaurante ainda. Comece criando sua primeira promoção!"}
            </p>
            {isFiltering ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="mt-4 gap-1.5 rounded-full border-slate-200 text-xs"
              >
                <FilterXIcon size={14} />
                Limpar filtros
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="mt-4 gap-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <PlusIcon size={14} />
                Criar primeiro cupom
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="w-[280px] text-xs font-semibold text-slate-700">
                      Cupom
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Desconto
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Pedido Mínimo
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Utilizações
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Vigência
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-700">
                      Status
                    </TableHead>
                    <TableHead className="w-[80px] text-right text-xs font-semibold text-slate-700">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {paginatedCupons.map((coupon) => (
                    <TableRow
                      key={coupon.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      {/* Cupom */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                            <TagIcon size={16} className="text-slate-600" />
                          </div>
                          <div className="min-w-0">
                            <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold tracking-wide text-slate-900">
                              {coupon.code}
                            </span>
                            {coupon.description && (
                              <p className="truncate text-xs text-slate-500 mt-0.5">
                                {coupon.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Desconto */}
                      <TableCell className="py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                            coupon.discountType === "PERCENTAGE"
                              ? "border-amber-200/80 bg-amber-50 text-amber-800"
                              : "border-blue-200/80 bg-blue-50 text-blue-800",
                          )}
                        >
                          {coupon.discountType === "PERCENTAGE"
                            ? `${coupon.discountValue}% OFF`
                            : `${formatCurrency(coupon.discountValue)} OFF`}
                        </span>
                      </TableCell>

                      {/* Pedido Mínimo */}
                      <TableCell className="py-3.5 text-xs text-slate-600">
                        {coupon.minimumOrderValue > 0 ? (
                          formatCurrency(coupon.minimumOrderValue)
                        ) : (
                          <span className="text-slate-400">Sem mínimo</span>
                        )}
                      </TableCell>

                      {/* Utilizações */}
                      <TableCell className="py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          <strong>{coupon.usageCount}</strong>
                          {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : " usos"}
                        </span>
                      </TableCell>

                      {/* Vigência */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <CalendarIcon size={12} className="shrink-0 text-slate-400" />
                          <span>
                            {coupon.startsAt || coupon.endsAt
                              ? `${formatDatetime(coupon.startsAt)} → ${formatDatetime(coupon.endsAt)}`
                              : "Sem validade"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status Switch */}
                      <TableCell className="py-3.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <Switch
                            checked={coupon.isActive}
                            disabled={isPending}
                            onCheckedChange={() =>
                              handleToggleStatus(
                                coupon.id,
                                coupon.isActive,
                                coupon.code,
                              )
                            }
                            className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                          />
                          <span
                            className={cn(
                              "text-xs font-medium",
                              coupon.isActive ? "text-emerald-700" : "text-slate-400",
                            )}
                          >
                            {coupon.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <MoreHorizontalIcon size={16} />
                              <span className="sr-only">Opções</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 rounded-xl border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                          >
                            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                              Opções do Cupom
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(coupon)}
                              className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                            >
                              <PencilIcon size={14} className="text-slate-500" />
                              Editar dados
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleStatus(
                                  coupon.id,
                                  coupon.isActive,
                                  coupon.code,
                                )
                              }
                              className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                            >
                              {coupon.isActive ? (
                                <>
                                  <AlertCircleIcon
                                    size={14}
                                    className="text-amber-500"
                                  />
                                  Desativar cupom
                                </>
                              ) : (
                                <>
                                  <CheckCircle2Icon
                                    size={14}
                                    className="text-emerald-600"
                                  />
                                  Ativar cupom
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem
                              onClick={() => setDeletingCoupon(coupon)}
                              className="gap-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                            >
                              <Trash2Icon size={14} />
                              Excluir cupom
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {paginatedCupons.map((coupon) => (
                <div key={coupon.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold tracking-wide text-slate-900">
                        {coupon.code}
                      </span>
                      {coupon.description && (
                        <p className="mt-1 text-xs text-slate-500">
                          {coupon.description}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <MoreHorizontalIcon size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 rounded-xl border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                      >
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(coupon)}
                          className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                        >
                          <PencilIcon size={14} />
                          Editar dados
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleStatus(
                              coupon.id,
                              coupon.isActive,
                              coupon.code,
                            )
                          }
                          className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                        >
                          {coupon.isActive ? (
                            <>
                              <AlertCircleIcon size={14} className="text-amber-500" />
                              Desativar cupom
                            </>
                          ) : (
                            <>
                              <CheckCircle2Icon
                                size={14}
                                className="text-emerald-600"
                              />
                              Ativar cupom
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100" />
                        <DropdownMenuItem
                          onClick={() => setDeletingCoupon(coupon)}
                          className="gap-2 rounded-lg text-xs font-medium text-red-600"
                        >
                          <Trash2Icon size={14} />
                          Excluir cupom
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                        coupon.discountType === "PERCENTAGE"
                          ? "border-amber-200/80 bg-amber-50 text-amber-800"
                          : "border-blue-200/80 bg-blue-50 text-blue-800",
                      )}
                    >
                      {coupon.discountType === "PERCENTAGE"
                        ? `${coupon.discountValue}% OFF`
                        : `${formatCurrency(coupon.discountValue)} OFF`}
                    </span>

                    <span className="text-xs text-slate-500">
                      {coupon.minimumOrderValue > 0
                        ? `Mín: ${formatCurrency(coupon.minimumOrderValue)}`
                        : "Sem mínimo"}
                    </span>

                    <span className="text-xs text-slate-500">
                      • {coupon.usageCount}
                      {coupon.usageLimit != null ? `/${coupon.usageLimit}` : ""}{" "}
                      usos
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <CalendarIcon size={12} />
                      <span>
                        {coupon.startsAt || coupon.endsAt
                          ? `${formatDatetime(coupon.startsAt)} → ${formatDatetime(coupon.endsAt)}`
                          : "Sem validade"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          coupon.isActive ? "text-emerald-700" : "text-slate-400",
                        )}
                      >
                        {coupon.isActive ? "Ativo" : "Inativo"}
                      </span>
                      <Switch
                        checked={coupon.isActive}
                        disabled={isPending}
                        onCheckedChange={() =>
                          handleToggleStatus(
                            coupon.id,
                            coupon.isActive,
                            coupon.code,
                          )
                        }
                        className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Items per page selector */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Exibir</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-16 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200 bg-white">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>cupons por página</span>
              </div>

              {/* Page numbers & navigations */}
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-xs text-slate-500">
                  Página{" "}
                  <strong className="font-semibold text-slate-900">
                    {validCurrentPage}
                  </strong>{" "}
                  de{" "}
                  <strong className="font-semibold text-slate-900">
                    {totalPages}
                  </strong>
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Primeira página"
                  >
                    <ChevronsLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Página anterior"
                  >
                    <ChevronLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Próxima página"
                  >
                    <ChevronRightIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
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
      </Card>

      {/* ── Dialog: Criar / Editar Cupom ─────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                {editingCoupon ? <PencilIcon size={20} /> : <PlusIcon size={20} />}
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  {editingCoupon ? "Editar Cupom" : "Novo Cupom de Desconto"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {editingCoupon
                    ? "Altere as regras e valores do cupom promocional."
                    : "Preencha os campos para criar uma nova campanha promocional."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="coupon-code" className="text-xs font-semibold text-slate-700">
                  Código do Cupom *
                </Label>
                <Input
                  id="coupon-code"
                  name="code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase().replace(/\s/g, ""),
                    }))
                  }
                  placeholder="EX.: PROMO10, BEMVINDO"
                  required
                  className="h-10 rounded-xl border-slate-200 bg-white font-mono text-sm uppercase text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="coupon-desc" className="text-xs font-semibold text-slate-700">
                  Descrição ou Nome da Campanha
                </Label>
                <Input
                  id="coupon-desc"
                  name="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Ex.: Desconto especial de boas-vindas"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Tipo de Desconto *
                </Label>
                <Select
                  name="discountType"
                  value={form.discountType}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      discountType: v as "PERCENTAGE" | "FIXED",
                    }))
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
                    <SelectItem value="FIXED">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-val" className="text-xs font-semibold text-slate-700">
                  {form.discountType === "PERCENTAGE" ? "Valor (%) *" : "Valor (R$) *"}
                </Label>
                <Input
                  id="coupon-val"
                  name="discountValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountValue: e.target.value }))
                  }
                  required
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-min" className="text-xs font-semibold text-slate-700">
                  Pedido Mínimo (R$)
                </Label>
                <Input
                  id="coupon-min"
                  name="minimumOrderValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimumOrderValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minimumOrderValue: e.target.value }))
                  }
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-max" className="text-xs font-semibold text-slate-700">
                  Teto de Desconto (R$)
                </Label>
                <Input
                  id="coupon-max"
                  name="maxDiscountAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Sem limite"
                  value={form.maxDiscountAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))
                  }
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-limit" className="text-xs font-semibold text-slate-700">
                  Limite Total de Usos
                </Label>
                <Input
                  id="coupon-limit"
                  name="usageLimit"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ilimitado"
                  value={form.usageLimit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, usageLimit: e.target.value }))
                  }
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-per-client" className="text-xs font-semibold text-slate-700">
                  Usos por Cliente
                </Label>
                <Input
                  id="coupon-per-client"
                  name="perCustomerLimit"
                  type="number"
                  min="1"
                  step="1"
                  value={form.perCustomerLimit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, perCustomerLimit: e.target.value }))
                  }
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-start" className="text-xs font-semibold text-slate-700">
                  Início da Vigência
                </Label>
                <Input
                  id="coupon-start"
                  name="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startsAt: e.target.value }))
                  }
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-end" className="text-xs font-semibold text-slate-700">
                  Fim da Vigência
                </Label>
                <Input
                  id="coupon-end"
                  name="endsAt"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endsAt: e.target.value }))
                  }
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Cupom ativo para resgate
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Pode ser aplicado pelos clientes ao finalizar o pedido
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, isActive: checked }))
                  }
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {isPending && (
                  <LoaderCircleIcon size={14} className="mr-1.5 animate-spin" />
                )}
                {isPending
                  ? "Salvando..."
                  : editingCoupon
                    ? "Salvar Alterações"
                    : "Criar Cupom"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Exclusão ─────────────────── */}
      <Dialog
        open={Boolean(deletingCoupon)}
        onOpenChange={(open) => {
          if (!open) setDeletingCoupon(null);
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <div className="rounded-xl bg-red-100 p-2 text-red-700">
                <Trash2Icon size={20} />
              </div>
              <DialogTitle className="font-display text-lg font-bold text-slate-900">
                Excluir Cupom
              </DialogTitle>
            </div>
            <DialogDescription className="pt-1 text-xs text-slate-500">
              Tem certeza que deseja remover o cupom{" "}
              <strong className="font-mono font-bold text-slate-900">
                {deletingCoupon?.code}
              </strong>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingCoupon(null)}
              className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleDeleteConfirm}
              className="rounded-full bg-red-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isPending && (
                <LoaderCircleIcon size={14} className="mr-1.5 animate-spin" />
              )}
              {isPending ? "Excluindo..." : "Sim, excluir cupom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
