"use client";

import { useTransition } from "react";

import type { InventoryActionResult } from "@/app/[slug]/actions";
import { createInventoryItemAction, updateInventoryItemAction } from "@/app/[slug]/actions";
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
        onOpenChange(false);
        onSuccess?.();
      } else {
        alert(result.error ?? "Erro ao salvar item.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar item" : "Novo item de inventário"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editando: ${item.name}`
              : "Cadastre um insumo, embalagem, equipamento ou material de apoio."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">Nome *</Label>
            <Input
              id="inv-name"
              name="name"
              placeholder="Ex.: Embalagem pizza G, Luva de borracha..."
              defaultValue={item?.name ?? ""}
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-desc">Descrição</Label>
            <Input
              id="inv-desc"
              name="description"
              placeholder="Opcional — detalhes adicionais"
              defaultValue={item?.description ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label htmlFor="inv-type">Tipo *</Label>
              <select
                id="inv-type"
                name="type"
                defaultValue={item?.type ?? "INSUMO"}
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
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
              <Label htmlFor="inv-unit">Unidade *</Label>
              <select
                id="inv-unit"
                name="unitOfMeasure"
                defaultValue={item?.unitOfMeasure ?? "UN"}
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
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
            <Label htmlFor="inv-sku">SKU / Código</Label>
            <Input
              id="inv-sku"
              name="sku"
              placeholder="Ex.: EMB-PIZ-G"
              defaultValue={item?.sku ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Quantidade */}
            <div className="space-y-1.5">
              <Label htmlFor="inv-qty">Quantidade atual *</Label>
              <Input
                id="inv-qty"
                name="currentQuantity"
                type="number"
                min="0"
                step="any"
                defaultValue={item?.currentQuantity ?? 0}
                required
              />
            </div>

            {/* Alerta */}
            <div className="space-y-1.5">
              <Label htmlFor="inv-threshold">Alerta de baixo estoque</Label>
              <Input
                id="inv-threshold"
                name="lowStockThreshold"
                type="number"
                min="0"
                step="any"
                defaultValue={item?.lowStockThreshold ?? 0}
              />
            </div>
          </div>

          {/* Custo unitário */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-cost">Custo unitário (R$)</Label>
            <Input
              id="inv-cost"
              name="unitCost"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              defaultValue={item?.unitCost != null ? String(item.unitCost) : ""}
            />
          </div>

          {/* Motivo do ajuste (apenas edição) */}
          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="inv-reason">Motivo do ajuste de quantidade</Label>
              <Input
                id="inv-reason"
                name="reason"
                placeholder="Ex.: Reposição do fornecedor, perda/avaria..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
