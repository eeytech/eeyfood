"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createTableAction,
  updateTableAction,
} from "@/app/(dashboard)/mesas-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { DiningTable } from "@fsw/db";

interface MesaFormProps {
  slug: string;
  defaultValues?: DiningTable;
  onSuccess?: () => void;
}

export function MesaForm({ slug, defaultValues, onSuccess }: MesaFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState<boolean>(defaultValues?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newErrors: Record<string, string> = {};

    const name = formData.get("name")?.toString().trim() ?? "";
    if (!name) {
      newErrors.name = "Informe o nome da mesa.";
    }

    const seats = Number(formData.get("seats"));
    if (!seats || seats <= 0) {
      newErrors.seats = "A capacidade deve ser de no mínimo 1 lugar.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError || "Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setErrors({});

    startTransition(async () => {
      if (defaultValues) {
        formData.set("tableId", defaultValues.id);
        await updateTableAction(slug, formData);
      } else {
        await createTableAction(slug, formData);
      }
      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="mesa-name">Nome da mesa</Label>
        <Input
          id="mesa-name"
          name="name"
          placeholder="Ex.: Mesa 01"
          defaultValue={defaultValues?.name}
          onChange={() => setErrors((prev) => ({ ...prev, name: "" }))}
          className={cn(
            errors.name && "border-rose-500 bg-rose-50/20 focus-visible:ring-rose-500"
          )}
        />
        {errors.name && (
          <p className="text-[11px] font-medium text-rose-500">{errors.name}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mesa-seats">Capacidade (lugares)</Label>
          <Input
            id="mesa-seats"
            name="seats"
            type="number"
            min="1"
            defaultValue={String(defaultValues?.seats ?? 4)}
            onChange={() => setErrors((prev) => ({ ...prev, seats: "" }))}
            className={cn(
              errors.seats && "border-rose-500 bg-rose-50/20 focus-visible:ring-rose-500"
            )}
          />
          {errors.seats && (
            <p className="text-[11px] font-medium text-rose-500">{errors.seats}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mesa-order">Ordem de exibição</Label>
          <Input
            id="mesa-order"
            name="displayOrder"
            type="number"
            min="0"
            defaultValue={String(defaultValues?.displayOrder ?? 0)}
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3">
        <div className="space-y-0.5">
          <Label htmlFor="mesa-active" className="text-xs font-semibold text-slate-800 cursor-pointer">
            Mesa ativa
          </Label>
          <p className="text-[11px] text-slate-500">
            Disponível para abertura e lançamento de comandas no salão
          </p>
        </div>
        <Switch
          id="mesa-active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <input type="hidden" name="isActive" value={isActive ? "on" : "off"} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? defaultValues
            ? "Salvando..."
            : "Cadastrando..."
          : defaultValues
            ? "Salvar mesa"
            : "Cadastrar mesa"}
      </Button>
    </form>
  );
}
