"use client";

import { useTransition } from "react";

import {
  createCourierAction,
  updateCourierAction,
} from "@/app/[slug]/logistica-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Courier } from "@fsw/db";

interface CourierFormProps {
  slug: string;
  defaultValues?: Courier;
  onSuccess?: () => void;
}

export function CourierForm({ slug, defaultValues, onSuccess }: CourierFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (defaultValues) {
        formData.set("courierId", defaultValues.id);
        await updateCourierAction(slug, formData);
      } else {
        await createCourierAction(slug, formData);
      }
      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="courier-name">Nome completo</Label>
        <Input
          id="courier-name"
          name="name"
          placeholder="Ex.: João Silva"
          defaultValue={defaultValues?.name}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="courier-phone">Telefone / WhatsApp</Label>
        <Input
          id="courier-phone"
          name="phone"
          placeholder="(11) 99999-9999"
          defaultValue={defaultValues?.phone}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="courier-vehicle">Veículo</Label>
          <select
            id="courier-vehicle"
            name="vehicleType"
            defaultValue={defaultValues?.vehicleType ?? "MOTO"}
            className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm"
          >
            <option value="MOTO">Moto</option>
            <option value="BIKE">Bike</option>
            <option value="CARRO">Carro</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="courier-plate">Placa (opcional)</Label>
          <Input
            id="courier-plate"
            name="licensePlate"
            placeholder="ABC-1234"
            defaultValue={defaultValues?.licensePlate ?? ""}
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
        Motoboy ativo
      </label>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? defaultValues
            ? "Salvando..."
            : "Cadastrando..."
          : defaultValues
            ? "Salvar motoboy"
            : "Cadastrar motoboy"}
      </Button>
    </form>
  );
}
