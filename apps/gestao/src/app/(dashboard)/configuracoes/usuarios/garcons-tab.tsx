"use client";

import {
  BadgePercentIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DollarSignIcon,
  Edit2Icon,
  FilterXIcon,
  HandCoinsIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
  UserCheckIcon,
  UserXIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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
import {
  alternarStatusGarcomAction,
  CommissionRuleData,
  criarOuEditarGarcomAction,
  excluirGarcomAction,
  GarcomMetricas,
  salvarRegraComissaoAction,
  TipClosingItem,
} from "../garcons-actions";

interface GarconsTabProps {
  slug: string;
  garcons: GarcomMetricas[];
  regraComissao: CommissionRuleData | null;
  fechamentos: TipClosingItem[];
  isNewGarcomOpen?: boolean;
  onNewGarcomOpenChange?: (open: boolean) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
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

export function GarconsTab({
  slug,
  garcons,
  regraComissao,
  fechamentos,
  isNewGarcomOpen,
  onNewGarcomOpenChange,
}: GarconsTabProps) {
  const [isPending, startTransition] = useTransition();

  // Dialog de Criar/Editar Garçom
  const [garcomDialogOpen, setGarcomDialogOpen] = useState(false);
  const [editingGarcom, setEditingGarcom] = useState<GarcomMetricas | null>(null);
  const [garcomPhone, setGarcomPhone] = useState("");
  const [garcomCpf, setGarcomCpf] = useState("");
  const [deletingGarcom, setDeletingGarcom] = useState<{ id: string; name: string } | null>(null);

  // Dialog de Regra de Serviço
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);


  // Filtros e busca da tabela de garçons
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Paginação da tabela de garçons
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtros e busca de Fechamentos / Histórico
  const [fechamentosSearchQuery, setFechamentosSearchQuery] = useState("");
  const [fechamentosWaiterFilter, setFechamentosWaiterFilter] = useState("ALL");

  // Paginação de Fechamentos / Histórico
  const [fechamentosCurrentPage, setFechamentosCurrentPage] = useState(1);
  const [fechamentosPageSize, setFechamentosPageSize] = useState(10);

  // Sincronização com botão do cabeçalho da página
  useEffect(() => {
    if (isNewGarcomOpen) {
      setEditingGarcom(null);
      setGarcomPhone("");
      setGarcomCpf("");
      setGarcomDialogOpen(true);
      onNewGarcomOpenChange?.(false);
    }
  }, [isNewGarcomOpen, onNewGarcomOpenChange]);

  // Métricas Consolidadas
  const totalGarcons = garcons.length;
  const garconsAtivos = garcons.filter((g) => g.waiter.status === "ACTIVE").length;
  const totalVendidoSalao = garcons.reduce((acc, g) => acc + g.totalSales, 0);
  const totalTaxaServico = garcons.reduce((acc, g) => acc + g.totalServiceFee, 0);
  const totalGorjetasPagas = garcons.reduce((acc, g) => acc + g.totalTipsPaid, 0);
  const totalPendente = garcons.reduce((acc, g) => acc + g.pendingBalance, 0);

  // Filtragem de garçons
  const filteredGarcons = useMemo(() => {
    return garcons.filter((g) => {
      // Busca por nome, telefone ou CPF
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = g.waiter.name.toLowerCase().includes(query);
        const matchesPhone = g.waiter.phone ? g.waiter.phone.toLowerCase().includes(query) : false;
        const matchesCpf = g.waiter.cpf ? g.waiter.cpf.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesPhone && !matchesCpf) return false;
      }

      // Filtro de status
      if (statusFilter === "ACTIVE" && g.waiter.status !== "ACTIVE") return false;
      if (statusFilter === "INACTIVE" && g.waiter.status !== "INACTIVE") return false;

      return true;
    });
  }, [garcons, searchQuery, statusFilter]);

  // Paginação de garçons
  const totalPages = Math.max(1, Math.ceil(filteredGarcons.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedGarcons = filteredGarcons.slice(startIndex, endIndex);

  const isFiltering = searchQuery.trim() !== "" || statusFilter !== "ALL";

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  // Filtragem de Fechamentos
  const filteredFechamentos = useMemo(() => {
    return fechamentos.filter((f) => {
      if (fechamentosSearchQuery.trim()) {
        const query = fechamentosSearchQuery.toLowerCase().trim();
        const matchesName = f.waiterName.toLowerCase().includes(query);
        const matchesNotes = f.notes ? f.notes.toLowerCase().includes(query) : false;
        const matchesRef = f.referenceDate ? f.referenceDate.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesNotes && !matchesRef) return false;
      }

      if (fechamentosWaiterFilter !== "ALL" && f.waiterId !== fechamentosWaiterFilter) {
        return false;
      }

      return true;
    });
  }, [fechamentos, fechamentosSearchQuery, fechamentosWaiterFilter]);

  // Paginação de Fechamentos
  const totalFechamentos = fechamentos.length;
  const fechamentosTotalPages = Math.max(
    1,
    Math.ceil(filteredFechamentos.length / fechamentosPageSize),
  );
  const validFechamentosPage = Math.min(fechamentosCurrentPage, fechamentosTotalPages);
  const startFechamentosIndex = (validFechamentosPage - 1) * fechamentosPageSize;
  const endFechamentosIndex = startFechamentosIndex + fechamentosPageSize;
  const paginatedFechamentos = filteredFechamentos.slice(
    startFechamentosIndex,
    endFechamentosIndex,
  );

  const isFilteringFechamentos =
    fechamentosSearchQuery.trim() !== "" || fechamentosWaiterFilter !== "ALL";

  const handleClearFechamentosFilters = () => {
    setFechamentosSearchQuery("");
    setFechamentosWaiterFilter("ALL");
    setFechamentosCurrentPage(1);
  };

  // Abrir Modal para Novo Garçom
  const handleOpenNewGarcom = () => {
    setEditingGarcom(null);
    setGarcomPhone("");
    setGarcomCpf("");
    setGarcomDialogOpen(true);
  };

  // Abrir Modal para Editar Garçom
  const handleOpenEditGarcom = (g: GarcomMetricas) => {
    setEditingGarcom(g);
    setGarcomPhone(formatPhone(g.waiter.phone || ""));
    setGarcomCpf(formatCpf(g.waiter.cpf || ""));
    setGarcomDialogOpen(true);
  };

  // Submeter Garçom
  const handleGarcomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (editingGarcom) {
      formData.set("id", editingGarcom.waiter.id);
    }
    formData.set("phone", garcomPhone);
    formData.set("cpf", garcomCpf);

    startTransition(async () => {
      const res = await criarOuEditarGarcomAction(slug, formData);
      if (res.success) {
        toast.success(editingGarcom ? "Garçom atualizado!" : "Garçom cadastrado com sucesso!");
        setGarcomDialogOpen(false);
      } else {
        toast.error(res.error || "Erro ao salvar garçom.");
      }
    });
  };

  // Alternar Status
  const handleToggleStatus = (waiterId: string, currentStatus: "ACTIVE" | "INACTIVE") => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      const res = await alternarStatusGarcomAction(slug, waiterId, nextStatus);
      if (res.success) {
        toast.success(`Garçom ${nextStatus === "ACTIVE" ? "ativado" : "inativado"} com sucesso.`);
      } else {
        toast.error(res.error || "Erro ao alterar status.");
      }
    });
  };

  // Excluir Garçom
  const handleDeleteConfirm = () => {
    if (!deletingGarcom) return;

    startTransition(async () => {
      const res = await excluirGarcomAction(slug, deletingGarcom.id);
      if (res.success) {
        toast.success("Garçom removido com sucesso.");
        setDeletingGarcom(null);
      } else {
        toast.error(res.error || "Erro ao remover garçom.");
      }
    });
  };

  // Submeter Regra de Comissão
  const handleRuleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await salvarRegraComissaoAction(slug, formData);
      if (res.success) {
        toast.success("Regra de taxa de serviço atualizada!");
        setRuleDialogOpen(false);
      } else {
        toast.error(res.error || "Erro ao salvar regra.");
      }
    });
  };


  return (
    <div className="space-y-6">
      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Garçons
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <UtensilsIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalGarcons}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {garconsAtivos} ativo{garconsAtivos !== 1 ? "s" : ""} no salão
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Vendas no Salão
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <DollarSignIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {formatCurrency(totalVendidoSalao)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Faturado pela equipe
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Taxa de Serviço
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <BadgePercentIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {formatCurrency(totalTaxaServico)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {regraComissao ? `${regraComissao.serviceFeePercent}% apurado` : "10% apurado"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Saldo a Pagar
              </span>
              <div className="rounded-lg bg-purple-100 p-1.5 text-purple-700">
                <HandCoinsIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-purple-700">
              {formatCurrency(totalPendente)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatCurrency(totalGorjetasPagas)} já repassados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Sub-Bar: Regra de Serviço ──── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-slate-200 bg-white py-1 px-2.5 text-xs font-medium text-slate-700 shadow-2xs">
            <BadgePercentIcon size={13} className="mr-1.5 text-amber-600" />
            {regraComissao
              ? `${regraComissao.name} (${regraComissao.serviceFeePercent}% com repasse de ${regraComissao.waiterSharePercent}%)`
              : "Taxa de Serviço: 10% (Padrão)"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRuleDialogOpen(true)}
            className="h-8 gap-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Settings2Icon size={13} />
            <span>Configurar Regra</span>
          </Button>
        </div>
      </div>

      {/* ── Table & List Container (Garçons) ─────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {/* Filtros de Garçons */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por nome, telefone ou CPF..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
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

            {/* Select: Status */}
            <div className="flex flex-wrap items-center gap-2">
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
                    <SelectItem value="ACTIVE">Ativos</SelectItem>
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
        </div>
        {filteredGarcons.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <UserXIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhum garçom encontrado
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {isFiltering
                ? "Tente ajustar os termos da busca ou limpar os filtros para ver outros membros da equipe."
                : "Nenhum garçom cadastrado no salão ainda. Comece adicionando um novo garçom!"}
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
                onClick={handleOpenNewGarcom}
                className="mt-4 gap-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <PlusIcon size={14} />
                Novo Garçom
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="w-[200px] text-xs font-semibold text-slate-600">Garçom</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Contato / CPF</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-600">% Comissão</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-600">Pedidos</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-600">Total Vendido</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-600">Taxa Gerada</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-600">Gorjetas Pagas</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-600">Saldo a Pagar</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="w-[80px] text-right text-xs font-semibold text-slate-600">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGarcons.map((g) => {
                    const isAvailable = g.waiter.status === "ACTIVE";
                    return (
                      <TableRow key={g.waiter.id} className="border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700">
                              {g.waiter.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{g.waiter.name}</p>
                              <p className="text-[10px] text-slate-400">ID: {g.waiter.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-slate-600">
                          <div>{g.waiter.phone || "—"}</div>
                          <div className="text-[10px] text-slate-400">{g.waiter.cpf || ""}</div>
                        </TableCell>

                        <TableCell className="text-center text-xs font-semibold text-slate-700">
                          {g.waiter.commissionPercent > 0 ? (
                            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-purple-700 font-bold">
                              {g.waiter.commissionPercent}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">Padrão da Loja</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-xs font-medium text-slate-700">
                          {g.totalOrders}
                        </TableCell>

                        <TableCell className="text-right text-xs font-semibold text-slate-900">
                          {formatCurrency(g.totalSales)}
                        </TableCell>

                        <TableCell className="text-right text-xs font-medium text-amber-700">
                          {formatCurrency(g.totalServiceFee)}
                        </TableCell>

                        <TableCell className="text-right text-xs font-medium text-slate-500">
                          {formatCurrency(g.totalTipsPaid)}
                        </TableCell>

                        <TableCell className="text-right text-xs font-bold text-purple-700">
                          {formatCurrency(g.pendingBalance)}
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isAvailable ? "text-emerald-700" : "text-slate-400",
                              )}
                            >
                              {isAvailable ? "Ativo" : "Inativo"}
                            </span>
                            <Switch
                              checked={isAvailable}
                              disabled={isPending}
                              onCheckedChange={() =>
                                handleToggleStatus(
                                  g.waiter.id,
                                  g.waiter.status as "ACTIVE" | "INACTIVE",
                                )
                              }
                              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                            />
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-900"
                              >
                                <MoreHorizontalIcon size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleOpenEditGarcom(g)}
                                className="gap-2 text-xs"
                              >
                                <Edit2Icon size={13} />
                                Editar dados
                              </DropdownMenuItem>


                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleStatus(
                                    g.waiter.id,
                                    g.waiter.status as "ACTIVE" | "INACTIVE",
                                  )
                                }
                                className="gap-2 text-xs"
                              >
                                {isAvailable ? (
                                  <>
                                    <UserXIcon size={13} className="text-amber-600" />
                                    Desativar garçom
                                  </>
                                ) : (
                                  <>
                                    <UserCheckIcon size={13} className="text-emerald-600" />
                                    Ativar garçom
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => setDeletingGarcom({ id: g.waiter.id, name: g.waiter.name })}
                                className="gap-2 text-xs text-red-600 focus:text-red-600"
                              >
                                <Trash2Icon size={13} />
                                Excluir garçom
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

            {/* Mobile / Tablet Cards View */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {paginatedGarcons.map((g) => {
                const isAvailable = g.waiter.status === "ACTIVE";
                return (
                  <div key={g.waiter.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700">
                          {g.waiter.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{g.waiter.name}</p>
                          <p className="text-xs text-slate-500">
                            {g.waiter.phone || "Sem telefone"} {g.waiter.cpf ? `• ${g.waiter.cpf}` : ""}
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <MoreHorizontalIcon size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleOpenEditGarcom(g)} className="gap-2 text-xs">
                            <Edit2Icon size={13} />
                            Editar dados
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeletingGarcom({ id: g.waiter.id, name: g.waiter.name })} className="gap-2 text-xs text-red-600">
                            <Trash2Icon size={13} />
                            Excluir garçom
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Vendas</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(g.totalSales)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Taxa Gerada</span>
                        <span className="font-semibold text-amber-700">{formatCurrency(g.totalServiceFee)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Saldo</span>
                        <span className="font-bold text-purple-700">{formatCurrency(g.pendingBalance)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">
                        Comissão: <strong className="text-slate-700">{g.waiter.commissionPercent > 0 ? `${g.waiter.commissionPercent}%` : "Padrão"}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-medium", isAvailable ? "text-emerald-700" : "text-slate-400")}>
                          {isAvailable ? "Ativo" : "Inativo"}
                        </span>
                        <Switch
                          checked={isAvailable}
                          disabled={isPending}
                          onCheckedChange={() =>
                            handleToggleStatus(g.waiter.id, g.waiter.status as "ACTIVE" | "INACTIVE")
                          }
                          className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls (Garçons) */}
            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Items per page selector & Result counter */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>
                  Exibindo{" "}
                  <strong className="font-semibold text-slate-900">
                    {filteredGarcons.length}
                  </strong>{" "}
                  de {totalGarcons} garçom{totalGarcons !== 1 ? "s" : ""}
                </span>
                {isFiltering && (
                  <span className="text-[11px] font-medium text-amber-600">
                    (Filtros aplicados)
                  </span>
                )}
                <span className="hidden sm:inline text-slate-300">|</span>
                <div className="flex items-center gap-1.5">
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
                  <span>por página</span>
                </div>
              </div>

              {/* Page numbers & navigations */}
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-xs text-slate-500">
                  Página <strong className="font-semibold text-slate-900">{validCurrentPage}</strong> de{" "}
                  <strong className="font-semibold text-slate-900">{totalPages}</strong>
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

      {/* ── Histórico de Fechamentos de Gorjetas ───────────────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ReceiptIcon size={18} className="text-purple-600" />
              Histórico de Repasses de Gorjetas e Comissões
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Registro dos pagamentos de comissões e taxas de serviço efetuados para a equipe.
            </CardDescription>
          </div>

          <div className="text-xs text-slate-500">
            Total apurado: <strong className="font-semibold text-slate-900">{formatCurrency(totalGorjetasPagas)}</strong>
          </div>
        </CardHeader>

        {/* ── Filtros da Tabela de Fechamentos ── */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por garçom, observação ou competência..."
                value={fechamentosSearchQuery}
                onChange={(e) => {
                  setFechamentosSearchQuery(e.target.value);
                  setFechamentosCurrentPage(1);
                }}
                className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
              />
              {fechamentosSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setFechamentosSearchQuery("");
                    setFechamentosCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            {/* Select: Garçom */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-48">
                <Select
                  value={fechamentosWaiterFilter}
                  onValueChange={(val) => {
                    setFechamentosWaiterFilter(val);
                    setFechamentosCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Filtrar por garçom..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todos os garçons</SelectItem>
                    {garcons.map((g) => (
                      <SelectItem key={g.waiter.id} value={g.waiter.id}>
                        {g.waiter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isFilteringFechamentos && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFechamentosFilters}
                  className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <FilterXIcon size={14} />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {filteredFechamentos.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                <ReceiptIcon size={24} />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-slate-900">
                {isFilteringFechamentos
                  ? "Nenhum repasse encontrado para os filtros selecionados"
                  : "Nenhum repasse registrado até o momento"}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {isFilteringFechamentos
                  ? "Tente ajustar ou limpar os filtros de busca para ver outros registros."
                  : "Quando houver fechamento e repasse de comissões, eles aparecerão detalhados aqui."}
              </p>
              {isFilteringFechamentos && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFechamentosFilters}
                  className="mt-3 gap-1.5 rounded-full border-slate-200 text-xs"
                >
                  <FilterXIcon size={14} />
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-slate-600">Data / Hora</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Garçom</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Competência</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-600">Valor Repassado</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Observações</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-slate-600">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFechamentos.map((f) => (
                      <TableRow key={f.id} className="border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="text-xs text-slate-700 font-medium">
                          {formatDate(f.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-900">
                          {f.waiterName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {f.referenceDate}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-emerald-700">
                          {formatCurrency(f.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 truncate max-w-[250px]">
                          {f.notes || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 border-none">
                            <CheckCircle2Icon size={11} className="mr-1 text-emerald-600" />
                            Pago
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação de Fechamentos */}
              <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>
                    Exibindo{" "}
                    <strong className="font-semibold text-slate-900">
                      {filteredFechamentos.length}
                    </strong>{" "}
                    de {totalFechamentos} repasse{totalFechamentos !== 1 ? "s" : ""}
                  </span>
                  {isFilteringFechamentos && (
                    <span className="text-[11px] font-medium text-amber-600">
                      (Filtros aplicados)
                    </span>
                  )}
                  <span className="hidden sm:inline text-slate-300">|</span>
                  <div className="flex items-center gap-1.5">
                    <span>Exibir</span>
                    <Select
                      value={String(fechamentosPageSize)}
                      onValueChange={(val) => {
                        setFechamentosPageSize(Number(val));
                        setFechamentosCurrentPage(1);
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
                    <span>por página</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span className="text-xs text-slate-500">
                    Página <strong className="font-semibold text-slate-900">{validFechamentosPage}</strong> de{" "}
                    <strong className="font-semibold text-slate-900">{fechamentosTotalPages}</strong>
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={validFechamentosPage <= 1}
                      onClick={() => setFechamentosCurrentPage(1)}
                      className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                      title="Primeira página"
                    >
                      <ChevronsLeftIcon size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={validFechamentosPage <= 1}
                      onClick={() => setFechamentosCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                      title="Página anterior"
                    >
                      <ChevronLeftIcon size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={validFechamentosPage >= fechamentosTotalPages}
                      onClick={() =>
                        setFechamentosCurrentPage((p) => Math.min(fechamentosTotalPages, p + 1))
                      }
                      className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                      title="Próxima página"
                    >
                      <ChevronRightIcon size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={validFechamentosPage >= fechamentosTotalPages}
                      onClick={() => setFechamentosCurrentPage(fechamentosTotalPages)}
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
        </CardContent>
      </Card>

      {/* ── Dialog: Criar/Editar Garçom ─────────────────────────────────── */}
      <Dialog open={garcomDialogOpen} onOpenChange={setGarcomDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleGarcomSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {editingGarcom ? "Editar Garçom" : "Cadastrar Novo Garçom"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre o profissional que atenderá mesas no salão e registrará pedidos via Comanda Mobile.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Nome Completo / Apelido no Salão
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editingGarcom?.waiter.name || ""}
                  placeholder="Ex: Carlos Oliveira (Carlinhos)"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={garcomPhone}
                    onChange={(e) => setGarcomPhone(formatPhone(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cpf" className="text-xs font-semibold text-slate-700">
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    name="cpf"
                    value={garcomCpf}
                    onChange={(e) => setGarcomCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="commissionPercent" className="text-xs font-semibold text-slate-700">
                  Percentual de Comissão Individual (%)
                </Label>
                <Input
                  id="commissionPercent"
                  name="commissionPercent"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  defaultValue={editingGarcom?.waiter.commissionPercent ?? 0}
                  placeholder="0 (deixe 0 para usar taxa de 10% padrão)"
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-slate-400">
                  Deixe em 0% se o garçom recebe a taxa de serviço rateada padrão da casa.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-semibold text-slate-700">
                  Status
                </Label>
                <Select name="status" defaultValue={editingGarcom?.waiter.status || "ACTIVE"}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Ativo (visível no app garçom)</SelectItem>
                    <SelectItem value="INACTIVE">Inativo (bloqueado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGarcomDialogOpen(false)}
                disabled={isPending}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="h-9 gap-1.5 bg-slate-950 text-xs font-semibold text-white hover:bg-slate-800">
                {isPending && <Loader2Icon size={14} className="animate-spin" />}
                {editingGarcom ? "Salvar Alterações" : "Cadastrar Garçom"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Regras de Taxa de Serviço ───────────────────────────── */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleRuleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Regra de Taxa de Serviço e Gorjetas
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Defina o percentual de serviço adicionado às comandas do salão e quanto é repassado aos garçons.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="ruleName" className="text-xs font-semibold text-slate-700">
                  Nome da Regra
                </Label>
                <Input
                  id="ruleName"
                  name="name"
                  defaultValue={regraComissao?.name || "Taxa de Serviço do Salão (10%)"}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="serviceFeePercent" className="text-xs font-semibold text-slate-700">
                    Taxa Sugerida na Comanda (%)
                  </Label>
                  <Input
                    id="serviceFeePercent"
                    name="serviceFeePercent"
                    type="number"
                    step="1"
                    min="0"
                    max="30"
                    defaultValue={regraComissao?.serviceFeePercent ?? 10}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-slate-400">Geralmente 10%</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="waiterSharePercent" className="text-xs font-semibold text-slate-700">
                    Repasse para Equipe (%)
                  </Label>
                  <Input
                    id="waiterSharePercent"
                    name="waiterSharePercent"
                    type="number"
                    step="5"
                    min="0"
                    max="100"
                    defaultValue={regraComissao?.waiterSharePercent ?? 100}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-slate-400">100% = repasse integral</p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRuleDialogOpen(false)}
                disabled={isPending}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="h-9 gap-1.5 bg-slate-950 text-xs font-semibold text-white hover:bg-slate-800">
                {isPending && <Loader2Icon size={14} className="animate-spin" />}
                Salvar Regra
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* ── Dialog: Confirmar Exclusão de Garçom ────────── */}
      <ConfirmDeleteDialog
        open={Boolean(deletingGarcom)}
        onOpenChange={(open) => {
          if (!open) setDeletingGarcom(null);
        }}
        title="Excluir Garçom"
        description={
          <>
            Tem certeza que deseja remover o garçom{" "}
            <strong className="text-slate-900 font-semibold">
              {deletingGarcom?.name}
            </strong>
            ? Esta ação não pode ser desfeita e removerá o garçom da lista do salão.
          </>
        }
        confirmLabel="Sim, excluir garçom"
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
