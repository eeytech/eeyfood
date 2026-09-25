"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import type { InventoryActionResult } from "@/app/(dashboard)/actions";
import {
  createInventoryItemAction,
  updateInventoryItemAction,
} from "@/app/(dashboard)/actions";
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
import type { InventoryItem } from "@fsw/db";

const TYPES = [
  { value: "INSUMO", label: "Insumo" },
  { value: "EMBALAGEM", label: "Embalagem" },
  { value: "EQUIPAMENTO", label: "Equipamento" },
  { value: "LIMPEZA", label: "Limpeza" },
  { value: "OUTROS", label: "Outros" },
] as const;

const UNITS = [
  { value: "UN", label: "Unidade (UN)" },
  { value: "KG", label: "Quilograma (KG)" },
  { value: "G", label: "Grama (G)" },
  { value: "L", label: "Litro (L)" },
  { value: "ML", label: "Mililitro (ML)" },
  { value: "CX", label: "Caixa (CX)" },
  { value: "PCT", label: "Pacote (PCT)" },
  { value: "M", label: "Metro (M)" },
] as const;

interface InventoryFormDialogProps {
  slug: string;
  item?: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InventoryFormDialog({
  slug,
  item,
  open,
  onOpenChange,
  onSuccess,
}: InventoryFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!item;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (isEditing) {
      formData.set("itemId", item.id);
    }

    startTransition(async () => {
      let result: InventoryActionResult;
      if (isEditing) {
        result = await updateInventoryItemAction(slug, formData);
      } else {
        result = await createInventoryItemAction(slug, formData);
      }
      if (result.success) {
        toast.success(
          isEditing ? "Item atualizado com sucesso!" : "Item cadastrado com sucesso!",
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error ?? "Erro ao salvar item.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg border-slate-200 bg-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-slate-900">
            {isEditing ? "Editar item de inventário" : "Novo item de inventário"}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {isEditing
              ? `Editando: ${item.name}`
              : "Cadastre um insumo, embalagem, equipamento ou material interno."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-name" className="text-xs font-semibold text-slate-700">
              Nome do Item
            </Label>
            <Input
              id="inv-name"
              name="name"
              placeholder="Ex.: Embalagem pizza G, Luva de borracha..."
              defaultValue={item?.name ?? ""}
              required
              className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-desc" className="text-xs font-semibold text-slate-700">
              Descrição (Opcional)
            </Label>
            <Input
              id="inv-desc"
              name="description"
              placeholder="Detalhes adicionais, marca recomendada..."
              defaultValue={item?.description ?? ""}
              className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label htmlFor="inv-type" className="text-xs font-semibold text-slate-700">
                Tipo
              </Label>
              <select
                id="inv-type"
                name="type"
                defaultValue={item?.type ?? "INSUMO"}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unidade de medida */}
            <div className="space-y-1.5">
              <Label htmlFor="inv-unit" className="text-xs font-semibold text-slate-700">
                Unidade de Medida
              </Label>
              <select
                id="inv-unit"
                name="unitOfMeasure"
                defaultValue={item?.unitOfMeasure ?? "UN"}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SKU */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-sku" className="text-xs font-semibold text-slate-700">
              SKU / Código Interno
            </Label>
            <Input
              id="inv-sku"
              name="sku"
              placeholder="Ex.: EMB-PIZ-G"
              defaultValue={item?.sku ?? ""}
              className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-sm focus:bg-white"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Quantidade */}
            <div className="space-y-1.5">
              <Label htmlFor="inv-qty" className="text-xs font-semibold text-slate-700">
                Quantidade Atual
              </Label>
              <Input
                id="inv-qty"
                name="currentQuantity"
                type="number"
                min="0"
                step="any"
                defaultValue={item?.currentQuantity ?? 0}
                required
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
              />
            </div>

            {/* Alerta */}
            <div className="space-y-1.5">
              <Label htmlFor="inv-threshold" className="text-xs font-semibold text-slate-700">
                Alerta de Saldo Mínimo
              </Label>
              <Input
                id="inv-threshold"
                name="lowStockThreshold"
                type="number"
                min="0"
                step="any"
                defaultValue={item?.lowStockThreshold ?? 0}
                required
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-10 rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              {isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
