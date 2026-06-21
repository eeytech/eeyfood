"use client";

import type { Customer } from "@fsw/db";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SEGMENT_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "danger" }> = {
  NEW: { label: "Novo", variant: "default" },
  VIP: { label: "VIP", variant: "success" },
  INACTIVE: { label: "Inativo", variant: "secondary" },
  AT_RISK: { label: "Em Risco", variant: "danger" },
  RECOVERED: { label: "Recuperado", variant: "warning" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (d: Date | string | null) =>
  d ? new Intl.DateTimeFormat("pt-BR").format(new Date(d)) : "—";

interface CustomerTableProps {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  slug: string;
}

export function CustomerTable({ customers, total, page, pageSize, slug }: CustomerTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const totalPages = Math.ceil(total / pageSize);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  if (customers.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center text-muted-foreground">
        Nenhum cliente encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Ticket Médio</TableHead>
              <TableHead className="text-right">Total Gasto</TableHead>
              <TableHead>Último Pedido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => {
              const badge = SEGMENT_BADGES[c.segment] ?? { label: c.segment, variant: "secondary" as const };
              return (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/${slug}/crm/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{c.totalOrders}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.avgTicket)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.totalSpent)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.lastOrderAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} clientes
          </span>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
