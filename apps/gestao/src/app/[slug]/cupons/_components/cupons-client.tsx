"use client";

import {
  CalendarIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, useTransition } from "react";

import {
  createCouponAction,
  deleteCouponAction,
  updateCouponAction,
} from "@/app/[slug]/coupons-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Coupon } from "@fsw/db";

interface CuponsClientProps {
  slug: string;
  cupons: Coupon[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDatetime(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function toDatetimeLocal(date: Date | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingCoupon(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description ?? "",
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minimumOrderValue: String(coupon.minimumOrderValue),
      maxDiscountAmount: coupon.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : "",
      usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
      perCustomerLimit: String(coupon.perCustomerLimit),
      startsAt: toDatetimeLocal(coupon.startsAt),
      endsAt: toDatetimeLocal(coupon.endsAt),
      isActive: coupon.isActive,
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (form.isActive) {
      formData.set("isActive", "on");
    } else {
      formData.delete("isActive");
    }

    startTransition(async () => {
      try {
        if (editingCoupon) {
          formData.set("couponId", editingCoupon.id);
          await updateCouponAction(slug, formData);
        } else {
          await createCouponAction(slug, formData);
        }
        setDialogOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar cupom.");
      }
    });
  };

  const handleDelete = () => {
    if (!deletingCoupon) return;
    const formData = new FormData();
    formData.set("couponId", deletingCoupon.id);
    startTransition(async () => {
      try {
        await deleteCouponAction(slug, formData);
        setDeleteDialogOpen(false);
        setDeletingCoupon(null);
      } catch {
        // silent — revalidation handles list update
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cupons de Desconto</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os cupons de desconto do seu restaurante.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <PlusIcon size={16} />
          Novo Cupom
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Mín. Pedido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <TagIcon size={32} className="mx-auto mb-2 opacity-30" />
                  Nenhum cupom cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              cupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div>
                      <p className="font-mono font-semibold">{coupon.code}</p>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground">{coupon.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {coupon.discountType === "PERCENTAGE"
                      ? `${coupon.discountValue}%`
                      : formatCurrency(coupon.discountValue)}
                  </TableCell>
                  <TableCell>
                    {coupon.minimumOrderValue > 0
                      ? formatCurrency(coupon.minimumOrderValue)
                      : "Sem mínimo"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.isActive ? "default" : "secondary"}>
                      {coupon.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {coupon.usageCount}
                      {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarIcon size={12} />
                      <span>
                        {coupon.startsAt || coupon.endsAt
                          ? `${formatDatetime(coupon.startsAt)} → ${formatDatetime(coupon.endsAt)}`
                          : "Sem validade"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(coupon)}
                      >
                        <PencilIcon size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingCoupon(coupon);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2Icon size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
            <DialogDescription>
              {editingCoupon
                ? "Altere as informações do cupom de desconto."
                : "Preencha os dados do novo cupom de desconto."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="code">Código do Cupom</Label>
                <Input
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") }))
                  }
                  placeholder="EX: PROMO10"
                  required
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Desconto de boas-vindas"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="discountType">Tipo de Desconto</Label>
                <Select
                  name="discountType"
                  value={form.discountType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, discountType: v as "PERCENTAGE" | "FIXED" }))
                  }
                >
                  <SelectTrigger id="discountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
                    <SelectItem value="FIXED">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="discountValue">
                  {form.discountType === "PERCENTAGE" ? "Percentual (%)" : "Valor (R$)"}
                </Label>
                <Input
                  id="discountValue"
                  name="discountValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minimumOrderValue">Valor Mínimo do Pedido (R$)</Label>
                <Input
                  id="minimumOrderValue"
                  name="minimumOrderValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimumOrderValue}
                  onChange={(e) => setForm((f) => ({ ...f, minimumOrderValue: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maxDiscountAmount">Desconto Máximo (R$)</Label>
                <Input
                  id="maxDiscountAmount"
                  name="maxDiscountAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))}
                  placeholder="Sem limite"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usageLimit">Limite Global de Usos</Label>
                <Input
                  id="usageLimit"
                  name="usageLimit"
                  type="number"
                  min="1"
                  step="1"
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                  placeholder="Ilimitado"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="perCustomerLimit">Limite por Cliente</Label>
                <Input
                  id="perCustomerLimit"
                  name="perCustomerLimit"
                  type="number"
                  min="1"
                  step="1"
                  value={form.perCustomerLimit}
                  onChange={(e) => setForm((f) => ({ ...f, perCustomerLimit: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="startsAt">Início da Vigência</Label>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endsAt">Fim da Vigência</Label>
                <Input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
              </div>

              <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Cupom Ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Desative para suspender o cupom sem excluí-lo.
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : editingCoupon ? "Salvar Alterações" : "Criar Cupom"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Cupom</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cupom{" "}
              <span className="font-mono font-semibold">{deletingCoupon?.code}</span>? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
