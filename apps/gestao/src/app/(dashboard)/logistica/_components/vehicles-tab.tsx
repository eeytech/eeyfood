"use client";

import {
  CarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FilterXIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteVehicleAction } from "@/app/(dashboard)/logistica-actions";
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
import { cn } from "@/lib/utils";
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

const statusConfig: Record<
  string,
  { label: string; badgeClass: string }
> = {
  ACTIVE: {
    label: "Ativo",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  },
  MAINTENANCE: {
    label: "Em manutenção",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
  },
  INACTIVE: {
    label: "Inativo",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
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

  const isFiltering = localSearch.trim() !== "" || localStatus !== "all";

  const navigate = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("tab", "vehicles");
    params.set("vsearch", overrides.vsearch ?? localSearch);
    params.set("vstatus", overrides.vstatus ?? localStatus);
    params.set("vpage", overrides.vpage ?? String(currentPage));
    router.push(`?${params.toString()}`);
  };

  const applyFilters = () => navigate({ vpage: "1" });

  const handleClearFilters = () => {
    setLocalSearch("");
    setLocalStatus("all");
    const params = new URLSearchParams();
    params.set("tab", "vehicles");
    params.set("vsearch", "");
    params.set("vstatus", "all");
    params.set("vpage", "1");
    router.push(`?${params.toString()}`);
  };

  const handleDelete = (vehicleId: string, model: string) => {
    if (!confirm(`Deseja realmente excluir o veículo "${model}"?`)) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("vehicleId", vehicleId);
        await deleteVehicleAction(slug, formData);
        toast.success(`Veículo "${model}" excluído com sucesso.`);
      } catch {
        toast.error("Não foi possível excluir o veículo.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Dialogs ────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <CarIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Novo Veículo
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Cadastre um veículo da frota própria do estabelecimento.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <VehicleForm slug={slug} onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editVehicle !== null}
        onOpenChange={(open) => !open && setEditVehicle(null)}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <PencilIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Editar Veículo
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {editVehicle?.brand} {editVehicle?.model}
                </DialogDescription>
              </div>
            </div>
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

      {/* ── Header da Aba ───────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
            Veículos da Empresa
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie a frota de veículos próprios do estabelecimento e seu estado de conservação.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="h-9 gap-1.5 rounded-full bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <PlusIcon size={14} />
          <span>Adicionar Veículo</span>
        </Button>
      </div>

      {/* ── Filtros ─────────────────────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por modelo, marca ou placa..."
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
                    navigate({ vsearch: "", vpage: "1" });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-full sm:w-44">
                <Select
                  value={localStatus}
                  onValueChange={(val) => {
                    setLocalStatus(val);
                    navigate({ vstatus: val, vpage: "1" });
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ACTIVE">Ativos</SelectItem>
                    <SelectItem value="MAINTENANCE">Em manutenção</SelectItem>
                    <SelectItem value="INACTIVE">Inativos</SelectItem>
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

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Exibindo <strong className="font-semibold text-slate-900">{vehicles.length}</strong> de{" "}
              {total} veículo{total !== 1 ? "s" : ""}
            </span>
            {isFiltering && (
              <span className="text-[11px] font-medium text-amber-600">
                Filtros aplicados
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Tabela e Cards ───────────────────────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {vehicles.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <CarIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhum veículo encontrado
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {isFiltering
                ? "Tente alterar os termos da busca ou limpar os filtros para ver outros veículos."
                : "Nenhum veículo próprio cadastrado ainda. Adicione o primeiro veículo da sua frota!"}
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
                Adicionar veículo
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="w-[260px] text-xs font-semibold text-slate-700">
                      Veículo & Modelo
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Marca
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Placa
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Cor
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Ano
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
                  {vehicles.map((vehicle) => {
                    const status = statusConfig[vehicle.status] ?? {
                      label: vehicle.status,
                      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    return (
                      <TableRow
                        key={vehicle.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                              <CarIcon size={18} />
                            </div>
                            <span className="font-semibold text-slate-900">
                              {vehicle.model}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 text-xs text-slate-600">
                          {vehicle.brand}
                        </TableCell>
                        <TableCell className="py-3.5 font-mono text-xs font-semibold text-slate-800">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5">
                            {vehicle.licensePlate}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 text-xs text-slate-500">
                          {vehicle.color ?? "—"}
                        </TableCell>
                        <TableCell className="py-3.5 text-xs text-slate-500">
                          {vehicle.year ?? "—"}
                        </TableCell>
                        <TableCell className="py-3.5 text-center">
                          <Badge
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium",
                              status.badgeClass,
                            )}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
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
                                Opções do Veículo
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => setEditVehicle(vehicle)}
                                className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                              >
                                <PencilIcon size={14} className="text-slate-500" />
                                Editar dados
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(vehicle.id, vehicle.model)}
                                className="gap-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                              >
                                <Trash2Icon size={14} />
                                Excluir veículo
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

            {/* Mobile Cards View */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {vehicles.map((vehicle) => {
                const status = statusConfig[vehicle.status] ?? {
                  label: vehicle.status,
                  badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                };
                return (
                  <div key={vehicle.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <CarIcon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{vehicle.model}</p>
                          <p className="text-xs text-slate-500">{vehicle.brand}</p>
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
                            onClick={() => setEditVehicle(vehicle)}
                            className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                          >
                            <PencilIcon size={14} />
                            Editar dados
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100" />
                          <DropdownMenuItem
                            onClick={() => handleDelete(vehicle.id, vehicle.model)}
                            className="gap-2 rounded-lg text-xs font-medium text-red-600"
                          >
                            <Trash2Icon size={14} />
                            Excluir veículo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        {vehicle.licensePlate}
                      </span>
                      <Badge
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          status.badgeClass,
                        )}
                      >
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500">
                  Página <strong className="font-semibold text-slate-900">{currentPage}</strong> de{" "}
                  <strong className="font-semibold text-slate-900">{totalPages}</strong>
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage <= 1}
                    onClick={() => navigate({ vpage: "1" })}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Primeira página"
                  >
                    <ChevronsLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage <= 1}
                    onClick={() => navigate({ vpage: String(Math.max(1, currentPage - 1)) })}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Página anterior"
                  >
                    <ChevronLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      navigate({ vpage: String(Math.min(totalPages, currentPage + 1)) })
                    }
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Próxima página"
                  >
                    <ChevronRightIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage >= totalPages}
                    onClick={() => navigate({ vpage: String(totalPages) })}
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
    </div>
  );
}
