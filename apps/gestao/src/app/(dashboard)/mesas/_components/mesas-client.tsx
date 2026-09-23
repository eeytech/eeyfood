"use client";

import type { DiningTable } from "@fsw/db";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FilterXIcon,
  HashIcon,
  LayoutGridIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  alternarStatusMesaAction,
  createTableAction,
  deleteTableAction,
  updateTableAction,
} from "@/app/(dashboard)/mesas-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface MesasClientProps {
  slug: string;
  tables: DiningTable[];
}

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "Data indisp.";
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "Data indisp.";
  }
};

export function MesasClient({ slug, tables }: MesasClientProps) {
  const [isPending, startTransition] = useTransition();

  // Create Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSeats, setCreateSeats] = useState("4");
  const [createDisplayOrder, setCreateDisplayOrder] = useState("");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Dialog State
  const [editingTable, setEditingTable] = useState<DiningTable | null>(null);
  const [editName, setEditName] = useState("");
  const [editSeats, setEditSeats] = useState("4");
  const [editDisplayOrder, setEditDisplayOrder] = useState("0");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Dialog State
  const [deletingTable, setDeletingTable] = useState<DiningTable | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [capacityFilter, setCapacityFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("DISPLAY_ORDER");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered & Sorted list
  const filteredTables = useMemo(() => {
    return tables
      .filter((t) => {
        // Search term
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          if (!t.name.toLowerCase().includes(query)) return false;
        }

        // Status filter
        if (statusFilter === "ACTIVE" && !t.isActive) return false;
        if (statusFilter === "INACTIVE" && t.isActive) return false;

        // Capacity filter
        if (capacityFilter === "SMALL" && t.seats > 2) return false;
        if (capacityFilter === "MEDIUM" && (t.seats < 3 || t.seats > 4)) return false;
        if (capacityFilter === "LARGE" && t.seats < 5) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "DISPLAY_ORDER") {
          if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
          return a.name.localeCompare(b.name, "pt-BR", { numeric: true });
        }
        if (sortBy === "SEATS_DESC") {
          return b.seats - a.seats;
        }
        if (sortBy === "SEATS_ASC") {
          return a.seats - b.seats;
        }
        if (sortBy === "NAME") {
          return a.name.localeCompare(b.name, "pt-BR", { numeric: true });
        }
        return 0;
      });
  }, [tables, searchQuery, statusFilter, capacityFilter, sortBy]);

  // Metric stats
  const totalCount = tables.length;
  const activeCount = tables.filter((t) => t.isActive).length;
  const inactiveCount = totalCount - activeCount;
  const totalSeats = tables
    .filter((t) => t.isActive)
    .reduce((acc, t) => acc + (t.seats || 0), 0);
  const avgSeats =
    activeCount > 0 ? (totalSeats / activeCount).toFixed(1) : "0";

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredTables.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTables = filteredTables.slice(startIndex, endIndex);

  const isFiltering =
    searchQuery.trim() !== "" ||
    statusFilter !== "ALL" ||
    capacityFilter !== "ALL" ||
    sortBy !== "DISPLAY_ORDER";

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setCapacityFilter("ALL");
    setSortBy("DISPLAY_ORDER");
    setCurrentPage(1);
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setCreateError(null);
    setCreateName("");
    setCreateSeats("4");
    setCreateDisplayOrder(String(tables.length + 1));
    setCreateIsActive(true);
    setIsCreateOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);

    const formData = new FormData();
    formData.set("name", createName);
    formData.set("seats", createSeats);
    formData.set("displayOrder", createDisplayOrder);
    formData.set("isActive", createIsActive ? "on" : "false");

    startTransition(async () => {
      const result = await createTableAction(slug, formData);
      if (result.error) {
        setCreateError(result.error);
        toast.error(result.error);
      } else {
        toast.success(`Mesa "${createName}" cadastrada com sucesso!`);
        setIsCreateOpen(false);
      }
    });
  };

  // Open Edit Dialog
  const handleOpenEdit = (table: DiningTable) => {
    setEditingTable(table);
    setEditName(table.name);
    setEditSeats(String(table.seats));
    setEditDisplayOrder(String(table.displayOrder));
    setEditIsActive(table.isActive);
    setEditError(null);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    setEditError(null);

    const formData = new FormData();
    formData.set("tableId", editingTable.id);
    formData.set("name", editName);
    formData.set("seats", editSeats);
    formData.set("displayOrder", editDisplayOrder);
    formData.set("isActive", editIsActive ? "on" : "false");

    startTransition(async () => {
      const result = await updateTableAction(slug, formData);
      if (result.error) {
        setEditError(result.error);
        toast.error(result.error);
      } else {
        toast.success(`Mesa "${editName}" atualizada com sucesso!`);
        setEditingTable(null);
      }
    });
  };

  // Toggle Status via Switch
  const handleToggleStatus = (
    tableId: string,
    currentStatus: boolean,
    tableName: string,
  ) => {
    startTransition(async () => {
      const result = await alternarStatusMesaAction(tableId, !currentStatus, slug);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Mesa "${tableName}" ${!currentStatus ? "ativada" : "desativada"} com sucesso.`,
        );
      }
    });
  };

  // Confirm Delete
  const handleDeleteConfirm = () => {
    if (!deletingTable) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("tableId", deletingTable.id);
      const result = await deleteTableAction(slug, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Mesa "${deletingTable.name}" excluída com sucesso.`);
        setDeletingTable(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <LayoutGridIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Gestão de Mesas
            </h1>
            <p className="text-sm text-slate-500">
              Cadastre e organize as mesas do seu salão para uso nas comandas e no atendimento presencial.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <PlusIcon size={16} />
          <span>Nova Mesa</span>
        </Button>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Total de Mesas */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Mesas
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <LayoutGridIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeCount} ativas no salão
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Capacidade do Salão */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Capacidade Total
              </span>
              <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                <UsersIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-indigo-700">
              {totalSeats}{" "}
              <span className="text-xs font-medium text-slate-500">lugares</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Média de {avgSeats} por mesa ativa
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Mesas Ativas */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Mesas Ativas
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {activeCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Prontas para atendimento
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Status Operacional */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status Salão
              </span>
              <div
                className={cn(
                  "rounded-lg p-1.5",
                  inactiveCount > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700",
                )}
              >
                {inactiveCount > 0 ? (
                  <AlertCircleIcon size={16} />
                ) : (
                  <CheckCircle2Icon size={16} />
                )}
              </div>
            </div>
            <p
              className={cn(
                "mt-2 font-display text-2xl font-bold",
                inactiveCount > 0 ? "text-amber-700" : "text-emerald-700",
              )}
            >
              {inactiveCount > 0 ? inactiveCount : "100%"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {inactiveCount > 0
                ? `${inactiveCount} inativa(s) no momento`
                : "100% das mesas ativas"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters Card ────────────────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar mesa por nome (ex.: Mesa 01, Varanda 02)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="w-full sm:w-36">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="ACTIVE">Ativas</SelectItem>
                    <SelectItem value="INACTIVE">Inativas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Capacity Filter */}
              <div className="w-full sm:w-44">
                <Select
                  value={capacityFilter}
                  onValueChange={(val) => {
                    setCapacityFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Lugares..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todos os tamanhos</SelectItem>
                    <SelectItem value="SMALL">Pequenas (1 a 2)</SelectItem>
                    <SelectItem value="MEDIUM">Médias (3 a 4)</SelectItem>
                    <SelectItem value="LARGE">Grandes (5+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Order / Sort */}
              <div className="w-full sm:w-44">
                <Select
                  value={sortBy}
                  onValueChange={(val) => {
                    setSortBy(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Ordenar..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="DISPLAY_ORDER">Ordem de exibição</SelectItem>
                    <SelectItem value="SEATS_DESC">Mais lugares primeiro</SelectItem>
                    <SelectItem value="SEATS_ASC">Menos lugares primeiro</SelectItem>
                    <SelectItem value="NAME">Nome (A-Z)</SelectItem>
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

          {/* Results counter indicator */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Exibindo{" "}
              <strong className="font-semibold text-slate-900">
                {filteredTables.length}
              </strong>{" "}
              de {totalCount} mesa{totalCount !== 1 ? "s" : ""}
            </span>
            {isFiltering && (
              <span className="text-[11px] font-medium text-amber-600">
                Filtros aplicados
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Table & List Container ───────────────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {/* Empty state */}
        {filteredTables.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <LayoutGridIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhuma mesa encontrada
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {isFiltering
                ? "Tente ajustar os termos da busca ou limpar os filtros para visualizar outras mesas."
                : "Nenhuma mesa cadastrada neste restaurante ainda. Comece cadastrando sua primeira mesa!"}
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
                onClick={handleOpenCreate}
                className="mt-4 gap-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <PlusIcon size={14} />
                Cadastrar primeira mesa
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
                    <TableHead className="w-[300px] text-xs font-semibold text-slate-700">
                      Mesa
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Capacidade (Lugares)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Ordem de Exibição
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Data de Cadastro
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
                  {paginatedTables.map((table) => {
                    return (
                      <TableRow
                        key={table.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        {/* Mesa */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700 shadow-xs">
                              <LayoutGridIcon size={16} className="text-slate-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {table.name}
                              </p>
                              <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                                <HashIcon size={11} className="shrink-0" />
                                Ordem #{table.displayOrder}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Capacidade */}
                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 transition-colors">
                            <UsersIcon size={12} className="shrink-0 text-indigo-600" />
                            {table.seats} {table.seats === 1 ? "lugar" : "lugares"}
                          </span>
                        </TableCell>

                        {/* Ordem */}
                        <TableCell className="py-3.5 text-xs font-medium text-slate-600">
                          #{table.displayOrder}
                        </TableCell>

                        {/* Data */}
                        <TableCell className="py-3.5 text-xs text-slate-500">
                          {formatDate(table.createdAt)}
                        </TableCell>

                        {/* Status Switch */}
                        <TableCell className="py-3.5 text-center">
                          <div className="inline-flex items-center gap-2">
                            <Switch
                              checked={table.isActive}
                              disabled={isPending}
                              onCheckedChange={() =>
                                handleToggleStatus(
                                  table.id,
                                  table.isActive,
                                  table.name,
                                )
                              }
                              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                            />
                            <span
                              className={cn(
                                "text-xs font-medium",
                                table.isActive
                                  ? "text-emerald-700"
                                  : "text-slate-400",
                              )}
                            >
                              {table.isActive ? "Ativa" : "Inativa"}
                            </span>
                          </div>
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
                                Opções da Mesa
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(table)}
                                className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                              >
                                <PencilIcon size={14} className="text-slate-500" />
                                Editar dados
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleStatus(
                                    table.id,
                                    table.isActive,
                                    table.name,
                                  )
                                }
                                className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                              >
                                {table.isActive ? (
                                  <>
                                    <AlertCircleIcon
                                      size={14}
                                      className="text-amber-500"
                                    />
                                    Desativar mesa
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2Icon
                                      size={14}
                                      className="text-emerald-600"
                                    />
                                    Ativar mesa
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem
                                onClick={() => setDeletingTable(table)}
                                className="gap-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                              >
                                <Trash2Icon size={14} />
                                Excluir mesa
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
              {paginatedTables.map((table) => {
                return (
                  <div key={table.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                          <LayoutGridIcon size={16} className="text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {table.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Ordem #{table.displayOrder} • {formatDate(table.createdAt)}
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
                            onClick={() => handleOpenEdit(table)}
                            className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                          >
                            <PencilIcon size={14} />
                            Editar dados
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleStatus(
                                table.id,
                                table.isActive,
                                table.name,
                              )
                            }
                            className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                          >
                            {table.isActive ? (
                              <>
                                <AlertCircleIcon
                                  size={14}
                                  className="text-amber-500"
                                />
                                Desativar mesa
                              </>
                            ) : (
                              <>
                                <CheckCircle2Icon
                                  size={14}
                                  className="text-emerald-600"
                                />
                                Ativar mesa
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100" />
                          <DropdownMenuItem
                            onClick={() => setDeletingTable(table)}
                            className="gap-2 rounded-lg text-xs font-medium text-red-600"
                          >
                            <Trash2Icon size={14} />
                            Excluir mesa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                        <UsersIcon size={11} />
                        {table.seats} {table.seats === 1 ? "lugar" : "lugares"}
                      </span>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            table.isActive
                              ? "text-emerald-700"
                              : "text-slate-400",
                          )}
                        >
                          {table.isActive ? "Ativa" : "Inativa"}
                        </span>
                        <Switch
                          checked={table.isActive}
                          disabled={isPending}
                          onCheckedChange={() =>
                            handleToggleStatus(
                              table.id,
                              table.isActive,
                              table.name,
                            )
                          }
                          className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Items per page selector */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Exibir</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-16 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200 bg-white">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>mesas por página</span>
              </div>

              {/* Page numbers & navigations */}
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-xs text-slate-500">
                  Página{" "}
                  <strong className="font-semibold text-slate-900">
                    {validCurrentPage}
                  </strong>{" "}
                  de{" "}
                  <strong className="font-semibold text-slate-900">
                    {totalPages}
                  </strong>
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Primeira página"
                  >
                    <ChevronsLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Página anterior"
                  >
                    <ChevronLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Próxima página"
                  >
                    <ChevronRightIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Última página"
                  >
                    <ChevronsRightIcon size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── Dialog: Cadastrar Nova Mesa ─────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <PlusIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Cadastrar Nova Mesa
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Preencha as informações para adicionar a mesa ao salão.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            {createError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="create-mesa-name"
                className="text-xs font-semibold text-slate-700"
              >
                Nome ou Identificação da Mesa
              </Label>
              <Input
                id="create-mesa-name"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex.: Mesa 01, Varanda 04, Balcão 02"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="create-mesa-seats"
                  className="text-xs font-semibold text-slate-700"
                >
                  Capacidade (Lugares)
                </Label>
                <Input
                  id="create-mesa-seats"
                  type="number"
                  min={1}
                  max={99}
                  required
                  value={createSeats}
                  onChange={(e) => setCreateSeats(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="create-mesa-order"
                  className="text-xs font-semibold text-slate-700"
                >
                  Ordem de Exibição
                </Label>
                <Input
                  id="create-mesa-order"
                  type="number"
                  min={0}
                  required
                  value={createDisplayOrder}
                  onChange={(e) => setCreateDisplayOrder(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Mesa ativa para atendimento
                </p>
                <p className="text-[11px] text-slate-500">
                  Disponível para lançar comandas e pedidos no salão
                </p>
              </div>
              <Switch
                checked={createIsActive}
                onCheckedChange={setCreateIsActive}
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {isPending && (
                  <LoaderCircleIcon size={14} className="mr-1.5 animate-spin" />
                )}
                {isPending ? "Cadastrando..." : "Cadastrar Mesa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar Mesa ─────────────────────────── */}
      <Dialog
        open={Boolean(editingTable)}
        onOpenChange={(open) => {
          if (!open) setEditingTable(null);
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <PencilIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Editar Mesa
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Atualize a identificação, capacidade ou ordem desta mesa.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            {editError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-mesa-name"
                className="text-xs font-semibold text-slate-700"
              >
                Nome ou Identificação da Mesa
              </Label>
              <Input
                id="edit-mesa-name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-mesa-seats"
                  className="text-xs font-semibold text-slate-700"
                >
                  Capacidade (Lugares)
                </Label>
                <Input
                  id="edit-mesa-seats"
                  type="number"
                  min={1}
                  max={99}
                  required
                  value={editSeats}
                  onChange={(e) => setEditSeats(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-mesa-order"
                  className="text-xs font-semibold text-slate-700"
                >
                  Ordem de Exibição
                </Label>
                <Input
                  id="edit-mesa-order"
                  type="number"
                  min={0}
                  required
                  value={editDisplayOrder}
                  onChange={(e) => setEditDisplayOrder(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Mesa ativa para atendimento
                </p>
                <p className="text-[11px] text-slate-500">
                  Disponível para lançar comandas e pedidos no salão
                </p>
              </div>
              <Switch
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTable(null)}
                className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {isPending && (
                  <LoaderCircleIcon size={14} className="mr-1.5 animate-spin" />
                )}
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Exclusão ─────────────────── */}
      <Dialog
        open={Boolean(deletingTable)}
        onOpenChange={(open) => {
          if (!open) setDeletingTable(null);
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <div className="rounded-xl bg-red-100 p-2 text-red-700">
                <Trash2Icon size={20} />
              </div>
              <DialogTitle className="font-display text-lg font-bold text-slate-900">
                Excluir Mesa
              </DialogTitle>
            </div>
            <DialogDescription className="pt-1 text-xs text-slate-500">
              Tem certeza que deseja remover a mesa{" "}
              <strong className="font-semibold text-slate-900">
                {deletingTable?.name}
              </strong>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTable(null)}
              className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleDeleteConfirm}
              className="rounded-full bg-red-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isPending && (
                <LoaderCircleIcon size={14} className="mr-1.5 animate-spin" />
              )}
              {isPending ? "Excluindo..." : "Sim, excluir mesa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
