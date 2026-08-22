"use client";

import {
  CircleDollarSignIcon,
  CoinsIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, useTransition } from "react";

import {
  createLoyaltyRuleAction,
  deleteLoyaltyRuleAction,
  updateLoyaltyRuleAction,
} from "@/app/(dashboard)/cashback-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { RegraLoyaltyComDetalhes } from "@/lib/admin-queries";
import type { MenuCategory, Product } from "@fsw/db";

type CriterionType = "minOrderValue" | "category" | "product";

interface CashbackClientProps {
  slug: string;
  regras: RegraLoyaltyComDetalhes[];
  categorias: MenuCategory[];
  produtos: Array<Product & { categoryName: string; categoryId: string }>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function ruleCriterionLabel(rule: RegraLoyaltyComDetalhes): string {
  if (rule.product) return `Produto: ${rule.product.name}`;
  if (rule.menuCategory) return `Categoria: ${rule.menuCategory.name}`;
  return `Pedido mín. ${formatCurrency(rule.minOrderValue)}`;
}

function ruleCriterionType(rule: RegraLoyaltyComDetalhes): CriterionType {
  if (rule.productId) return "product";
  if (rule.menuCategoryId) return "category";
  return "minOrderValue";
}

function toDatetimeLocal(date: Date | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_FORM = {
  name: "",
  cashbackPercent: "",
  criterionType: "minOrderValue" as CriterionType,
  minOrderValue: "0",
  menuCategoryId: "",
  productId: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

type FormState = typeof EMPTY_FORM;

export function CashbackClient({ slug, regras, categorias, produtos }: CashbackClientProps) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RegraLoyaltyComDetalhes | null>(null);
  const [deletingRule, setDeletingRule] = useState<RegraLoyaltyComDetalhes | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (rule: RegraLoyaltyComDetalhes) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      cashbackPercent: String(rule.cashbackPercent),
      criterionType: ruleCriterionType(rule),
      minOrderValue: String(rule.minOrderValue),
      menuCategoryId: rule.menuCategoryId ?? "",
      productId: rule.productId ?? "",
      startsAt: toDatetimeLocal(rule.startsAt),
      endsAt: toDatetimeLocal(rule.endsAt),
      isActive: rule.isActive,
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
        if (editingRule) {
          formData.set("ruleId", editingRule.id);
          await updateLoyaltyRuleAction(slug, formData);
        } else {
          await createLoyaltyRuleAction(slug, formData);
        }
        setDialogOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar regra.");
      }
    });
  };

  const handleDelete = () => {
    if (!deletingRule) return;
    const formData = new FormData();
    formData.set("ruleId", deletingRule.id);
    startTransition(async () => {
      try {
        await deleteLoyaltyRuleAction(slug, formData);
        setDeleteDialogOpen(false);
        setDeletingRule(null);
      } catch {
        // silent — revalidation handles list update
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Regras de Cashback</h1>
          <p className="text-sm text-muted-foreground">
            Configure as regras de cashback por valor, categoria ou produto.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <PlusIcon size={16} />
          Nova Regra
        </Button>
      </div>

      {regras.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-muted-foreground">
          <CoinsIcon size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Nenhuma regra de cashback cadastrada.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {regras.map((rule) => (
            <Card key={rule.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{rule.name}</p>
                      <Badge variant={rule.isActive ? "default" : "secondary"} className="shrink-0">
                        {rule.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {rule.cashbackPercent}%
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {rule.productId ? (
                        <PackageIcon size={12} />
                      ) : rule.menuCategoryId ? (
                        <TagIcon size={12} />
                      ) : (
                        <CircleDollarSignIcon size={12} />
                      )}
                      <span>{ruleCriterionLabel(rule)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                      <PencilIcon size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingRule(rule);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2Icon size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Regra" : "Nova Regra de Cashback"}</DialogTitle>
            <DialogDescription>
              {editingRule
                ? "Altere as informações da regra de cashback."
                : "Defina o critério e o percentual de cashback a ser concedido."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da Regra</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Cashback de Inauguração"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cashbackPercent">Percentual de Cashback (%)</Label>
              <Input
                id="cashbackPercent"
                name="cashbackPercent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.cashbackPercent}
                onChange={(e) => setForm((f) => ({ ...f, cashbackPercent: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="criterionType">Critério de Aplicação</Label>
              <Select
                name="criterionType"
                value={form.criterionType}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    criterionType: v as CriterionType,
                    minOrderValue: "0",
                    menuCategoryId: "",
                    productId: "",
                  }))
                }
              >
                <SelectTrigger id="criterionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minOrderValue">Valor Mínimo do Pedido</SelectItem>
                  <SelectItem value="category">Categoria Específica</SelectItem>
                  <SelectItem value="product">Produto Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.criterionType === "minOrderValue" && (
              <div className="space-y-1.5">
                <Label htmlFor="minOrderValue">Valor Mínimo do Pedido (R$)</Label>
                <Input
                  id="minOrderValue"
                  name="minOrderValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minOrderValue}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
                />
              </div>
            )}

            {form.criterionType === "category" && (
              <div className="space-y-1.5">
                <Label htmlFor="menuCategoryId">Categoria</Label>
                <Select
                  name="menuCategoryId"
                  value={form.menuCategoryId}
                  onValueChange={(v) => setForm((f) => ({ ...f, menuCategoryId: v }))}
                >
                  <SelectTrigger id="menuCategoryId">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.length === 0 ? (
                      <SelectItem value="" disabled>
                        Nenhuma categoria cadastrada
                      </SelectItem>
                    ) : (
                      categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.criterionType === "product" && (
              <div className="space-y-1.5">
                <Label htmlFor="productId">Produto</Label>
                <Select
                  name="productId"
                  value={form.productId}
                  onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}
                >
                  <SelectTrigger id="productId">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.length === 0 ? (
                      <SelectItem value="" disabled>
                        Nenhum produto cadastrado
                      </SelectItem>
                    ) : (
                      produtos.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id}>
                          <span>{prod.name}</span>
                          <span className="ml-1 text-muted-foreground">
                            — {prod.categoryName}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startsAt">Início da Validade</Label>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endsAt">Fim da Validade</Label>
                <Input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Regra Ativa</p>
                <p className="text-xs text-muted-foreground">
                  Desative para suspender sem excluir a regra.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
              />
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
                {isPending ? "Salvando..." : editingRule ? "Salvar Alterações" : "Criar Regra"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Regra</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a regra{" "}
              <span className="font-semibold">{deletingRule?.name}</span>? Esta ação não pode ser
              desfeita.
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
