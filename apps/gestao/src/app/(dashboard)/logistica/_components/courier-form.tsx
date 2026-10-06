"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, SearchIcon } from "lucide-react";

import {
  createCourierAction,
  updateCourierAction,
} from "@/app/(dashboard)/logistica-actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { BRAZIL_UFS } from "@/lib/address-utils";
import { cn } from "@/lib/utils";
import type { Courier } from "@fsw/db";

interface CourierFormProps {
  slug: string;
  defaultValues?: Courier;
  onSuccess?: () => void;
  onCancel?: () => void;
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

const formatRg = (v: string) => {
  const cleaned = v.replace(/[^0-9xX]/g, "").toUpperCase().slice(0, 9);
  return cleaned
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})([0-9X]{1,2})$/, ".$1-$2");
};

const formatCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
};

const formatCnh = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 9) return d;
  return `${d.slice(0, 9)}-${d.slice(9)}`;
};

export function CourierForm({ slug, defaultValues, onSuccess, onCancel }: CourierFormProps) {
  const [isPending, startTransition] = useTransition();

  const [phone, setPhone] = useState(defaultValues?.phone ? formatPhone(defaultValues.phone) : "");
  const [cpf, setCpf] = useState(defaultValues?.cpf ? formatCpf(defaultValues.cpf) : "");
  const [rg, setRg] = useState(defaultValues?.rg ? formatRg(defaultValues.rg) : "");
  const [cep, setCep] = useState(defaultValues?.cep ? formatCep(defaultValues.cep) : "");
  const [logradouro, setLogradouro] = useState(defaultValues?.logradouro ?? "");
  const [numero, setNumero] = useState(defaultValues?.numero ?? "");
  const [complemento, setComplemento] = useState(defaultValues?.complemento ?? "");
  const [bairro, setBairro] = useState(defaultValues?.bairro ?? "");
  const [cidade, setCidade] = useState(defaultValues?.cidade ?? "");
  const [estado, setEstado] = useState(defaultValues?.estado ?? "");
  const [cnhNumero, setCnhNumero] = useState(
    defaultValues?.cnhNumero ? formatCnh(defaultValues.cnhNumero) : "",
  );
  const [cnhCategoria, setCnhCategoria] = useState(defaultValues?.cnhCategoria ?? "");
  const [vehicleType, setVehicleType] = useState(defaultValues?.vehicleType ?? "MOTO");
  const [usesOwnVehicle, setUsesOwnVehicle] = useState(defaultValues?.usesOwnVehicle !== false);
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);
  const [isAvailable, setIsAvailable] = useState(defaultValues?.isAvailable ?? false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
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
    setIsSearchingCep(true);
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
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (isActive) formData.set("isActive", "on");
    else formData.delete("isActive");

    if (isAvailable) formData.set("isAvailable", "on");
    else formData.delete("isAvailable");

    if (usesOwnVehicle) formData.set("usesOwnVehicle", "on");
    else formData.delete("usesOwnVehicle");

    formData.set("vehicleType", vehicleType);
    if (cnhCategoria) formData.set("cnhCategoria", cnhCategoria);
    if (estado) formData.set("estado", estado);

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-0 pt-1">
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        {/* ── Dados Pessoais ── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Dados Pessoais
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="courier-name" className="text-xs font-semibold text-slate-700">
                Nome completo
              </Label>
              <Input
                id="courier-name"
                name="name"
                placeholder="Ex.: João Silva"
                defaultValue={defaultValues?.name}
                required
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              />
            </div>

            {/* Telefone/WhatsApp, CPF e RG na mesma linha */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="courier-phone" className="text-xs font-semibold text-slate-700">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="courier-phone"
                  name="phone"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  required
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="courier-cpf" className="text-xs font-semibold text-slate-700">
                  CPF
                </Label>
                <Input
                  id="courier-cpf"
                  name="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="courier-rg" className="text-xs font-semibold text-slate-700">
                  RG
                </Label>
                <Input
                  id="courier-rg"
                  name="rg"
                  placeholder="00.000.000-0"
                  value={rg}
                  onChange={(e) => setRg(formatRg(e.target.value))}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Endereço (Layout igual ao endereço do estabelecimento) ── */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Endereço
              </span>
              <div className="h-px w-12 bg-slate-100" />
            </div>
            <span className="text-[11px] text-slate-500">
              Digite o CEP para buscar o endereço automaticamente
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-12">
            {/* CEP */}
            <div className="space-y-1.5 sm:col-span-4">
              <Label htmlFor="courier-cep" className="text-xs font-semibold text-slate-700">
                CEP
              </Label>
              <div className="relative">
                <Input
                  id="courier-cep"
                  name="cep"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(formatCep(e.target.value))}
                  onBlur={handleCepBlur}
                  maxLength={9}
                  className="h-10 rounded-xl border-slate-200 bg-white pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {isSearchingCep ? (
                    <Loader2Icon size={15} className="animate-spin text-primary" />
                  ) : (
                    <SearchIcon size={15} />
                  )}
                </div>
              </div>
            </div>

            {/* Logradouro / Rua */}
            <div className="space-y-1.5 sm:col-span-8">
              <Label htmlFor="courier-logradouro" className="text-xs font-semibold text-slate-700">
                Logradouro / Rua
              </Label>
              <Input
                id="courier-logradouro"
                name="logradouro"
                placeholder="Ex: Av. Paulista, Rua das Flores"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              />
            </div>

            {/* Número */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="courier-numero" className="text-xs font-semibold text-slate-700">
                Número
              </Label>
              <Input
                id="courier-numero"
                name="numero"
                placeholder="Ex: 123"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              />
            </div>

            {/* UF */}
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="courier-estado" className="text-xs font-semibold text-slate-700">
                UF
              </Label>
              <Select
                value={estado || undefined}
                onValueChange={(val) => setEstado(val)}
              >
                <SelectTrigger
                  id="courier-estado"
                  className="h-10 rounded-xl border-slate-200 bg-white px-3 font-semibold text-sm uppercase text-slate-900 focus:border-primary"
                >
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-xl border-slate-200 bg-white shadow-xl">
                  {BRAZIL_UFS.map((uf) => (
                    <SelectItem key={uf.value} value={uf.value} className="text-xs font-medium">
                      <span className="font-semibold text-slate-900">{uf.value}</span>
                      <span className="ml-1.5 text-slate-500">- {uf.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="estado" value={estado} />
            </div>

            {/* Complemento */}
            <div className="space-y-1.5 sm:col-span-7">
              <Label htmlFor="courier-complemento" className="text-xs font-semibold text-slate-700">
                Complemento
              </Label>
              <Input
                id="courier-complemento"
                name="complemento"
                placeholder="Ex: Apto, Bloco..."
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              />
            </div>

            {/* Bairro */}
            <div className="space-y-1.5 sm:col-span-4">
              <Label htmlFor="courier-bairro" className="text-xs font-semibold text-slate-700">
                Bairro
              </Label>
              <Input
                id="courier-bairro"
                name="bairro"
                placeholder="Ex: Centro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              />
            </div>

            {/* Cidade */}
            <div className="space-y-1.5 sm:col-span-8">
              <Label htmlFor="courier-cidade" className="text-xs font-semibold text-slate-700">
                Cidade
              </Label>
              <Input
                id="courier-cidade"
                name="cidade"
                placeholder="Ex: São Paulo"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* ── Habilitação ── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Carteira de Habilitação (CNH)
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="courier-cnh-numero" className="text-xs font-semibold text-slate-700">
                Número CNH
              </Label>
              <Input
                id="courier-cnh-numero"
                name="cnhNumero"
                placeholder="000000000-00"
                value={cnhNumero}
                onChange={(e) => setCnhNumero(formatCnh(e.target.value))}
                maxLength={12}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courier-cnh-categoria" className="text-xs font-semibold text-slate-700">
                Categoria
              </Label>
              <Select
                value={cnhCategoria || undefined}
                onValueChange={(val) => setCnhCategoria(val)}
              >
                <SelectTrigger
                  id="courier-cnh-categoria"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-primary"
                >
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white shadow-xl">
                  <SelectItem value="A">Categoria A (Moto)</SelectItem>
                  <SelectItem value="B">Categoria B (Carro)</SelectItem>
                  <SelectItem value="AB">Categoria AB (Moto e Carro)</SelectItem>
                  <SelectItem value="C">Categoria C</SelectItem>
                  <SelectItem value="D">Categoria D</SelectItem>
                  <SelectItem value="E">Categoria E</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="cnhCategoria" value={cnhCategoria} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courier-cnh-vencimento" className="text-xs font-semibold text-slate-700">
                Vencimento
              </Label>
              <DatePicker
                id="courier-cnh-vencimento"
                name="cnhVencimento"
                defaultValue={defaultValues?.cnhVencimento ?? ""}
                placeholder="Data de vencimento"
              />
            </div>
          </div>
        </div>

        {/* ── Veículo e Escala ── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Veículo e Escala
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="courier-vehicle" className="text-xs font-semibold text-slate-700">
                  Tipo de veículo
                </Label>
                <Select
                  value={vehicleType}
                  onValueChange={(val) => setVehicleType(val)}
                >
                  <SelectTrigger
                    id="courier-vehicle"
                    className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-primary"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-xl">
                    <SelectItem value="MOTO">Moto</SelectItem>
                    <SelectItem value="BIKE">Bicicleta</SelectItem>
                    <SelectItem value="CARRO">Carro</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="vehicleType" value={vehicleType} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courier-plate" className="text-xs font-semibold text-slate-700">
                  Placa
                </Label>
                <Input
                  id="courier-plate"
                  name="licensePlate"
                  placeholder="ABC-1234"
                  defaultValue={defaultValues?.licensePlate ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Posse do veículo utilizado</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUsesOwnVehicle(true)}
                  className={cn(
                    "h-auto justify-start items-center gap-2.5 rounded-xl border p-3 text-xs font-medium transition text-left",
                    usesOwnVehicle
                      ? "border-primary bg-primary/[0.06] text-primary shadow-xs ring-1 ring-primary/30 hover:bg-primary/[0.08] hover:text-primary"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0",
                      usesOwnVehicle ? "border-primary bg-primary" : "border-slate-300 bg-white",
                    )}
                  >
                    {usesOwnVehicle && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span>Veículo próprio</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUsesOwnVehicle(false)}
                  className={cn(
                    "h-auto justify-start items-center gap-2.5 rounded-xl border p-3 text-xs font-medium transition text-left",
                    !usesOwnVehicle
                      ? "border-primary bg-primary/[0.06] text-primary shadow-xs ring-1 ring-primary/30 hover:bg-primary/[0.08] hover:text-primary"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0",
                      !usesOwnVehicle ? "border-primary bg-primary" : "border-slate-300 bg-white",
                    )}
                  >
                    {!usesOwnVehicle && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span>Veículo da empresa</span>
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Dias de trabalho</Label>
              <div className="flex flex-wrap gap-2">
                {WORK_DAYS.map(({ value, label }) => {
                  const isSelected = selectedDays.includes(value);
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(value)}
                      className={cn(
                        "h-8 rounded-lg px-3 text-xs font-semibold transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              {selectedDays.map((day) => (
                <input key={day} type="hidden" name="workDays" value={day} />
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="courier-shift-start" className="text-xs font-semibold text-slate-700">
                  Horário início
                </Label>
                <Input
                  id="courier-shift-start"
                  name="shiftStart"
                  type="time"
                  defaultValue={defaultValues?.shiftStart ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courier-shift-end" className="text-xs font-semibold text-slate-700">
                  Horário fim
                </Label>
                <Input
                  id="courier-shift-end"
                  name="shiftEnd"
                  type="time"
                  defaultValue={defaultValues?.shiftEnd ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Status ── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Status e Disponibilidade
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div>
                <Label className="text-xs font-semibold text-slate-900">Motoboy ativo</Label>
                <p className="text-[11px] text-slate-500">
                  Habilita ou desabilita o entregador no sistema
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div>
                <Label className="text-xs font-semibold text-slate-900">Disponível agora para entregas</Label>
                <p className="text-[11px] text-slate-500">
                  Indica se o motoboy está apto para receber viagens no momento
                </p>
              </div>
              <Switch
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
              />
            </div>
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
            ? defaultValues ? "Salvando..." : "Cadastrando..."
            : defaultValues ? "Salvar Alterações" : "Cadastrar Motoboy"}
        </Button>
      </DialogFooter>
    </form>
  );
}
