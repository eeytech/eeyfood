"use client";

import {
  BanknoteIcon,
  BriefcaseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CopyIcon,
  Edit2Icon,
  FilterXIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserCheckIcon,
  UsersIcon,
  UserXIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Textarea } from "@/components/ui/textarea";
import { BRAZIL_UFS } from "@/lib/address-utils";
import { formatCep, formatCpf, formatPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";
import {
  alternarStatusFuncionarioAction,
  criarOuEditarFuncionarioAction,
  excluirFuncionarioAction,
  type FuncionarioMetricas,
} from "../funcionarios-actions";
import type { Employee } from "@fsw/db";

interface FuncionariosTabProps {
  slug: string;
  funcionarios: FuncionarioMetricas[];
  isNewFuncionarioOpen?: boolean;
  onNewFuncionarioOpenChange?: (open: boolean) => void;
}

const CONTRACT_TYPES: Record<string, string> = {
  CLT: "CLT (Efetivo)",
  PJ: "PJ (Prestador)",
  DIARISTA: "Diarista / Freelancer",
  TEMPORARIO: "Temporário",
  ESTAGIO: "Estagiário",
};

export function FuncionariosTab({
  slug,
  funcionarios,
  isNewFuncionarioOpen = false,
  onNewFuncionarioOpenChange,
}: FuncionariosTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Paginação da tabela de funcionários
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Employee | null>(null);
  const [formName, setFormName] = useState("");
  const [formRoleTitle, setFormRoleTitle] = useState("");
  const [formContractType, setFormContractType] = useState("CLT");
  const [formBaseSalary, setFormBaseSalary] = useState("0");
  const [formPaymentFrequency, setFormPaymentFrequency] = useState("MONTHLY");
  const [formPixType, setFormPixType] = useState("CPF");
  const [formPixKey, setFormPixKey] = useState("");
  const [formHireDate, setFormHireDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCep, setFormCep] = useState("");
  const [formLogradouro, setFormLogradouro] = useState("");
  const [formNumero, setFormNumero] = useState("");
  const [formComplemento, setFormComplemento] = useState("");
  const [formBairro, setFormBairro] = useState("");
  const [formCidade, setFormCidade] = useState("");
  const [formEstado, setFormEstado] = useState("");
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [funcionarioToDelete, setFuncionarioToDelete] = useState<Employee | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleFuncionarioCepLookup = async (cepVal: string) => {
    const digits = cepVal.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setFormLogradouro(data.logradouro ?? "");
      setFormBairro(data.bairro ?? "");
      setFormCidade(data.localidade ?? "");
      setFormEstado(data.uf ?? "");
    } catch {
      // busca de CEP silenciosa
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Controle de abertura externa vindo do botão do topo
  const isCreateOpen = isNewFuncionarioOpen || modalOpen;
  const setCreateOpen = (val: boolean) => {
    setModalOpen(val);
    onNewFuncionarioOpenChange?.(val);
    if (!val) {
      setEditingFuncionario(null);
      setFormName("");
      setFormRoleTitle("");
      setFormContractType("CLT");
      setFormBaseSalary("0");
      setFormPaymentFrequency("MONTHLY");
      setFormPixType("CPF");
      setFormPixKey("");
      setFormHireDate("");
      setFormNotes("");
      setFormCpf("");
      setFormPhone("");
      setFormCep("");
      setFormLogradouro("");
      setFormNumero("");
      setFormComplemento("");
      setFormBairro("");
      setFormCidade("");
      setFormEstado("");
      setErrors({});
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  // Métricas
  const totalCount = funcionarios.length;
  const activeCount = funcionarios.filter((f) => f.funcionario.status === "ACTIVE").length;
  const totalFolhaBase = funcionarios
    .filter((f) => f.funcionario.status === "ACTIVE")
    .reduce((acc, f) => acc + Number(f.funcionario.baseSalary || 0), 0);
  const uniqueRoles = Array.from(new Set(funcionarios.map((f) => f.funcionario.roleTitle)));

  // Filtragem
  const filteredFuncionarios = useMemo(() => {
    return funcionarios.filter(({ funcionario }) => {
      if (statusFilter !== "ALL" && funcionario.status !== statusFilter) return false;
      if (roleFilter !== "ALL" && funcionario.roleTitle !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = funcionario.name.toLowerCase().includes(q);
        const matchesRole = funcionario.roleTitle.toLowerCase().includes(q);
        const matchesCpf = funcionario.cpf?.toLowerCase().includes(q);
        const matchesPhone = funcionario.phone?.toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesCpf && !matchesPhone) return false;
      }
      return true;
    });
  }, [funcionarios, searchQuery, statusFilter, roleFilter]);

  // Paginação de funcionários
  const totalPages = Math.max(1, Math.ceil(filteredFuncionarios.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedFuncionarios = filteredFuncionarios.slice(startIndex, endIndex);

  const isFiltering =
    searchQuery.trim() !== "" || statusFilter !== "ALL" || roleFilter !== "ALL";

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setRoleFilter("ALL");
    setCurrentPage(1);
  };

  const handleEdit = (f: Employee) => {
    setEditingFuncionario(f);
    setFormName(f.name || "");
    setFormRoleTitle(f.roleTitle || "");
    setFormContractType(f.contractType || "CLT");
    setFormBaseSalary(String(f.baseSalary || 0));
    setFormPaymentFrequency(f.paymentFrequency || "MONTHLY");
    setFormPixType(f.pixType || "CPF");
    setFormPixKey(f.pixKey || "");
    setFormHireDate(f.hireDate ? String(f.hireDate).slice(0, 10) : "");
    setFormNotes(f.notes || "");
    setFormCpf(formatCpf(f.cpf || ""));
    setFormPhone(formatPhone(f.phone || ""));
    setFormCep(f.cep ? formatCep(f.cep) : "");
    setFormLogradouro(f.logradouro || "");
    setFormNumero(f.numero || "");
    setFormComplemento(f.complemento || "");
    setFormBairro(f.bairro || "");
    setFormCidade(f.cidade || "");
    setFormEstado(f.estado || "");
    setErrors({});
    setCreateOpen(true);
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    startTransition(async () => {
      try {
        await alternarStatusFuncionarioAction(slug, id);
        toast.success(
          currentStatus === "ACTIVE"
            ? "Colaborador desativado com sucesso."
            : "Colaborador ativado com sucesso.",
        );
      } catch {
        toast.error("Erro ao alterar status do colaborador.");
      }
    });
  };

  const handleDelete = () => {
    if (!funcionarioToDelete) return;
    startTransition(async () => {
      try {
        await excluirFuncionarioAction(slug, funcionarioToDelete.id);
        toast.success("Colaborador excluído com sucesso.");
        setDeleteDialogOpen(false);
        setFuncionarioToDelete(null);
      } catch {
        toast.error("Erro ao excluir colaborador.");
      }
    });
  };

  const handleCopyPix = (pixKey?: string | null) => {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey);
    toast.success("Chave Pix copiada para a área de transferência!");
  };

  return (
    <div className="space-y-6">
      {/* ── Cards de Métricas ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Colaboradores
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <UsersIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {totalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeCount} em atividade
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Ativos na Equipe
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <UserCheckIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {activeCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalCount - activeCount} inativos
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Previsão Folha Base
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <BanknoteIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {formatCurrency(totalFolhaBase)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Soma salários ativos
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cargos e Funções
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <BriefcaseIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {uniqueRoles.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Especialidades ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Table & List Container (Funcionários) ─────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {/* Filtros de Colaboradores */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por nome, cargo, CPF ou telefone..."
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
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            {/* Selects: Status & Cargo */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-36">
                <Select
                  value={statusFilter}
                  onValueChange={(val: "ALL" | "ACTIVE" | "INACTIVE") => {
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

              {uniqueRoles.length > 0 && (
                <div className="w-full sm:w-44">
                  <Select
                    value={roleFilter}
                    onValueChange={(val) => {
                      setRoleFilter(val);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Cargo..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="ALL">Todos os cargos</SelectItem>
                      {uniqueRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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

        {filteredFuncionarios.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <UserXIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhum colaborador encontrado
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {isFiltering
                ? "Tente ajustar os termos da busca ou limpar os filtros para ver outros membros da equipe."
                : "Nenhum colaborador cadastrado ainda. Comece adicionando um novo funcionário!"}
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
                Novo Funcionário
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
                    <TableHead className="w-[220px] text-xs font-semibold text-slate-600">Colaborador</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Cargo / Contrato</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Contato / CPF</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Salário Base</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Chave Pix</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="w-[80px] text-right text-xs font-semibold text-slate-600">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFuncionarios.map(({ funcionario, totalPagoMesAtual }) => {
                    const isAvailable = funcionario.status === "ACTIVE";
                    return (
                      <TableRow key={funcionario.id} className="border-slate-100 hover:bg-slate-50/50">
                        {/* Colaborador */}
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700">
                              {funcionario.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{funcionario.name}</p>
                              <p className="text-[10px] text-slate-400">ID: {funcionario.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Cargo / Contrato */}
                        <TableCell className="text-xs text-slate-600">
                          <div className="font-semibold text-slate-900">{funcionario.roleTitle}</div>
                          <div className="text-[11px] text-slate-400">
                            {CONTRACT_TYPES[funcionario.contractType] || funcionario.contractType}
                          </div>
                        </TableCell>

                        {/* Contato / CPF */}
                        <TableCell className="text-xs text-slate-600">
                          <div>{funcionario.phone ? formatPhone(funcionario.phone) : "—"}</div>
                          <div className="text-[10px] text-slate-400">{funcionario.cpf ? formatCpf(funcionario.cpf) : ""}</div>
                        </TableCell>

                        {/* Salário Base */}
                        <TableCell className="text-xs font-semibold text-slate-900">
                          <div>{formatCurrency(Number(funcionario.baseSalary || 0))}</div>
                          {totalPagoMesAtual > 0 ? (
                            <div className="text-[10px] text-emerald-600 font-medium">
                              {formatCurrency(totalPagoMesAtual)} pago no mês
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 font-normal">Aguardando liquidação</div>
                          )}
                        </TableCell>

                        {/* Chave Pix */}
                        <TableCell className="text-xs text-slate-600">
                          {funcionario.pixKey ? (
                            <button
                              type="button"
                              onClick={() => handleCopyPix(funcionario.pixKey)}
                              title="Clique para copiar a chave Pix"
                              className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
                            >
                              <span className="max-w-[120px] truncate font-mono">
                                {funcionario.pixKey}
                              </span>
                              <CopyIcon size={11} className="text-slate-400 group-hover:text-primary" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Não informada</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isAvailable ? "text-primary font-semibold" : "text-slate-400",
                              )}
                            >
                              {isAvailable ? "Ativo" : "Inativo"}
                            </span>
                            <Switch
                              checked={isAvailable}
                              disabled={isPending}
                              onCheckedChange={() =>
                                handleToggleStatus(funcionario.id, funcionario.status)
                              }
                              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
                            />
                          </div>
                        </TableCell>

                        {/* Ações */}
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
                                onClick={() => handleEdit(funcionario)}
                                className="gap-2 text-xs font-semibold cursor-pointer"
                              >
                                <Edit2Icon size={13} className="text-primary" />
                                Editar dados
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleStatus(funcionario.id, funcionario.status)
                                }
                                className="gap-2 text-xs font-semibold cursor-pointer"
                              >
                                {isAvailable ? (
                                  <>
                                    <UserXIcon size={13} className="text-primary" />
                                    Desativar colaborador
                                  </>
                                ) : (
                                  <>
                                    <UserCheckIcon size={13} className="text-primary" />
                                    Ativar colaborador
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="gap-2 text-xs font-semibold cursor-pointer">
                                <Link href="/financeiro" className="flex items-center gap-2 w-full">
                                  <BanknoteIcon size={13} className="text-primary" />
                                  Ver no Financeiro
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setFuncionarioToDelete(funcionario);
                                  setDeleteDialogOpen(true);
                                }}
                                className="gap-2 text-xs font-semibold text-red-600 focus:text-red-600 cursor-pointer"
                              >
                                <Trash2Icon size={13} />
                                Excluir colaborador
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
              {paginatedFuncionarios.map(({ funcionario, totalPagoMesAtual }) => {
                const isAvailable = funcionario.status === "ACTIVE";
                return (
                  <div key={funcionario.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700">
                          {funcionario.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{funcionario.name}</p>
                          <p className="text-xs text-slate-500">
                            {funcionario.phone ? formatPhone(funcionario.phone) : "Sem telefone"}{" "}
                            {funcionario.cpf ? `• ${formatCpf(funcionario.cpf)}` : ""}
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
                          <DropdownMenuItem onClick={() => handleEdit(funcionario)} className="gap-2 text-xs font-semibold cursor-pointer">
                            <Edit2Icon size={13} className="text-primary" />
                            Editar dados
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleStatus(funcionario.id, funcionario.status)
                            }
                            className="gap-2 text-xs font-semibold cursor-pointer"
                          >
                            {isAvailable ? (
                              <>
                                <UserXIcon size={13} className="text-primary" />
                                Desativar colaborador
                              </>
                            ) : (
                              <>
                                <UserCheckIcon size={13} className="text-primary" />
                                Ativar colaborador
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="gap-2 text-xs font-semibold cursor-pointer">
                            <Link href="/financeiro" className="flex items-center gap-2 w-full">
                              <BanknoteIcon size={13} className="text-primary" />
                              Ver no Financeiro
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setFuncionarioToDelete(funcionario);
                              setDeleteDialogOpen(true);
                            }}
                            className="gap-2 text-xs font-semibold text-red-600 focus:text-red-600 cursor-pointer"
                          >
                            <Trash2Icon size={13} />
                            Excluir colaborador
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Cargo / Contrato</span>
                        <span className="font-semibold text-slate-800">{funcionario.roleTitle}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {CONTRACT_TYPES[funcionario.contractType] || funcionario.contractType}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Salário Base</span>
                        <span className="font-bold text-primary">{formatCurrency(Number(funcionario.baseSalary || 0))}</span>
                        {totalPagoMesAtual > 0 && (
                          <span className="text-[10px] text-emerald-600 block">
                            {formatCurrency(totalPagoMesAtual)} pago no mês
                          </span>
                        )}
                      </div>
                    </div>

                    {funcionario.pixKey && (
                      <div className="flex items-center justify-between text-xs rounded-lg border border-slate-100 bg-white px-2.5 py-1.5">
                        <span className="text-slate-500 text-[11px]">Pix ({funcionario.pixType || "Chave"}):</span>
                        <button
                          type="button"
                          onClick={() => handleCopyPix(funcionario.pixKey)}
                          className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-700 hover:text-primary"
                          title="Copiar Pix"
                        >
                          <span>{funcionario.pixKey}</span>
                          <CopyIcon size={12} className="text-slate-400" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">
                        ID: <span className="font-mono text-slate-600">{funcionario.id.slice(0, 8)}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-medium", isAvailable ? "text-primary font-semibold" : "text-slate-400")}>
                          {isAvailable ? "Ativo" : "Inativo"}
                        </span>
                        <Switch
                          checked={isAvailable}
                          disabled={isPending}
                          onCheckedChange={() =>
                            handleToggleStatus(funcionario.id, funcionario.status)
                          }
                          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Items per page selector & Result counter */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>
                  Exibindo{" "}
                  <strong className="font-semibold text-slate-900">
                    {filteredFuncionarios.length}
                  </strong>{" "}
                  de {totalCount} colaborador{totalCount !== 1 ? "es" : ""}
                </span>
                {isFiltering && (
                  <span className="text-[11px] font-medium text-primary">
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

      {/* ── Modal de Cadastro e Edição de Funcionário ────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-slate-200 bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display text-primary">
              {editingFuncionario ? "Editar Funcionário" : "Cadastrar Novo Funcionário"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre as informações cadastrais e dados para liquidação de proventos.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();

              const newErrors: Record<string, string> = {};

              const trimmedName = formName.trim();
              if (!trimmedName) {
                newErrors.name = "Informe o nome completo do colaborador.";
              } else if (trimmedName.length < 2) {
                newErrors.name = "O nome deve ter no mínimo 2 caracteres.";
              }

              const trimmedRole = formRoleTitle.trim();
              if (!trimmedRole) {
                newErrors.roleTitle = "Informe o cargo ou função do colaborador.";
              } else if (trimmedRole.length < 2) {
                newErrors.roleTitle = "O cargo deve ter no mínimo 2 caracteres.";
              }

              if (!formContractType) {
                newErrors.contractType = "Selecione o tipo de contrato.";
              }

              if (!formPaymentFrequency) {
                newErrors.paymentFrequency = "Selecione a frequência de pagamento.";
              }

              if (formBaseSalary.trim() !== "") {
                const salary = Number(formBaseSalary);
                if (isNaN(salary) || salary < 0) {
                  newErrors.baseSalary =
                    "O salário base deve ser um valor numérico válido (maior ou igual a 0).";
                }
              }

              if (formCpf.trim()) {
                const cpfDigits = formCpf.replace(/\D/g, "");
                if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
                  newErrors.cpf = "CPF incompleto. Deve conter 11 dígitos.";
                }
              }

              if (formPhone.trim()) {
                const phoneDigits = formPhone.replace(/\D/g, "");
                if (phoneDigits.length > 0 && phoneDigits.length < 10) {
                  newErrors.phone = "Telefone incompleto. Deve conter DDD e número válido.";
                }
              }

              if (formCep.trim()) {
                const cepDigits = formCep.replace(/\D/g, "");
                if (cepDigits.length > 0 && cepDigits.length !== 8) {
                  newErrors.cep = "CEP incompleto. Deve conter 8 dígitos.";
                }
              }

              if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                const firstError = Object.values(newErrors)[0];
                toast.error(firstError || "Por favor, preencha todos os campos obrigatórios.");
                return;
              }

              setErrors({});

              const formData = new FormData();
              if (editingFuncionario) {
                formData.set("id", editingFuncionario.id);
              }
              formData.set("name", trimmedName);
              formData.set("roleTitle", trimmedRole);
              formData.set("contractType", formContractType);
              formData.set("baseSalary", formBaseSalary || "0");
              formData.set("paymentFrequency", formPaymentFrequency);
              formData.set("pixType", formPixType);
              formData.set("pixKey", formPixKey.trim());
              formData.set("cpf", formCpf);
              formData.set("phone", formPhone);
              formData.set("hireDate", formHireDate);
              formData.set("cep", formCep);
              formData.set("logradouro", formLogradouro);
              formData.set("numero", formNumero);
              formData.set("complemento", formComplemento);
              formData.set("bairro", formBairro);
              formData.set("cidade", formCidade);
              formData.set("estado", formEstado);
              formData.set("notes", formNotes.trim());

              startTransition(async () => {
                try {
                  await criarOuEditarFuncionarioAction(slug, formData);
                  toast.success(
                    editingFuncionario
                      ? "Funcionário atualizado com sucesso!"
                      : "Funcionário cadastrado com sucesso!",
                  );
                  setCreateOpen(false);
                } catch (err: unknown) {
                  toast.error(
                    err instanceof Error ? err.message : "Erro ao salvar funcionário.",
                  );
                }
              });
            }}
            noValidate
            className="space-y-4 pt-2"
          >
            {/* Bloco 1: Identificação */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Nome Completo <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  className={cn(
                    "h-10 rounded-xl border-slate-200 text-xs focus:bg-white transition-colors",
                    errors.name && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                  )}
                />
                {errors.name && (
                  <p className="text-[11px] font-medium text-rose-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roleTitle" className="text-xs font-semibold text-slate-700">
                  Cargo / Função <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="roleTitle"
                  name="roleTitle"
                  value={formRoleTitle}
                  onChange={(e) => {
                    setFormRoleTitle(e.target.value);
                    if (errors.roleTitle) setErrors((prev) => ({ ...prev, roleTitle: "" }));
                  }}
                  placeholder="Ex: Cozinheiro(a), Atendente, Auxiliar..."
                  className={cn(
                    "h-10 rounded-xl border-slate-200 text-xs focus:bg-white transition-colors",
                    errors.roleTitle && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                  )}
                />
                {errors.roleTitle && (
                  <p className="text-[11px] font-medium text-rose-500">{errors.roleTitle}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contractType" className="text-xs font-semibold text-slate-700">
                  Tipo de Contrato <span className="text-rose-500">*</span>
                </Label>
                <Select
                  name="contractType"
                  value={formContractType}
                  onValueChange={(val) => {
                    setFormContractType(val);
                    if (errors.contractType) setErrors((prev) => ({ ...prev, contractType: "" }));
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "h-10 rounded-xl border-slate-200 text-xs transition-colors",
                      errors.contractType && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                    )}
                  >
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT (Efetivo)</SelectItem>
                    <SelectItem value="PJ">PJ (Prestador de Serviço)</SelectItem>
                    <SelectItem value="DIARISTA">Diarista / Freelancer</SelectItem>
                    <SelectItem value="TEMPORARIO">Temporário</SelectItem>
                    <SelectItem value="ESTAGIO">Estagiário</SelectItem>
                  </SelectContent>
                </Select>
                {errors.contractType && (
                  <p className="text-[11px] font-medium text-rose-500">{errors.contractType}</p>
                )}
              </div>
            </div>

            {/* Bloco 2: Remuneração e Frequência */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="baseSalary" className="text-xs font-semibold text-slate-700">
                  Salário Base / Diária (R$)
                </Label>
                <Input
                  id="baseSalary"
                  name="baseSalary"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formBaseSalary}
                  onChange={(e) => {
                    setFormBaseSalary(e.target.value);
                    if (errors.baseSalary) setErrors((prev) => ({ ...prev, baseSalary: "" }));
                  }}
                  placeholder="0,00"
                  className={cn(
                    "h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold focus:bg-white transition-colors",
                    errors.baseSalary && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                  )}
                />
                {errors.baseSalary && (
                  <p className="text-[11px] font-medium text-rose-500">{errors.baseSalary}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentFrequency" className="text-xs font-semibold text-slate-700">
                  Frequência de Pagamento <span className="text-rose-500">*</span>
                </Label>
                <Select
                  name="paymentFrequency"
                  value={formPaymentFrequency}
                  onValueChange={(val) => {
                    setFormPaymentFrequency(val);
                    if (errors.paymentFrequency) setErrors((prev) => ({ ...prev, paymentFrequency: "" }));
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "h-10 rounded-xl border-slate-200 bg-white text-xs transition-colors",
                      errors.paymentFrequency && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                    )}
                  >
                    <SelectValue placeholder="Frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Mensal (Salário padrão)</SelectItem>
                    <SelectItem value="BIWEEKLY">Quinzenal (Adiantamento + Saldo)</SelectItem>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="DAILY">Diária / Por Turno</SelectItem>
                  </SelectContent>
                </Select>
                {errors.paymentFrequency && (
                  <p className="text-[11px] font-medium text-rose-500">{errors.paymentFrequency}</p>
                )}
              </div>
            </div>

            {/* Bloco 3: Dados de Pagamento Pix */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="pixType" className="text-xs font-semibold text-slate-700">
                  Tipo de Chave Pix
                </Label>
                <Select
                  name="pixType"
                  value={formPixType}
                  onValueChange={(val) => setFormPixType(val)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                    <SelectValue placeholder="Tipo Pix" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                    <SelectItem value="PHONE">Telefone</SelectItem>
                    <SelectItem value="EMAIL">E-mail</SelectItem>
                    <SelectItem value="RANDOM">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pixKey" className="text-xs font-semibold text-slate-700">
                  Chave Pix para Repasses
                </Label>
                <Input
                  id="pixKey"
                  name="pixKey"
                  value={formPixKey}
                  onChange={(e) => setFormPixKey(e.target.value)}
                  placeholder="Insira a chave Pix do colaborador..."
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs font-mono focus:bg-white"
                />
              </div>
            </div>

            {/* Bloco 4: Documentos e Contato */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="cpf" className="text-xs font-semibold text-slate-700">
                  CPF
                </Label>
                <Input
                  id="cpf"
                  name="cpf"
                  value={formCpf}
                  onChange={(e) => {
                    setFormCpf(formatCpf(e.target.value));
                    if (errors.cpf) setErrors((prev) => ({ ...prev, cpf: "" }));
                  }}
                  placeholder="000.000.000-00"
                  className={cn(
                    "h-10 rounded-xl border-slate-200 text-xs focus:bg-white transition-colors",
                    errors.cpf && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                  )}
                />
                {errors.cpf && (
                  <p className="text-[11px] font-medium text-rose-500">{errors.cpf}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                  WhatsApp / Telefone
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formPhone}
                  onChange={(e) => {
                    setFormPhone(formatPhone(e.target.value));
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  placeholder="(00) 00000-0000"
                  className={cn(
                    "h-10 rounded-xl border-slate-200 text-xs focus:bg-white transition-colors",
                    errors.phone && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                  )}
                />
                {errors.phone && (
                  <p className="text-[11px] font-medium text-rose-500">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hireDate" className="text-xs font-semibold text-slate-700">
                  Data de Admissão
                </Label>
                <DatePicker
                  id="hireDate"
                  name="hireDate"
                  key={editingFuncionario?.id ? `hireDate-${editingFuncionario.id}` : "hireDate-new"}
                  value={formHireDate}
                  onChange={(_, str) => {
                    setFormHireDate(str);
                    if (errors.hireDate) setErrors((prev) => ({ ...prev, hireDate: "" }));
                  }}
                  placeholder="Data de admissão"
                />
              </div>
            </div>

            {/* Bloco 5: Endereço */}
            <div className="pt-1">
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
                  <Label htmlFor="func-cep" className="text-xs font-semibold text-slate-700">
                    CEP
                  </Label>
                  <div className="relative">
                    <Input
                      id="func-cep"
                      name="cep"
                      placeholder="00000-000"
                      value={formCep}
                      onChange={(e) => {
                        const formatted = formatCep(e.target.value);
                        setFormCep(formatted);
                        if (errors.cep) setErrors((prev) => ({ ...prev, cep: "" }));
                        if (formatted.replace(/\D/g, "").length === 8) {
                          handleFuncionarioCepLookup(formatted);
                        }
                      }}
                      onBlur={() => handleFuncionarioCepLookup(formCep)}
                      maxLength={9}
                      className={cn(
                        "h-10 rounded-xl border-slate-200 bg-white pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary transition-colors",
                        errors.cep && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                      )}
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {isSearchingCep ? (
                        <LoaderCircleIcon size={14} className="animate-spin text-primary" />
                      ) : (
                        <SearchIcon size={14} />
                      )}
                    </div>
                  </div>
                  {errors.cep && (
                    <p className="text-[11px] font-medium text-rose-500">{errors.cep}</p>
                  )}
                </div>

                {/* Logradouro / Rua */}
                <div className="space-y-1.5 sm:col-span-8">
                  <Label htmlFor="func-logradouro" className="text-xs font-semibold text-slate-700">
                    Logradouro / Rua
                  </Label>
                  <Input
                    id="func-logradouro"
                    name="logradouro"
                    placeholder="Ex: Av. Paulista, Rua das Flores"
                    value={formLogradouro}
                    onChange={(e) => setFormLogradouro(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary"
                  />
                </div>

                {/* Número */}
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="func-numero" className="text-xs font-semibold text-slate-700">
                    Número
                  </Label>
                  <Input
                    id="func-numero"
                    name="numero"
                    placeholder="Ex: 123"
                    value={formNumero}
                    onChange={(e) => setFormNumero(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary"
                  />
                </div>

                {/* UF */}
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="func-estado" className="text-xs font-semibold text-slate-700">
                    UF
                  </Label>
                  <Select
                    value={formEstado || undefined}
                    onValueChange={(val) => setFormEstado(val)}
                  >
                    <SelectTrigger
                      id="func-estado"
                      className="h-10 rounded-xl border-slate-200 bg-white px-3 font-semibold text-xs uppercase text-slate-900 focus:border-primary"
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
                  <input type="hidden" name="estado" value={formEstado} />
                </div>

                {/* Complemento */}
                <div className="space-y-1.5 sm:col-span-6">
                  <Label htmlFor="func-complemento" className="text-xs font-semibold text-slate-700">
                    Complemento
                  </Label>
                  <Input
                    id="func-complemento"
                    name="complemento"
                    placeholder="Ex: Apto, Bloco..."
                    value={formComplemento}
                    onChange={(e) => setFormComplemento(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary"
                  />
                </div>

                {/* Bairro */}
                <div className="space-y-1.5 sm:col-span-6">
                  <Label htmlFor="func-bairro" className="text-xs font-semibold text-slate-700">
                    Bairro
                  </Label>
                  <Input
                    id="func-bairro"
                    name="bairro"
                    placeholder="Ex: Centro"
                    value={formBairro}
                    onChange={(e) => setFormBairro(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary"
                  />
                </div>

                {/* Cidade */}
                <div className="space-y-1.5 sm:col-span-6">
                  <Label htmlFor="func-cidade" className="text-xs font-semibold text-slate-700">
                    Cidade
                  </Label>
                  <Input
                    id="func-cidade"
                    name="cidade"
                    placeholder="Ex: São Paulo"
                    value={formCidade}
                    onChange={(e) => setFormCidade(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 6: Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">
                Observações Adicionais
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ex: Escala 6x1, folgas às terças, experiência prévia em cozinha industrial..."
                className="rounded-xl border-slate-200 text-xs"
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isPending}
                className="h-10 rounded-full text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-10 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                {isPending && <LoaderCircleIcon size={14} className="animate-spin" />}
                <span>{editingFuncionario ? "Salvar Alterações" : "Cadastrar Funcionário"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de Exclusão ──────────────────────────────── */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Funcionário"
        description={
          funcionarioToDelete ? (
            <>
              Tem certeza que deseja remover <strong>{funcionarioToDelete.name}</strong> da equipe? Esta ação não pode ser desfeita.
            </>
          ) : undefined
        }
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
