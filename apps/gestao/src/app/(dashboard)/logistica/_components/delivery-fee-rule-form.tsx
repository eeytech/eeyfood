"use client";

import { useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import type { DeliveryFeeRule } from "@fsw/db";

import {
  atualizarRegraFreteAction,
  criarRegraFreteAction,
} from "@/app/(dashboard)/logistica-actions";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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

interface DeliveryFeeRuleFormProps {
  slug: string;
  defaultValues?: DeliveryFeeRule;
  onSuccess?: (rule: DeliveryFeeRule) => void;
  onCancel?: () => void;
}

const formatCurrencyDisplay = (num?: number | string | null): string => {
  if (num == null || num === "") return "";
  const n = typeof num === "number" ? num : parseFloat(String(num));
  if (isNaN(n)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const handleCurrencyInputChange = (valueStr: string): string => {
  const digits = valueStr.replace(/\D/g, "");
  if (!digits) return "";
  const numeric = parseInt(digits, 10) / 100;
  return numeric.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrencyToRaw = (valueStr: string): string => {
  if (!valueStr) return "0";
  const digits = valueStr.replace(/\D/g, "");
  if (!digits) return "0";
  const numeric = parseInt(digits, 10) / 100;
  return numeric.toFixed(2);
};

const formatCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
};

export function DeliveryFeeRuleForm({
  slug,
  defaultValues,
  onSuccess,
  onCancel,
}: DeliveryFeeRuleFormProps) {
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: defaultValues?.name ?? "",
    type: defaultValues?.type ?? "NEIGHBORHOOD",
    fee: defaultValues?.fee != null ? formatCurrencyDisplay(defaultValues.fee) : "",
    minimumOrderValue:
      defaultValues?.minimumOrderValue != null && defaultValues.minimumOrderValue > 0
        ? formatCurrencyDisplay(defaultValues.minimumOrderValue)
        : defaultValues
          ? "0,00"
          : "",
    freeDeliveryThreshold:
      defaultValues?.freeDeliveryThreshold != null
        ? formatCurrencyDisplay(defaultValues.freeDeliveryThreshold)
        : "",
    maxDistanceKm:
      defaultValues?.maxDistanceKm != null ? String(defaultValues.maxDistanceKm) : "",
    neighborhood: defaultValues?.neighborhood ?? "",
    cepFrom: defaultValues?.cepFrom ? formatCep(defaultValues.cepFrom) : "",
    cepTo: defaultValues?.cepTo ? formatCep(defaultValues.cepTo) : "",
    displayOrder: String(defaultValues?.displayOrder ?? 0),
    isActive: defaultValues?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Informe o nome de identificação da zona.");
      return;
    }

    if (formData.type === "NEIGHBORHOOD" && !formData.neighborhood.trim()) {
      toast.error("Informe o nome do bairro.");
      return;
    }

    if (formData.type === "RADIUS_KM" && !formData.maxDistanceKm.trim()) {
      toast.error("Informe a distância máxima em km.");
      return;
    }

    if (formData.type === "CEP_RANGE") {
      if (!formData.cepFrom.trim()) {
        toast.error("Informe o CEP inicial.");
        return;
      }
      if (!formData.cepTo.trim()) {
        toast.error("Informe o CEP final.");
        return;
      }
    }

    if (!formData.fee.trim()) {
      toast.error("Informe a taxa de entrega.");
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("name", formData.name.trim());
        fd.set("type", formData.type);
        fd.set("fee", parseCurrencyToRaw(formData.fee));
        fd.set(
          "minimumOrderValue",
          formData.minimumOrderValue.trim()
            ? parseCurrencyToRaw(formData.minimumOrderValue)
            : "0",
        );
        if (formData.freeDeliveryThreshold.trim()) {
          fd.set(
            "freeDeliveryThreshold",
            parseCurrencyToRaw(formData.freeDeliveryThreshold),
          );
        }
        if (formData.type === "RADIUS_KM" && formData.maxDistanceKm.trim()) {
          fd.set("maxDistanceKm", formData.maxDistanceKm.trim());
        }
        if (formData.type === "NEIGHBORHOOD" && formData.neighborhood.trim()) {
          fd.set("neighborhood", formData.neighborhood.trim());
        }
        if (formData.type === "CEP_RANGE") {
          fd.set("cepFrom", formData.cepFrom.trim());
          fd.set("cepTo", formData.cepTo.trim());
        }
        fd.set("displayOrder", formData.displayOrder || "0");
        fd.set("isActive", formData.isActive ? "true" : "false");

        if (defaultValues) {
          fd.set("ruleId", defaultValues.id);
          const updated = await atualizarRegraFreteAction(slug, fd);
          toast.success("Zona de frete atualizada com sucesso!");
          onSuccess?.(updated);
        } else {
          const created = await criarRegraFreteAction(slug, fd);
          toast.success("Nova zona de frete criada com sucesso!");
          onSuccess?.(created);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar zona.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0 pt-1">
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        {/* Nome da Zona */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
            Nome de identificação
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Centro, Zona Sul, Até 5km..."
            className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
            required
          />
        </div>

        {/* Tipo de Regra */}
        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-xs font-semibold text-slate-700">
            Critério de aplicação
          </Label>
          <Select
            value={formData.type}
            onValueChange={(val: "RADIUS_KM" | "NEIGHBORHOOD" | "CEP_RANGE") =>
              setFormData((f) => ({ ...f, type: val }))
            }
          >
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-primary">
              <SelectValue placeholder="Selecione o critério" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 bg-white shadow-xl">
              <SelectItem value="NEIGHBORHOOD" className="text-xs font-medium">
                Bairro (Identificação por nome)
              </SelectItem>
              <SelectItem value="RADIUS_KM" className="text-xs font-medium">
                Raio em KM (Linha reta da loja)
              </SelectItem>
              <SelectItem value="CEP_RANGE" className="text-xs font-medium">
                Faixa de CEP (Faixa numérica)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campos condicionais por Tipo */}
        {formData.type === "NEIGHBORHOOD" && (
          <div className="space-y-1.5">
            <Label htmlFor="neighborhood" className="text-xs font-semibold text-slate-700">
              Nome do Bairro
            </Label>
            <Input
              id="neighborhood"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={(e) =>
                setFormData((f) => ({ ...f, neighborhood: e.target.value }))
              }
              placeholder="Ex: Centro, Vila Nova, Jardim das Flores..."
              className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              required
            />
            <p className="text-[11px] text-slate-500">
              A comparação ignora acentuação e maiúsculas/minúsculas automaticamente.
            </p>
          </div>
        )}

        {formData.type === "RADIUS_KM" && (
          <div className="space-y-1.5">
            <Label htmlFor="maxDistanceKm" className="text-xs font-semibold text-slate-700">
              Distância Máxima (km)
            </Label>
            <Input
              id="maxDistanceKm"
              name="maxDistanceKm"
              type="number"
              step="0.1"
              min="0.1"
              value={formData.maxDistanceKm}
              onChange={(e) =>
                setFormData((f) => ({ ...f, maxDistanceKm: e.target.value }))
              }
              placeholder="Ex: 5"
              className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              required
            />
            <p className="text-[11px] text-slate-500">
              A distância é calculada das coordenadas cadastradas da loja até o endereço
              do cliente.
            </p>
          </div>
        )}

        {formData.type === "CEP_RANGE" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cepFrom" className="text-xs font-semibold text-slate-700">
                CEP Inicial
              </Label>
              <Input
                id="cepFrom"
                name="cepFrom"
                value={formData.cepFrom}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, cepFrom: formatCep(e.target.value) }))
                }
                placeholder="00000-000"
                maxLength={9}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cepTo" className="text-xs font-semibold text-slate-700">
                CEP Final
              </Label>
              <Input
                id="cepTo"
                name="cepTo"
                value={formData.cepTo}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, cepTo: formatCep(e.target.value) }))
                }
                placeholder="99999-999"
                maxLength={9}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                required
              />
            </div>
          </div>
        )}

        {/* Valores financeiros com máscara de moeda */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fee" className="text-xs font-semibold text-slate-700">
              Taxa de Entrega (R$)
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                R$
              </span>
              <Input
                id="fee"
                name="fee"
                value={formData.fee}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    fee: handleCurrencyInputChange(e.target.value),
                  }))
                }
                placeholder="0,00"
                className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-primary"
                inputMode="numeric"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="minimumOrderValue" className="text-xs font-semibold text-slate-700">
              Pedido Mínimo (R$)
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                R$
              </span>
              <Input
                id="minimumOrderValue"
                name="minimumOrderValue"
                value={formData.minimumOrderValue}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    minimumOrderValue: handleCurrencyInputChange(e.target.value),
                  }))
                }
                placeholder="0,00"
                className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        {/* Frete Grátis Acima de com máscara de moeda */}
        <div className="space-y-1.5">
          <Label htmlFor="freeDeliveryThreshold" className="text-xs font-semibold text-slate-700">
            Frete Grátis a partir de (R$){" "}
            <span className="font-normal text-slate-400">(opcional)</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
              R$
            </span>
            <Input
              id="freeDeliveryThreshold"
              name="freeDeliveryThreshold"
              value={formData.freeDeliveryThreshold}
              onChange={(e) =>
                setFormData((f) => ({
                  ...f,
                  freeDeliveryThreshold: handleCurrencyInputChange(e.target.value),
                }))
              }
              placeholder="0,00 (deixe em branco se não houver)"
              className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              inputMode="numeric"
            />
          </div>
        </div>

        {/* Status e Prioridade */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <div>
            <Label className="text-xs font-semibold text-slate-900">
              Zona Ativa no Sistema
            </Label>
            <p className="text-[11px] text-slate-500">
              Desative temporariamente sem perder as configurações.
            </p>
          </div>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData((f) => ({ ...f, isActive: checked }))
            }
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
          />
        </div>
      </div>

      <DialogFooter className="gap-2 pt-4 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending && <Loader2Icon size={14} className="mr-1.5 animate-spin" />}
          {defaultValues ? "Salvar Alterações" : "Cadastrar Zona de Frete"}
        </Button>
      </DialogFooter>
    </form>
  );
}
