"use client";

import {
  CarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteVehicleAction } from "@/app/[slug]/logistica-actions";
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
import type { CompanyVehicle } from "@fsw/db";

import { VehicleForm } from "./vehicle-form";

interface VehiclesTabProps {
  slug: string;
  vehicles: CompanyVehicle[];
  total: number;
  totalPages: number;
  currentPage: number;
  initialSearch: string;
  initialStatus: string;
}

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  ACTIVE: { label: "Ativo", variant: "success" },
  MAINTENANCE: { label: "Em manutenção", variant: "warning" },
  INACTIVE: { label: "Inativo", variant: "danger" },
};

export function VehiclesTab({
  slug,
  vehicles,
  total,
  totalPages,
  currentPage,
  initialSearch,
  initialStatus,
}: VehiclesTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<CompanyVehicle | null>(null);
  const [localSearch, setLocalSearch] = useState(initialSearch);
  const [localStatus, setLocalStatus] = useState(initialStatus);

  const navigate = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("tab", "vehicles");
    params.set("vsearch", overrides.vsearch ?? localSearch);
    params.set("vstatus", overrides.vstatus ?? localStatus);
    params.set("vpage", overrides.vpage ?? String(currentPage));
    router.push(`?${params.toString()}`);
  };

  const applyFilters = () => navigate({ vpage: "1" });

  const handleDelete = (vehicleId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      await deleteVehicleAction(slug, formData);
    });
  };

  return (
    <>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo veículo</DialogTitle>
            <DialogDescription>
              Cadastre um veículo da frota do estabelecimento.
            </DialogDescription>
          </DialogHeader>
          <VehicleForm slug={slug} onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editVehicle !== null}
        onOpenChange={(open) => !open && setEditVehicle(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar veículo</DialogTitle>
            <DialogDescription>
              {editVehicle?.brand} {editVehicle?.model}
            </DialogDescription>
          </DialogHeader>
          {editVehicle && (
            <VehicleForm
              key={editVehicle.id}
              slug={slug}
              defaultValues={editVehicle}
              onSuccess={() => setEditVehicle(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Veículos da Empresa</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie a frota de veículos próprios do estabelecimento.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <PlusIcon size={14} />
          Adicionar veículo
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="relative min-w-[180px] flex-1">
            <SearchIcon
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Buscar por marca, modelo ou placa..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="h-9 pl-8"
            />
          </div>

          <select
            value={localStatus}
            onChange={(e) => {
              setLocalStatus(e.target.value);
              navigate({ vstatus: e.target.value, vpage: "1" });
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="MAINTENANCE">Em manutenção</option>
            <option value="INACTIVE">Inativos</option>
          </select>

          <Button size="sm" variant="ghost" onClick={applyFilters}>
            Buscar
          </Button>

          <span className="ml-auto text-sm text-muted-foreground">
            {total} {total === 1 ? "veículo" : "veículos"}
          </span>
        </div>

        {/* Tabela */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <CarIcon size={32} className="text-slate-200" />
                    <p className="text-sm text-muted-foreground">
                      {localSearch || localStatus !== "all"
                        ? "Nenhum veículo encontrado para esses filtros."
                        : "Nenhum veículo cadastrado ainda."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => {
                const status = statusConfig[vehicle.status] ?? {
                  label: vehicle.status,
                  variant: "default" as const,
                };
                return (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <span className="font-medium">{vehicle.model}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vehicle.brand}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {vehicle.licensePlate}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vehicle.color ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vehicle.year ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditVehicle(vehicle)}
                        >
                          <PencilIcon size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleDelete(vehicle.id)}
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

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => navigate({ vpage: String(currentPage - 1) })}
              >
                <ChevronLeftIcon size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= totalPages}
                onClick={() => navigate({ vpage: String(currentPage + 1) })}
              >
                <ChevronRightIcon size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
