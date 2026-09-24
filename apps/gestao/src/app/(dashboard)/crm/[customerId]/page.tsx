import { db, eq, walletsTable, and } from "@fsw/db";
import {
  ArrowLeftIcon,
  MessageSquareIcon,
  PackageIcon,
  ShoppingBagIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buscarClienteDetalheAction } from "../../crm-actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug?: string; customerId: string }>;
}

const SEGMENT_LABELS: Record<string, string> = {
  NEW: "Novo",
  VIP: "VIP",
  INACTIVE: "Inativo",
  AT_RISK: "Em Risco",
  RECOVERED: "Recuperado",
};

const SEGMENT_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "danger"> = {
  NEW: "default",
  VIP: "success",
  INACTIVE: "secondary",
  AT_RISK: "danger",
  RECOVERED: "warning",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (d: Date | string | null) =>
  d
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d))
    : "—";

const formatDateTime = (d: Date | string | null) =>
  d
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(d))
    : "—";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  IN_PREPARATION: "Em preparo",
  READY_FOR_PICKUP: "Pronto",
  OUT_FOR_DELIVERY: "Em entrega",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
};

export default async function CustomerDetailPage({ params }: PageProps) {
  const { slug, customerId } = await params;

  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) notFound();

  const { customer, orders } = await buscarClienteDetalheAction(restaurant.slug, customerId);

  const walletData = await db.query.walletsTable.findFirst({
    where: and(
      eq(walletsTable.restaurantId, restaurant.id),
      eq(walletsTable.customerPhone, customer.phone),
    ),
  });

  const segmentVariant = SEGMENT_VARIANTS[customer.segment] ?? "secondary";
  const segmentLabel = SEGMENT_LABELS[customer.segment] ?? customer.segment;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm font-display text-sm font-bold">
            {customer.name?.slice(0, 2).toUpperCase() || "CL"}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                {customer.name}
              </h1>
              <Badge variant={segmentVariant} className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                {segmentLabel}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Telefone: {customer.phone} {customer.email ? `• ${customer.email}` : ""}
            </p>
          </div>
        </div>

        <Link href="/crm">
          <Button
            variant="outline"
            className="h-10 gap-1.5 rounded-full border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <ArrowLeftIcon size={14} />
            <span>Voltar para Clientes</span>
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — customer info + interactions */}
        <div className="space-y-4">
          {/* KPIs */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900 font-semibold">
                <ShoppingBagIcon className="h-4 w-4 text-slate-500" />
                Dados do cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Telefone</span>
                <span className="font-medium text-slate-900">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex justify-between">
                  <span className="text-slate-500">E-mail</span>
                  <span className="font-medium text-slate-900">{customer.email}</span>
                </div>
              )}
              {customer.cpf && (
                <div className="flex justify-between">
                  <span className="text-slate-500">CPF</span>
                  <span className="font-medium text-slate-900">{customer.cpf}</span>
                </div>
              )}
              {customer.birthDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Aniversário</span>
                  <span className="font-medium text-slate-900">{formatDate(customer.birthDate)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-500">Total de pedidos</span>
                <span className="font-bold text-slate-900">{customer.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ticket médio</span>
                <span className="font-bold text-slate-900">{formatCurrency(customer.avgTicket)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total gasto</span>
                <span className="font-bold text-slate-900">{formatCurrency(customer.totalSpent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Primeiro pedido</span>
                <span className="text-slate-700">{formatDate(customer.firstOrderAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Último pedido</span>
                <span className="text-slate-700">{formatDate(customer.lastOrderAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Wallet */}
          {walletData && (
            <Card className="border-slate-200/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900 font-semibold">
                  <WalletIcon className="h-4 w-4 text-emerald-600" />
                  Cashback & Carteira
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo disponível</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(walletData.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total ganho</span>
                  <span className="text-slate-800">{formatCurrency(walletData.totalEarned)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total resgatado</span>
                  <span className="text-slate-800">{formatCurrency(walletData.totalRedeemed)}</span>
                </div>
                {walletData.points > 0 && (
                  <div className="flex justify-between border-t border-slate-100 pt-2">
                    <span className="text-slate-500">Pontos</span>
                    <span className="font-bold text-slate-900">{walletData.points.toFixed(0)} pts</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Interaction history */}
          {customer.interactions && customer.interactions.length > 0 && (
            <Card className="border-slate-200/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-slate-900 font-semibold">
                  <MessageSquareIcon className="h-4 w-4 text-slate-500" />
                  Histórico de interações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.interactions.map((interaction) => (
                  <div key={interaction.id} className="space-y-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {interaction.type === "CART_RECOVERY" ? "Recuperação" : interaction.type === "CAMPAIGN" ? "Campanha" : interaction.type}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(interaction.sentAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{interaction.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — order history */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-base text-slate-900 font-semibold">
                <PackageIcon className="h-4 w-4 text-slate-500" />
                Histórico de pedidos ({orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  Nenhum pedido encontrado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="text-xs font-semibold text-slate-700">Pedido</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Data</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Itens</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {orders.map((order) => (
                        <TableRow key={order.id} className="transition-colors hover:bg-slate-50/70">
                          <TableCell className="font-semibold text-slate-900">#{order.id}</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {formatDateTime(order.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.status === "CANCELLED" ? "danger" : order.status === "FINISHED" ? "secondary" : "default"} className="rounded-full text-xs">
                              {STATUS_LABELS[order.status] ?? order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {order.orderProducts
                              .slice(0, 2)
                              .map((p) => `${p.quantity}x ${p.productNameSnapshot}`)
                              .join(", ")}
                            {order.orderProducts.length > 2 && ` +${order.orderProducts.length - 2}`}
                          </TableCell>
                          <TableCell className="text-right font-display font-semibold text-slate-900">
                            {formatCurrency(order.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
