"use client";

import type { Customer } from "@fsw/db";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  EyeIcon,
  MapPinIcon,
  RotateCcwIcon,
  SparklesIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  UserXIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const SEGMENT_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badgeClass: string;
  }
> = {
  NEW: {
    label: "Novo",
    icon: UserPlusIcon,
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
  },
  VIP: {
    label: "VIP",
    icon: SparklesIcon,
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
  },
  RECOVERED: {
    label: "Recuperado",
    icon: RotateCcwIcon,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  },
  AT_RISK: {
    label: "Em Risco",
    icon: AlertTriangleIcon,
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200/80",
  },
  INACTIVE: {
    label: "Inativo",
    icon: UserXIcon,
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (d: Date | string | null) =>
  d ? new Intl.DateTimeFormat("pt-BR").format(new Date(d)) : "—";

function getInitials(name?: string | null) {
  if (!name) return "CL";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export interface CustomerWithAddress extends Customer {
  deliveryAddress?: string | null;
}

interface CustomerTableProps {
  customers: CustomerWithAddress[];
  total: number;
  page: number;
  pageSize: number;
  slug: string;
}

export function CustomerTable({
  customers,
  total,
  page,
  pageSize,
}: CustomerTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const handleClearFilters = () => {
    startTransition(() => router.push(pathname));
  };

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
      {customers.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
            <UsersIcon size={32} />
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
            Nenhum cliente encontrado
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Tente ajustar os filtros selecionados ou o termo de busca para visualizar os clientes.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="mt-4 gap-1.5 rounded-full border-slate-200 text-xs text-slate-700 hover:bg-slate-100"
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="w-[240px] text-xs font-semibold text-slate-700">
                    Cliente
                  </TableHead>
                  <TableHead className="w-[260px] text-xs font-semibold text-slate-700">
                    Endereço de Entrega
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">
                    Segmento RFM
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">
                    Pedidos
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">
                    Ticket Médio
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">
                    Total Gasto
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">
                    Último Pedido
                  </TableHead>
                  <TableHead className="w-[60px] text-right text-xs font-semibold text-slate-700">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const segInfo = SEGMENT_CONFIG[c.segment] ?? {
                    label: c.segment,
                    icon: UserIcon,
                    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                  };
                  const SegIcon = segInfo.icon;

                  return (
                    <TableRow
                      key={c.id}
                      className="group transition-colors hover:bg-slate-50/70"
                    >
                      {/* Cliente */}
                      <TableCell className="py-3.5">
                        <Link
                          href={`/crm/${c.id}`}
                          className="flex items-center gap-3 group-hover:text-slate-900"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                            {getInitials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 group-hover:underline">
                              {c.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {c.phone}
                            </p>
                          </div>
                        </Link>
                      </TableCell>

                      {/* Endereço de Entrega */}
                      <TableCell className="py-3.5 max-w-[260px]">
                        {c.deliveryAddress ? (
                          <div
                            className="flex items-start gap-1.5"
                            title={c.deliveryAddress}
                          >
                            <MapPinIcon
                              size={14}
                              className="shrink-0 text-rose-500 mt-0.5"
                            />
                            <span className="truncate text-xs font-medium text-slate-700">
                              {c.deliveryAddress}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Não cadastrado
                          </span>
                        )}
                      </TableCell>

                      {/* Segmento */}
                      <TableCell className="py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tracking-normal transition-colors",
                            segInfo.badgeClass,
                          )}
                        >
                          <SegIcon size={12} className="shrink-0" />
                          {segInfo.label}
                        </span>
                      </TableCell>

                      {/* Pedidos */}
                      <TableCell className="py-3.5 text-right font-display font-semibold text-slate-900">
                        {c.totalOrders}
                      </TableCell>

                      {/* Ticket Médio */}
                      <TableCell className="py-3.5 text-right text-xs text-slate-600 font-medium">
                        {formatCurrency(c.avgTicket)}
                      </TableCell>

                      {/* Total Gasto */}
                      <TableCell className="py-3.5 text-right font-display font-semibold text-slate-900">
                        {formatCurrency(c.totalSpent)}
                      </TableCell>

                      {/* Último Pedido */}
                      <TableCell className="py-3.5 text-xs text-slate-500">
                        {formatDate(c.lastOrderAt)}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="py-3.5 text-right">
                        <Link href={`/crm/${c.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Ver detalhes do cliente"
                          >
                            <EyeIcon size={15} />
                            <span className="sr-only">Ver detalhes</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile & Tablet Cards View */}
          <div className="divide-y divide-slate-100 lg:hidden">
            {customers.map((c) => {
              const segInfo = SEGMENT_CONFIG[c.segment] ?? {
                label: c.segment,
                icon: UserIcon,
                badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
              };
              const SegIcon = segInfo.icon;

              return (
                <div key={c.id} className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/crm/${c.id}`}
                          className="text-sm font-semibold text-slate-900 hover:underline block truncate"
                        >
                          {c.name}
                        </Link>
                        <p className="text-xs text-slate-500">{c.phone}</p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0",
                        segInfo.badgeClass,
                      )}
                    >
                      <SegIcon size={11} />
                      {segInfo.label}
                    </span>
                  </div>

                  {/* Endereço de Entrega no card mobile */}
                  {c.deliveryAddress ? (
                    <div className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 border border-slate-100">
                      <MapPinIcon size={13} className="shrink-0 text-rose-500 mt-0.5" />
                      <span className="line-clamp-2">{c.deliveryAddress}</span>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50/80 p-2.5 text-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-medium text-slate-400">
                        Pedidos
                      </span>
                      <p className="font-display font-semibold text-slate-900">
                        {c.totalOrders}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-medium text-slate-400">
                        Ticket Médio
                      </span>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(c.avgTicket)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-medium text-slate-400">
                        Total Gasto
                      </span>
                      <p className="font-display font-semibold text-slate-900">
                        {formatCurrency(c.totalSpent)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Último pedido: {formatDate(c.lastOrderAt)}</span>
                    <Link
                      href={`/crm/${c.id}`}
                      className="font-medium text-slate-900 hover:underline flex items-center gap-1"
                    >
                      Ver perfil
                      <ChevronRightIcon size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-slate-500">
              Exibindo {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, total)} de {total} clientes
            </span>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span className="text-xs text-slate-500 mr-1">
                Página <strong className="font-semibold text-slate-900">{page}</strong> de{" "}
                <strong className="font-semibold text-slate-900">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => goToPage(1)}
                  className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                  title="Primeira página"
                >
                  <ChevronsLeftIcon size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                  title="Página anterior"
                >
                  <ChevronLeftIcon size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(Math.min(totalPages, page + 1))}
                  className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                  title="Próxima página"
                >
                  <ChevronRightIcon size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(totalPages)}
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
  );
}
