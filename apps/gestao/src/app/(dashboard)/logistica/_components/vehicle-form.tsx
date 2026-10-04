"use client";

import { useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";

import {
  createVehicleAction,
  updateVehicleAction,
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
import type { CompanyVehicle } from "@fsw/db";

interface VehicleFormProps {
  slug: string;
  defaultValues?: CompanyVehicle;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VehicleForm({
  slug,
  defaultValues,
  onSuccess,
  onCancel,
}: VehicleFormProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>(defaultValues?.status ?? "ACTIVE");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("status", status);

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-0 pt-1">
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        {/* ── Identificação ── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Identificação
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="vehicle-brand"
                  className="text-xs font-semibold text-slate-700"
                >
                  Marca *
                </Label>
                <Input
                  id="vehicle-brand"
                  name="brand"
                  placeholder="Ex.: Honda"
                  defaultValue={defaultValues?.brand}
                  required
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="vehicle-model"
                  className="text-xs font-semibold text-slate-700"
                >
                  Modelo *
                </Label>
                <Input
                  id="vehicle-model"
                  name="model"
                  placeholder="Ex.: CG 160"
                  defaultValue={defaultValues?.model}
                  required
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="vehicle-year"
                  className="text-xs font-semibold text-slate-700"
                >
                  Ano de fabricação
                </Label>
                <Input
                  id="vehicle-year"
                  name="year"
                  type="number"
                  placeholder="2022"
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  defaultValue={defaultValues?.year ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="vehicle-color"
                  className="text-xs font-semibold text-slate-700"
                >
                  Cor
                </Label>
                <Input
                  id="vehicle-color"
                  name="color"
                  placeholder="Ex.: Vermelho"
                  defaultValue={defaultValues?.color ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Documentação ── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Documentação
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="vehicle-plate"
                className="text-xs font-semibold text-slate-700"
              >
                Placa *
              </Label>
              <Input
                id="vehicle-plate"
                name="licensePlate"
                placeholder="ABC-1234"
                defaultValue={defaultValues?.licensePlate}
                required
                className="h-10 rounded-xl border-slate-200 bg-white uppercase text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="vehicle-renavam"
                  className="text-xs font-semibold text-slate-700"
                >
                  RENAVAM
                </Label>
                <Input
                  id="vehicle-renavam"
                  name="renavam"
                  placeholder="00000000000"
                  defaultValue={defaultValues?.renavam ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="vehicle-chassi"
                  className="text-xs font-semibold text-slate-700"
                >
                  Chassi
                </Label>
                <Input
                  id="vehicle-chassi"
                  name="chassi"
                  placeholder="9BWZZZ377VT004251"
                  defaultValue={defaultValues?.chassi ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Status ── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Status
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="vehicle-status"
              className="text-xs font-semibold text-slate-700"
            >
              Situação do veículo
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger
                id="vehicle-status"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-primary"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 bg-white shadow-xl">
                <SelectItem value="ACTIVE" className="text-xs font-medium">
                  Ativo
                </SelectItem>
                <SelectItem value="MAINTENANCE" className="text-xs font-medium">
                  Em manutenção
                </SelectItem>
                <SelectItem value="INACTIVE" className="text-xs font-medium">
                  Inativo
                </SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="status" value={status} />
          </div>
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
          {isPending
            ? defaultValues
              ? "Salvando..."
              : "Cadastrando..."
            : defaultValues
              ? "Salvar Alterações"
              : "Cadastrar Veículo"}
        </Button>
      </DialogFooter>
    </form>
  );
}
