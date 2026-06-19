"use client";

import { useTransition } from "react";

import {
  createVehicleAction,
  updateVehicleAction,
} from "@/app/[slug]/logistica-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyVehicle } from "@fsw/db";

interface VehicleFormProps {
  slug: string;
  defaultValues?: CompanyVehicle;
  onSuccess?: () => void;
}

export function VehicleForm({ slug, defaultValues, onSuccess }: VehicleFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (defaultValues) {
        formData.set("vehicleId", defaultValues.id);
        await updateVehicleAction(slug, formData);
      } else {
        await createVehicleAction(slug, formData);
      }
      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── Identificação ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="vehicle-brand">Marca *</Label>
          <Input
            id="vehicle-brand"
            name="brand"
            placeholder="Ex.: Honda"
            defaultValue={defaultValues?.brand}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vehicle-model">Modelo *</Label>
          <Input
            id="vehicle-model"
            name="model"
            placeholder="Ex.: CG 160"
            defaultValue={defaultValues?.model}
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="vehicle-year">Ano de fabricação</Label>
          <Input
            id="vehicle-year"
            name="year"
            type="number"
            placeholder="2022"
            min={1900}
            max={new Date().getFullYear() + 1}
            defaultValue={defaultValues?.year ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vehicle-color">Cor</Label>
          <Input
            id="vehicle-color"
            name="color"
            placeholder="Ex.: Vermelho"
            defaultValue={defaultValues?.color ?? ""}
          />
        </div>
      </div>

      {/* ── Documentação ── */}
      <div className="border-t pt-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Documentação
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-plate">Placa *</Label>
            <Input
              id="vehicle-plate"
              name="licensePlate"
              placeholder="ABC-1234"
              defaultValue={defaultValues?.licensePlate}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-renavam">RENAVAM</Label>
              <Input
                id="vehicle-renavam"
                name="renavam"
                placeholder="00000000000"
                defaultValue={defaultValues?.renavam ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-chassi">Chassi</Label>
              <Input
                id="vehicle-chassi"
                name="chassi"
                placeholder="9BWZZZ377VT004251"
                defaultValue={defaultValues?.chassi ?? ""}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Status ── */}
      <div className="border-t pt-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="vehicle-status">Situação do veículo</Label>
          <select
            id="vehicle-status"
            name="status"
            defaultValue={defaultValues?.status ?? "ACTIVE"}
            className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm"
          >
            <option value="ACTIVE">Ativo</option>
            <option value="MAINTENANCE">Em manutenção</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? defaultValues
            ? "Salvando..."
            : "Cadastrando..."
          : defaultValues
            ? "Salvar veículo"
            : "Cadastrar veículo"}
      </Button>
    </form>
  );
}
