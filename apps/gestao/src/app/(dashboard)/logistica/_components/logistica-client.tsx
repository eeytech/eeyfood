"use client";

import { deleteCourierAction } from "@/app/(dashboard)/logistica-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CompanyVehicle, Courier, DeliveryFeeRule, Restaurant } from "@fsw/db";
import {
  BikeIcon,
  CarIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CompassIcon,
  FilterXIcon,
  Loader2Icon,
  MapIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
  UserXIcon,
  XIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CourierForm } from "./courier-form";
import { DeliveryFeeRulesTab } from "./delivery-fee-rules-tab";
import { DeliveryParamsTab } from "./delivery-params-tab";
import { VehiclesTab } from "./vehicles-tab";

const MapaRoteirizador = dynamic(
  () => import("./mapa-roteirizador").then((m) => m.MapaRoteirizador),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[640px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <Loader2Icon className="animate-spin text-slate-400" size={24} />
      </div>
    ),
  },
);

interface LogisticaClientProps {
  slug: string;
  restaurant: Restaurant;
  couriers: Courier[];
  courierTotal: number;
  courierTotalPages: number;
  courierCurrentPage: number;
  initialSearch: string;
  initialVehicleType: string;
  initialAvailability: string;
  initialStatus: string;
  initialWorkDay: string;
  vehicles: CompanyVehicle[];
  vehicleTotal: number;
  vehicleTotalPages: number;
  vehicleCurrentPage: number;
  initialVSearch: string;
  initialVStatus: string;
  initialTab: string;
  feeRules: DeliveryFeeRule[];
}

const VEHICLE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string; size?: number }>; badgeClass: string }
> = {
  MOTO: {
    label: "Moto",
    icon: BikeIcon,
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-200/80 hover:bg-cyan-100",
  },
  BIKE: {
    label: "Bicicleta",
    icon: BikeIcon,
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100",
  },
  CARRO: {
    label: "Carro",
    icon: CarIcon,
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200/80 hover:bg-blue-100",
  },
};

const WORK_DAYS_SHORT: Record<string, string> = {
  MON: "Seg",
  TUE: "Ter",
  WED: "Qua",
  THU: "Qui",
  FRI: "Sex",
  SAT: "Sáb",
  SUN: "Dom",
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
};

export function LogisticaClient({
  slug,
  restaurant,
  couriers,
  courierTotal,
  courierTotalPages,
  courierCurrentPage,
  initialSearch,
  initialVehicleType,
  initialAvailability,
  initialStatus,
  initialWorkDay,
  vehicles,
  vehicleTotal,
  vehicleTotalPages,
  vehicleCurrentPage,
  initialVSearch,
  initialVStatus,
  initialTab,
  feeRules,
}: LogisticaClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editCourier, setEditCourier] = useState<Courier | null>(null);

  // filtros dos motoboys (locais — aplicados via URL ao confirmar)
  const [localSearch, setLocalSearch] = useState(initialSearch);
  const [localVehicleType, setLocalVehicleType] = useState(initialVehicleType);
  const [localAvailability, setLocalAvailability] = useState(initialAvailability);
  const [localCourierStatus, setLocalCourierStatus] = useState(initialStatus);
  const [localWorkDay, setLocalWorkDay] = useState(initialWorkDay);

  const isFiltering =
    localSearch.trim() !== "" ||
    localVehicleType !== "all" ||
    localAvailability !== "all" ||
    localCourierStatus !== "all" ||
    localWorkDay !== "all";

  const navigateCouriers = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("tab", "motoboys");
    params.set("search", overrides.search ?? localSearch);
    params.set("vehicleType", overrides.vehicleType ?? localVehicleType);
    params.set("availability", overrides.availability ?? localAvailability);
    params.set("status", overrides.status ?? localCourierStatus);
    params.set("workDay", overrides.workDay ?? localWorkDay);
    params.set("page", overrides.page ?? String(courierCurrentPage));
    router.push(`?${params.toString()}`);
  };

  const applyFilters = () => navigateCouriers({ page: "1" });

  const handleClearFilters = () => {
    setLocalSearch("");
    setLocalVehicleType("all");
    setLocalAvailability("all");
    setLocalCourierStatus("all");
    setLocalWorkDay("all");
    const params = new URLSearchParams();
    params.set("tab", "motoboys");
    params.set("search", "");
    params.set("vehicleType", "all");
    params.set("availability", "all");
    params.set("status", "all");
    params.set("workDay", "all");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleDelete = (courierId: string, courierName: string) => {
    if (!confirm(`Deseja realmente excluir o motoboy "${courierName}"?`)) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("courierId", courierId);
        await deleteCourierAction(slug, formData);
        toast.success(`Motoboy "${courierName}" excluído com sucesso.`);
      } catch {
        toast.error("Não foi possível excluir o motoboy.");
      }
    });
  };

  // Métricas
  const activeCouriersCount = couriers.filter((c) => c.isActive).length;
  const availableCouriersCount = couriers.filter((c) => c.isAvailable && c.isActive).length;
  const activeVehiclesCount = vehicles.filter((v) => v.status === "ACTIVE").length;
  const activeRulesCount = feeRules.filter((r) => r.isActive).length;

  return (
    <div className="space-y-6">
      {/* ── Dialogs de motoboy ──────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <BikeIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Novo Motoboy
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Adicione um novo entregador à sua equipe de despacho.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <CourierForm slug={slug} onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editCourier !== null}
        onOpenChange={(open) => !open && setEditCourier(null)}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <PencilIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Editar Motoboy
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {editCourier?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editCourier && (
            <CourierForm
              key={editCourier.id}
              slug={slug}
              defaultValues={editCourier}
              onSuccess={() => setEditCourier(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <BikeIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Logística e Motoboys
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie sua equipe de entrega, frota própria de veículos, parâmetros de taxa e rotas de entrega.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <PlusIcon size={16} />
          <span>Novo Motoboy</span>
        </Button>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Motoboys
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <BikeIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {courierTotal}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeCouriersCount} ativo(s) na equipe
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Disponíveis Agora
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {availableCouriersCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Prontos para despachar
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Frota da Empresa
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <CarIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
              {vehicleTotal}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeVehiclesCount} veículo(s) ativo(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Zonas & Regras
              </span>
              <div className="rounded-lg bg-teal-100 p-1.5 text-teal-700">
                <CompassIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-teal-700">
              {feeRules.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeRulesCount} regra(s) ativa(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Abas Principais ──────────────────────────────── */}
      <Tabs
        defaultValue={
          initialTab === "vehicles"
            ? "vehicles"
            : initialTab === "params"
              ? "params"
              : initialTab === "roteirizador"
                ? "roteirizador"
                : initialTab === "zonas"
                  ? "zonas"
                  : "motoboys"
        }
        onValueChange={(tab) => {
          const params = new URLSearchParams();
          params.set("tab", tab);
          router.push(`?${params.toString()}`);
        }}
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
            <TabsTrigger
              value="motoboys"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <BikeIcon size={14} className="mr-1.5" />
              Motoboys ({courierTotal})
            </TabsTrigger>
            <TabsTrigger
              value="vehicles"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <CarIcon size={14} className="mr-1.5" />
              Veículos da Empresa ({vehicleTotal})
            </TabsTrigger>
            <TabsTrigger
              value="params"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <Settings2Icon size={14} className="mr-1.5" />
              Parâmetros
            </TabsTrigger>
            <TabsTrigger
              value="zonas"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <CompassIcon size={14} className="mr-1.5" />
              Zonas de Frete ({feeRules.length})
            </TabsTrigger>
            <TabsTrigger
              value="roteirizador"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <MapIcon size={14} className="mr-1.5" />
              Roteirizador
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Aba Motoboys ── */}
        <TabsContent value="motoboys" className="mt-5 space-y-4">
          {/* Painel de Filtros */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Busca */}
                <div className="relative flex-1">
                  <SearchIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
                  />
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSearch("");
                        navigateCouriers({ search: "", page: "1" });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>

                {/* Filtros Dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-full sm:w-36">
                    <Select
                      value={localVehicleType}
                      onValueChange={(val) => {
                        setLocalVehicleType(val);
                        navigateCouriers({ vehicleType: val, page: "1" });
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                        <SelectValue placeholder="Veículo..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                        <SelectItem value="all">Todos veículos</SelectItem>
                        <SelectItem value="MOTO">Moto</SelectItem>
                        <SelectItem value="BIKE">Bicicleta</SelectItem>
                        <SelectItem value="CARRO">Carro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full sm:w-36">
                    <Select
                      value={localAvailability}
                      onValueChange={(val) => {
                        setLocalAvailability(val);
                        navigateCouriers({ availability: val, page: "1" });
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                        <SelectValue placeholder="Disponibilidade..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                        <SelectItem value="all">Todas disp.</SelectItem>
                        <SelectItem value="available">Disponíveis</SelectItem>
                        <SelectItem value="unavailable">Indisponíveis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full sm:w-32">
                    <Select
                      value={localCourierStatus}
                      onValueChange={(val) => {
                        setLocalCourierStatus(val);
                        navigateCouriers({ status: val, page: "1" });
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                        <SelectValue placeholder="Status..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                        <SelectItem value="all">Todos status</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full sm:w-36">
                    <Select
                      value={localWorkDay}
                      onValueChange={(val) => {
                        setLocalWorkDay(val);
                        navigateCouriers({ workDay: val, page: "1" });
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                        <SelectValue placeholder="Dia da semana..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                        <SelectItem value="all">Todos os dias</SelectItem>
                        <SelectItem value="MON">Segunda</SelectItem>
                        <SelectItem value="TUE">Terça</SelectItem>
                        <SelectItem value="WED">Quarta</SelectItem>
                        <SelectItem value="THU">Quinta</SelectItem>
                        <SelectItem value="FRI">Sexta</SelectItem>
                        <SelectItem value="SAT">Sábado</SelectItem>
                        <SelectItem value="SUN">Domingo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isFiltering && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <FilterXIcon size={14} />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>

              {/* Contador de resultados */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>
                  Exibindo <strong className="font-semibold text-slate-900">{couriers.length}</strong> de{" "}
                  {courierTotal} motoboy{courierTotal !== 1 ? "s" : ""}
                </span>
                {isFiltering && (
                  <span className="text-[11px] font-medium text-amber-600">
                    Filtros aplicados
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Container de Tabela e Cards */}
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {couriers.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
                  <UserXIcon size={32} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhum motoboy encontrado
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {isFiltering
                    ? "Tente ajustar os filtros ou os termos da busca para encontrar entregadores cadastrados."
                    : "Nenhum entregador cadastrado neste estabelecimento. Comece adicionando um novo motoboy!"}
                </p>
                {isFiltering ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="mt-4 gap-1.5 rounded-full border-slate-200 text-xs"
                  >
                    <FilterXIcon size={14} />
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="mt-4 gap-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <PlusIcon size={14} />
                    Cadastrar primeiro motoboy
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Visualização Desktop */}
                <div className="hidden overflow-x-auto sm:block">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="w-[280px] text-xs font-semibold text-slate-700">
                          Entregador
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">
                          Veículo
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">
                          Placa
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">
                          Escala & Turno
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-700">
                          Disponibilidade
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-700">
                          Status
                        </TableHead>
                        <TableHead className="w-[80px] text-right text-xs font-semibold text-slate-700">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {couriers.map((courier) => {
                        const vehicleType = courier.vehicleType ?? "MOTO";
                        const vehicleCfg = VEHICLE_CONFIG[vehicleType] ?? VEHICLE_CONFIG.MOTO;
                        const VehicleIcon = vehicleCfg.icon;
                        const days = courier.workDays
                          ?.map((d) => WORK_DAYS_SHORT[d] ?? d)
                          .join(", ");

                        return (
                          <TableRow
                            key={courier.id}
                            className="transition-colors hover:bg-slate-50/70"
                          >
                            {/* Entregador */}
                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                                  {getInitials(courier.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {courier.name}
                                  </p>
                                  <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                                    <PhoneIcon size={12} className="shrink-0 text-slate-400" />
                                    {courier.phone || "Sem telefone"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Veículo */}
                            <TableCell className="py-3.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tracking-normal transition-colors",
                                  vehicleCfg.badgeClass,
                                )}
                              >
                                <VehicleIcon size={12} className="shrink-0" />
                                {vehicleCfg.label}
                              </span>
                            </TableCell>

                            {/* Placa */}
                            <TableCell className="py-3.5 font-mono text-xs text-slate-600">
                              {courier.licensePlate ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                                  {courier.licensePlate}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </TableCell>

                            {/* Escala */}
                            <TableCell className="py-3.5 text-xs text-slate-500">
                              {days ? (
                                <div>
                                  <p className="font-medium text-slate-700">{days}</p>
                                  {courier.shiftStart && (
                                    <p className="text-[11px] text-slate-400">
                                      {courier.shiftStart} às {courier.shiftEnd ?? ""}
                                    </p>
                                  )}
                                </div>
                              ) : courier.shiftStart ? (
                                `${courier.shiftStart} às ${courier.shiftEnd ?? ""}`
                              ) : (
                                <span className="text-slate-400">Integral</span>
                              )}
                            </TableCell>

                            {/* Disponibilidade */}
                            <TableCell className="py-3.5 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  courier.isAvailable
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                    : "bg-slate-100 text-slate-500 border border-slate-200",
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    courier.isAvailable ? "bg-emerald-500" : "bg-slate-400",
                                  )}
                                />
                                {courier.isAvailable ? "Disponível" : "Indisponível"}
                              </span>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-3.5 text-center">
                              <Badge
                                variant={courier.isActive ? "success" : "secondary"}
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  courier.isActive
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                                    : "bg-slate-100 text-slate-600 border-slate-200",
                                )}
                              >
                                {courier.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>

                            {/* Ações */}
                            <TableCell className="py-3.5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                  >
                                    <MoreHorizontalIcon size={16} />
                                    <span className="sr-only">Opções</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48 rounded-xl border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                                >
                                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                                    Opções do Entregador
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => setEditCourier(courier)}
                                    className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                  >
                                    <PencilIcon size={14} className="text-slate-500" />
                                    Editar dados
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-slate-100" />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(courier.id, courier.name)}
                                    className="gap-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                                  >
                                    <Trash2Icon size={14} />
                                    Excluir motoboy
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Visualização Mobile */}
                <div className="divide-y divide-slate-100 sm:hidden">
                  {couriers.map((courier) => {
                    const vehicleType = courier.vehicleType ?? "MOTO";
                    const vehicleCfg = VEHICLE_CONFIG[vehicleType] ?? VEHICLE_CONFIG.MOTO;
                    const VehicleIcon = vehicleCfg.icon;

                    return (
                      <div key={courier.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                              {getInitials(courier.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{courier.name}</p>
                              <p className="flex items-center gap-1 text-xs text-slate-500">
                                <PhoneIcon size={11} className="text-slate-400" />
                                {courier.phone || "Sem telefone"}
                              </p>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <MoreHorizontalIcon size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-xl border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                            >
                              <DropdownMenuItem
                                onClick={() => setEditCourier(courier)}
                                className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                              >
                                <PencilIcon size={14} />
                                Editar dados
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(courier.id, courier.name)}
                                className="gap-2 rounded-lg text-xs font-medium text-red-600"
                              >
                                <Trash2Icon size={14} />
                                Excluir motoboy
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
                                vehicleCfg.badgeClass,
                              )}
                            >
                              <VehicleIcon size={11} />
                              {vehicleCfg.label}
                            </span>
                            {courier.licensePlate && (
                              <span className="font-mono text-xs font-semibold text-slate-700">
                                {courier.licensePlate}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                courier.isAvailable
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  courier.isAvailable ? "bg-emerald-500" : "bg-slate-400",
                                )}
                              />
                              {courier.isAvailable ? "Disponível" : "Indisp."}
                            </span>

                            <Badge
                              variant={courier.isActive ? "success" : "secondary"}
                              className="text-[11px]"
                            >
                              {courier.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Controles de Paginação */}
                {courierTotalPages > 1 && (
                  <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-slate-500">
                      Página <strong className="font-semibold text-slate-900">{courierCurrentPage}</strong> de{" "}
                      <strong className="font-semibold text-slate-900">{courierTotalPages}</strong>
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={courierCurrentPage <= 1}
                        onClick={() => navigateCouriers({ page: "1" })}
                        className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                        title="Primeira página"
                      >
                        <ChevronsLeftIcon size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={courierCurrentPage <= 1}
                        onClick={() =>
                          navigateCouriers({ page: String(Math.max(1, courierCurrentPage - 1)) })
                        }
                        className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                        title="Página anterior"
                      >
                        <ChevronLeftIcon size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={courierCurrentPage >= courierTotalPages}
                        onClick={() =>
                          navigateCouriers({
                            page: String(Math.min(courierTotalPages, courierCurrentPage + 1)),
                          })
                        }
                        className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                        title="Próxima página"
                      >
                        <ChevronRightIcon size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={courierCurrentPage >= courierTotalPages}
                        onClick={() => navigateCouriers({ page: String(courierTotalPages) })}
                        className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                        title="Última página"
                      >
                        <ChevronsRightIcon size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Aba Veículos ── */}
        <TabsContent value="vehicles" className="mt-5 space-y-4">
          <VehiclesTab
            slug={slug}
            vehicles={vehicles}
            total={vehicleTotal}
            totalPages={vehicleTotalPages}
            currentPage={vehicleCurrentPage}
            initialSearch={initialVSearch}
            initialStatus={initialVStatus}
          />
        </TabsContent>

        {/* ── Aba Parâmetros ── */}
        <TabsContent value="params" className="mt-5">
          <DeliveryParamsTab slug={slug} restaurant={restaurant} />
        </TabsContent>

        {/* ── Aba Zonas de Frete ── */}
        <TabsContent value="zonas" className="mt-5">
          <DeliveryFeeRulesTab slug={slug} rules={feeRules} />
        </TabsContent>

        {/* ── Aba Roteirizador ── */}
        <TabsContent value="roteirizador" className="mt-5">
          <MapaRoteirizador slug={slug} restaurant={restaurant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
