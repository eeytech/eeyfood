"use client";

import { useTransition } from "react";

import {
  createTableAction,
  updateTableAction,
} from "@/app/[slug]/mesas-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DiningTable } from "@fsw/db";

interface MesaFormProps {
  slug: string;
  defaultValues?: DiningTable;
  onSuccess?: () => void;
}

export function MesaForm({ slug, defaultValues, onSuccess }: MesaFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="mesa-name">Nome da mesa</Label>
        <Input
          id="mesa-name"
          name="name"
          placeholder="Ex.: Mesa 01"
          defaultValue={defaultValues?.name}
          required
        />
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
            required
          />
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

      <label className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-slate-50 px-3 py-2.5 text-sm font-medium">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
          className="h-4 w-4 rounded"
        />
        Mesa ativa
      </label>

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
