"use client";

import { useState, useTransition } from "react";

import {
  createCourierAction,
  updateCourierAction,
} from "@/app/[slug]/logistica-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Courier } from "@fsw/db";

interface CourierFormProps {
  slug: string;
  defaultValues?: Courier;
  onSuccess?: () => void;
}

const WORK_DAYS = [
  { value: "MON", label: "Seg" },
  { value: "TUE", label: "Ter" },
  { value: "WED", label: "Qua" },
  { value: "THU", label: "Qui" },
  { value: "FRI", label: "Sex" },
  { value: "SAT", label: "Sáb" },
  { value: "SUN", label: "Dom" },
];

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

const formatCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
};

export function CourierForm({ slug, defaultValues, onSuccess }: CourierFormProps) {
  const [isPending, startTransition] = useTransition();

  const [phone, setPhone] = useState(defaultValues?.phone ?? "");
  const [cpf, setCpf] = useState(defaultValues?.cpf ?? "");
  const [cep, setCep] = useState(defaultValues?.cep ?? "");
  const [logradouro, setLogradouro] = useState(defaultValues?.logradouro ?? "");
  const [bairro, setBairro] = useState(defaultValues?.bairro ?? "");
  const [cidade, setCidade] = useState(defaultValues?.cidade ?? "");
  const [estado, setEstado] = useState(defaultValues?.estado ?? "");
  const [selectedDays, setSelectedDays] = useState<string[]>(
    defaultValues?.workDays ?? [],
  );

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleCepBlur = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setLogradouro(data.logradouro ?? "");
      setBairro(data.bairro ?? "");
      setCidade(data.localidade ?? "");
      setEstado(data.uf ?? "");
    } catch {
      // busca de CEP silenciosa
    }
  };

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">
      <div className="max-h-[65vh] overflow-y-auto pr-1">
        {/* ── Dados Pessoais ── */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dados Pessoais
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="courier-name">Nome completo *</Label>
            <Input
              id="courier-name"
              name="name"
              placeholder="Ex.: João Silva"
              defaultValue={defaultValues?.name}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="courier-phone">Telefone / WhatsApp *</Label>
              <Input
                id="courier-phone"
                name="phone"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courier-cpf">CPF</Label>
              <Input
                id="courier-cpf"
                name="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="courier-rg">RG</Label>
            <Input
              id="courier-rg"
              name="rg"
              placeholder="00.000.000-0"
              defaultValue={defaultValues?.rg ?? ""}
            />
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="my-4 border-t" />

        {/* ── Endereço ── */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Endereço
        </p>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="courier-cep">CEP</Label>
              <Input
                id="courier-cep"
                name="cep"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => setCep(formatCep(e.target.value))}
                onBlur={handleCepBlur}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="courier-logradouro">Logradouro</Label>
              <Input
                id="courier-logradouro"
                name="logradouro"
                placeholder="Rua, Av., etc."
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="courier-numero">Número</Label>
              <Input
                id="courier-numero"
                name="numero"
                placeholder="123"
                defaultValue={defaultValues?.numero ?? ""}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="courier-complemento">Complemento</Label>
              <Input
                id="courier-complemento"
                name="complemento"
                placeholder="Apto, Bloco..."
                defaultValue={defaultValues?.complemento ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="courier-bairro">Bairro</Label>
              <Input
                id="courier-bairro"
                name="bairro"
                placeholder="Bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courier-cidade">Cidade</Label>
              <Input
                id="courier-cidade"
                name="cidade"
                placeholder="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courier-estado">Estado</Label>
              <Input
                id="courier-estado"
                name="estado"
                placeholder="UF"
                maxLength={2}
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="my-4 border-t" />

        {/* ── Habilitação ── */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Carteira de Habilitação (CNH)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="courier-cnh-numero">Número CNH</Label>
            <Input
              id="courier-cnh-numero"
              name="cnhNumero"
              placeholder="00000000000"
              defaultValue={defaultValues?.cnhNumero ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="courier-cnh-categoria">Categoria</Label>
            <select
              id="courier-cnh-categoria"
              name="cnhCategoria"
              defaultValue={defaultValues?.cnhCategoria ?? ""}
              className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="AB">AB</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="courier-cnh-vencimento">Vencimento</Label>
            <Input
              id="courier-cnh-vencimento"
              name="cnhVencimento"
              type="date"
              defaultValue={defaultValues?.cnhVencimento ?? ""}
            />
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="my-4 border-t" />

        {/* ── Veículo e Escala ── */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Veículo e Escala
        </p>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="courier-vehicle">Tipo de veículo</Label>
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
              <Label htmlFor="courier-plate">Placa</Label>
              <Input
                id="courier-plate"
                name="licensePlate"
                placeholder="ABC-1234"
                defaultValue={defaultValues?.licensePlate ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Posse do veículo utilizado</Label>
            <div className="flex gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="usesOwnVehicle"
                  value="on"
                  defaultChecked={defaultValues?.usesOwnVehicle !== false}
                  className="accent-primary"
                />
                Veículo próprio
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="usesOwnVehicle"
                  value=""
                  defaultChecked={defaultValues?.usesOwnVehicle === false}
                  className="accent-primary"
                />
                Veículo da empresa
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dias de trabalho</Label>
            <div className="flex flex-wrap gap-2">
              {WORK_DAYS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDay(value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                    selectedDays.includes(value)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-slate-50 text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedDays.map((day) => (
              <input key={day} type="hidden" name="workDays" value={day} />
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="courier-shift-start">Horário início</Label>
              <Input
                id="courier-shift-start"
                name="shiftStart"
                type="time"
                defaultValue={defaultValues?.shiftStart ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courier-shift-end">Horário fim</Label>
              <Input
                id="courier-shift-end"
                name="shiftEnd"
                type="time"
                defaultValue={defaultValues?.shiftEnd ?? ""}
              />
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="my-4 border-t" />

        {/* ── Status ── */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </p>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-slate-50 px-3 py-2.5 text-sm font-medium">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={defaultValues?.isActive ?? true}
              className="h-4 w-4 rounded"
            />
            Motoboy ativo
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-slate-50 px-3 py-2.5 text-sm font-medium">
            <input
              type="checkbox"
              name="isAvailable"
              defaultChecked={defaultValues?.isAvailable ?? false}
              className="h-4 w-4 rounded"
            />
            Disponível agora para entregas
          </label>
        </div>
      </div>

      <Button type="submit" className="mt-4 w-full" disabled={isPending}>
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
