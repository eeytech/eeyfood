import { db, eq, restaurantsTable, walletsTable, and } from "@fsw/db";
import {
  ArrowLeftIcon,
  MessageSquareIcon,
  PackageIcon,
  ShoppingBagIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
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

interface PageProps {
  params: Promise<{ slug: string; customerId: string }>;
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

  const restaurant = await db.query.restaurantsTable.findFirst({
    where: eq(restaurantsTable.slug, slug),
  });

  if (!restaurant) notFound();

  const { customer, orders } = await buscarClienteDetalheAction(slug, customerId);

  const walletData = await db.query.walletsTable.findFirst({
    where: and(
      eq(walletsTable.restaurantId, restaurant.id),
      eq(walletsTable.customerPhone, customer.phone),
    ),
  });

  const segmentVariant = SEGMENT_VARIANTS[customer.segment] ?? "secondary";
  const segmentLabel = SEGMENT_LABELS[customer.segment] ?? customer.segment;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${slug}/crm`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Clientes
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">{customer.name}</h1>
        <Badge variant={segmentVariant}>{segmentLabel}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — customer info + interactions */}
        <div className="space-y-4">
          {/* KPIs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBagIcon className="h-4 w-4" />
                Dados do cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span className="font-medium">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">E-mail</span>
                  <span className="font-medium">{customer.email}</span>
                </div>
              )}
              {customer.cpf && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPF</span>
                  <span className="font-medium">{customer.cpf}</span>
                </div>
              )}
              {customer.birthDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aniversário</span>
                  <span className="font-medium">{formatDate(customer.birthDate)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total de pedidos</span>
                <span className="font-bold">{customer.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket médio</span>
                <span className="font-bold">{formatCurrency(customer.avgTicket)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total gasto</span>
                <span className="font-bold">{formatCurrency(customer.totalSpent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Primeiro pedido</span>
                <span>{formatDate(customer.firstOrderAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último pedido</span>
                <span>{formatDate(customer.lastOrderAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Wallet */}
          {walletData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <WalletIcon className="h-4 w-4" />
                  Cashback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo disponível</span>
                  <span className="font-bold text-green-600">{formatCurrency(walletData.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total ganho</span>
                  <span>{formatCurrency(walletData.totalEarned)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total resgatado</span>
                  <span>{formatCurrency(walletData.totalRedeemed)}</span>
                </div>
                {walletData.points > 0 && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Pontos</span>
                    <span className="font-bold">{walletData.points.toFixed(0)} pts</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Interaction history */}
          {customer.interactions && customer.interactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquareIcon className="h-4 w-4" />
                  Histórico de interações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.interactions.map((interaction) => (
                  <div key={interaction.id} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {interaction.type === "CART_RECOVERY" ? "Recuperação" : interaction.type === "CAMPAIGN" ? "Campanha" : interaction.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(interaction.sentAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{interaction.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — order history */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageIcon className="h-4 w-4" />
                Histórico de pedidos ({orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum pedido encontrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateTime(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.status === "CANCELLED" ? "destructive" : order.status === "FINISHED" ? "secondary" : "default"}>
                            {STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.orderProducts
                            .slice(0, 2)
                            .map((p) => `${p.quantity}x ${p.productNameSnapshot}`)
                            .join(", ")}
                          {order.orderProducts.length > 2 && ` +${order.orderProducts.length - 2}`}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
