"use client";

import { deleteCourierAction } from "@/app/(dashboard)/logistica-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CompanyVehicle, Courier, DeliveryFeeRule, Restaurant } from "@fsw/db";
import {
  BikeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  MapIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CourierForm } from "./courier-form";
import { DeliveryFeeRulesTab } from "./delivery-fee-rules-tab";
import { DeliveryParamsTab } from "./delivery-params-tab";
import { VehiclesTab } from "./vehicles-tab";

const MapaRoteirizador = dynamic(
  () => import("./mapa-roteirizador").then((m) => m.MapaRoteirizador),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[640px] items-center justify-center rounded-lg border bg-white/90 shadow-sm">
        <Loader2Icon className="animate-spin text-muted-foreground" size={24} />
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

const vehicleLabel: Record<string, string> = {
  MOTO: "Moto",
  BIKE: "Bike",
  CARRO: "Carro",
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

  const handleDelete = (courierId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("courierId", courierId);
      await deleteCourierAction(slug, formData);
    });
  };

  return (
    <div className="space-y-4">
      {/* Dialogs de motoboy */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo motoboy</DialogTitle>
            <DialogDescription>
              Adicione um novo entregador à sua equipe.
            </DialogDescription>
          </DialogHeader>
          <CourierForm slug={slug} onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editCourier !== null}
        onOpenChange={(open) => !open && setEditCourier(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar motoboy</DialogTitle>
            <DialogDescription>{editCourier?.name}</DialogDescription>
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

      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-semibold">
          Logística e Motoboys
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Gerencie sua equipe de entrega e a frota de veículos do estabelecimento.
        </p>
      </div>

      {/* Abas principais */}
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
        <TabsList>
          <TabsTrigger value="motoboys">Motoboys</TabsTrigger>
          <TabsTrigger value="vehicles">Veículos da Empresa</TabsTrigger>
          <TabsTrigger value="params">Parâmetros</TabsTrigger>
          <TabsTrigger value="zonas">Zonas de Frete</TabsTrigger>
          <TabsTrigger value="roteirizador" className="gap-1.5">
            <MapIcon size={13} />
            Roteirizador
          </TabsTrigger>
        </TabsList>

        {/* ── Aba Motoboys ── */}
        <TabsContent value="motoboys" className="mt-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {courierTotal} {courierTotal === 1 ? "motoboy" : "motoboys"} encontrado{courierTotal === 1 ? "" : "s"}
            </p>
            <Button
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <PlusIcon size={14} />
              Adicionar motoboy
            </Button>
          </div>

          {/* Painel de filtros */}
          <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
            <div className="flex flex-wrap items-end gap-2 border-b bg-slate-50/60 px-4 py-3">
              {/* Busca */}
              <div className="relative min-w-[200px] flex-1">
                <SearchIcon
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Nome ou telefone..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  className="h-9 pl-8"
                />
              </div>

              {/* Tipo de veículo */}
              <select
                value={localVehicleType}
                onChange={(e) => {
                  setLocalVehicleType(e.target.value);
                  navigateCouriers({ vehicleType: e.target.value, page: "1" });
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">Tipo de veículo</option>
                <option value="MOTO">Moto</option>
                <option value="BIKE">Bike</option>
                <option value="CARRO">Carro</option>
              </select>

              {/* Disponibilidade */}
              <select
                value={localAvailability}
                onChange={(e) => {
                  setLocalAvailability(e.target.value);
                  navigateCouriers({ availability: e.target.value, page: "1" });
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">Disponibilidade</option>
                <option value="available">Disponíveis</option>
                <option value="unavailable">Indisponíveis</option>
              </select>

              {/* Status cadastral */}
              <select
                value={localCourierStatus}
                onChange={(e) => {
                  setLocalCourierStatus(e.target.value);
                  navigateCouriers({ status: e.target.value, page: "1" });
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">Status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>

              {/* Dia de trabalho */}
              <select
                value={localWorkDay}
                onChange={(e) => {
                  setLocalWorkDay(e.target.value);
                  navigateCouriers({ workDay: e.target.value, page: "1" });
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">Dia de trabalho</option>
                <option value="MON">Segunda</option>
                <option value="TUE">Terça</option>
                <option value="WED">Quarta</option>
                <option value="THU">Quinta</option>
                <option value="FRI">Sexta</option>
                <option value="SAT">Sábado</option>
                <option value="SUN">Domingo</option>
              </select>

              <Button size="sm" variant="ghost" onClick={applyFilters}>
                Buscar
              </Button>
            </div>

            {/* Tabela */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Escala</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couriers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <BikeIcon size={32} className="text-slate-200" />
                        <p className="text-sm text-muted-foreground">
                          {initialSearch || initialVehicleType !== "all"
                            ? "Nenhum motoboy encontrado para esses filtros."
                            : "Nenhum motoboy cadastrado ainda."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  couriers.map((courier) => {
                    const days = courier.workDays
                      ?.map((d) => WORK_DAYS_SHORT[d] ?? d)
                      .join(", ");
                    return (
                      <TableRow key={courier.id}>
                        <TableCell>
                          <span className="font-medium">{courier.name}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {courier.phone}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {vehicleLabel[courier.vehicleType ?? "MOTO"] ?? courier.vehicleType}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {courier.licensePlate ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {days
                            ? days
                            : courier.shiftStart
                              ? `${courier.shiftStart}–${courier.shiftEnd ?? ""}`
                              : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                              courier.isAvailable
                                ? "bg-emerald-500"
                                : "bg-rose-400"
                            }`}
                            title={courier.isAvailable ? "Disponível" : "Indisponível"}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={courier.isActive ? "success" : "danger"}
                          >
                            {courier.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditCourier(courier)}
                            >
                              <PencilIcon size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => handleDelete(courier.id)}
                              disabled={isPending}
                            >
                              <Trash2Icon size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Paginação dos motoboys */}
            {courierTotalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Página {courierCurrentPage} de {courierTotalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={courierCurrentPage <= 1}
                    onClick={() =>
                      navigateCouriers({ page: String(courierCurrentPage - 1) })
                    }
                  >
                    <ChevronLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={courierCurrentPage >= courierTotalPages}
                    onClick={() =>
                      navigateCouriers({ page: String(courierCurrentPage + 1) })
                    }
                  >
                    <ChevronRightIcon size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Aba Veículos ── */}
        <TabsContent value="vehicles" className="mt-4 space-y-4">
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
        <TabsContent value="params" className="mt-4">
          <DeliveryParamsTab slug={slug} restaurant={restaurant} />
        </TabsContent>

        {/* ── Aba Zonas de Frete ── */}
        <TabsContent value="zonas" className="mt-4">
          <DeliveryFeeRulesTab slug={slug} rules={feeRules} />
        </TabsContent>

        {/* ── Aba Roteirizador ── */}
        <TabsContent value="roteirizador" className="mt-4">
          <div className="mb-3">
            <h2 className="font-display text-base font-semibold">
              Roteirizador de Entregas
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Visualize pedidos prontos no mapa, selecione-os e atribua um motoboy em lote.
            </p>
          </div>
          <MapaRoteirizador slug={slug} restaurant={restaurant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
