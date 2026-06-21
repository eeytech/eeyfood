"use client";

import type { DeliveryFeeRule } from "@fsw/db";
import { MapIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTransition, useState } from "react";
import { toast } from "sonner";

import {
  criarRegraFreteAction,
  atualizarRegraFreteAction,
  excluirRegraFreteAction,
} from "@/app/[slug]/logistica-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeliveryFeeRulesTabProps {
  slug: string;
  rules: DeliveryFeeRule[];
}

const RULE_TYPE_LABELS: Record<string, string> = {
  RADIUS_KM: "Raio (km)",
  NEIGHBORHOOD: "Bairro",
  CEP_RANGE: "Faixa de CEP",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface RuleFormData {
  name: string;
  type: "RADIUS_KM" | "NEIGHBORHOOD" | "CEP_RANGE";
  fee: string;
  minimumOrderValue: string;
  freeDeliveryThreshold: string;
  maxDistanceKm: string;
  neighborhood: string;
  cepFrom: string;
  cepTo: string;
}

const defaultForm: RuleFormData = {
  name: "",
  type: "RADIUS_KM",
  fee: "0",
  minimumOrderValue: "0",
  freeDeliveryThreshold: "",
  maxDistanceKm: "",
  neighborhood: "",
  cepFrom: "",
  cepTo: "",
};

export function DeliveryFeeRulesTab({ slug, rules: initialRules }: DeliveryFeeRulesTabProps) {
  const [rules, setRules] = useState(initialRules);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<DeliveryFeeRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(defaultForm);

  const openCreate = () => {
    setEditRule(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (rule: DeliveryFeeRule) => {
    setEditRule(rule);
    setForm({
      name: rule.name,
      type: rule.type,
      fee: String(rule.fee),
      minimumOrderValue: String(rule.minimumOrderValue),
      freeDeliveryThreshold: rule.freeDeliveryThreshold != null ? String(rule.freeDeliveryThreshold) : "",
      maxDistanceKm: rule.maxDistanceKm != null ? String(rule.maxDistanceKm) : "",
      neighborhood: rule.neighborhood ?? "",
      cepFrom: rule.cepFrom ?? "",
      cepTo: rule.cepTo ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editRule) {
          fd.set("ruleId", editRule.id);
          await atualizarRegraFreteAction(slug, fd);
          toast.success("Regra atualizada!");
        } else {
          await criarRegraFreteAction(slug, fd);
          toast.success("Regra criada!");
        }
        setDialogOpen(false);
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar regra.");
      }
    });
  };

  const handleDelete = (ruleId: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("ruleId", ruleId);
      await excluirRegraFreteAction(slug, fd);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      toast.success("Regra removida.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">Zonas de Frete</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure taxas de entrega por raio (km), bairro ou faixa de CEP. A primeira regra compatível com o endereço do cliente é aplicada.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={openCreate}>
          <PlusIcon size={14} />
          Nova zona
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
        {rules.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <MapIcon size={32} className="text-slate-200" />
            <p className="text-sm text-muted-foreground">
              Nenhuma zona de frete configurada. A taxa padrão do restaurante será usada.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50/60 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Critério</th>
                <th className="px-4 py-3">Taxa</th>
                <th className="px-4 py-3">Frete grátis a partir de</th>
                <th className="w-20 px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium">{rule.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{RULE_TYPE_LABELS[rule.type] ?? rule.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {rule.type === "RADIUS_KM" && rule.maxDistanceKm != null
                      ? `Até ${rule.maxDistanceKm} km`
                      : rule.type === "NEIGHBORHOOD"
                        ? rule.neighborhood ?? "—"
                        : rule.cepFrom && rule.cepTo
                          ? `${rule.cepFrom} – ${rule.cepTo}`
                          : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(rule.fee)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {rule.freeDeliveryThreshold != null
                      ? formatCurrency(rule.freeDeliveryThreshold)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(rule)}
                      >
                        <PencilIcon size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                        disabled={isPending}
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2Icon size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRule ? "Editar zona de frete" : "Nova zona de frete"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome da zona</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={form.name}
                  placeholder="Ex: Centro, Zona Sul, Até 5km..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type">Tipo de regra</Label>
                <select
                  id="type"
                  name="type"
                  defaultValue={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RuleFormData["type"] }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="RADIUS_KM">Raio em KM</option>
                  <option value="NEIGHBORHOOD">Bairro</option>
                  <option value="CEP_RANGE">Faixa de CEP</option>
                </select>
              </div>

              {form.type === "RADIUS_KM" && (
                <div className="space-y-1.5">
                  <Label htmlFor="maxDistanceKm">Distância máxima (km)</Label>
                  <Input
                    id="maxDistanceKm"
                    name="maxDistanceKm"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={form.maxDistanceKm}
                    placeholder="Ex: 5"
                  />
                </div>
              )}

              {form.type === "NEIGHBORHOOD" && (
                <div className="space-y-1.5">
                  <Label htmlFor="neighborhood">Nome do bairro</Label>
                  <Input
                    id="neighborhood"
                    name="neighborhood"
                    defaultValue={form.neighborhood}
                    placeholder="Ex: Centro"
                  />
                </div>
              )}

              {form.type === "CEP_RANGE" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cepFrom">CEP inicial</Label>
                    <Input id="cepFrom" name="cepFrom" defaultValue={form.cepFrom} placeholder="01000-000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cepTo">CEP final</Label>
                    <Input id="cepTo" name="cepTo" defaultValue={form.cepTo} placeholder="01999-999" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fee">Taxa de entrega (R$)</Label>
                  <Input
                    id="fee"
                    name="fee"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={form.fee}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minimumOrderValue">Pedido mínimo (R$)</Label>
                  <Input
                    id="minimumOrderValue"
                    name="minimumOrderValue"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={form.minimumOrderValue}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="freeDeliveryThreshold">Frete grátis a partir de (R$, opcional)</Label>
                <Input
                  id="freeDeliveryThreshold"
                  name="freeDeliveryThreshold"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={form.freeDeliveryThreshold}
                  placeholder="Deixe vazio para não aplicar"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {editRule ? "Salvar alterações" : "Criar zona"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
