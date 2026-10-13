"use client";

import {
  BanknoteIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CopyIcon,
  EditIcon,
  ExternalLinkIcon,
  FilterXIcon,
  LoaderCircleIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserCheckIcon,
  UserIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const COMMON_ROLES = [
  "Cozinheiro(a)",
  "Auxiliar de Cozinha",
  "Atendente / Balcão",
  "Barman / Bartender",
  "Operador(a) de Caixa",
  "Gerente Operacional",
  "Pizzaiolo(a)",
  "Sushiman",
  "Limpeza / Serviços Gerais",
  "Copeiro(a)",
  "Sommelier",
  "Entregador Próprio",
  "Outro",
];

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

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Employee | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [funcionarioToDelete, setFuncionarioToDelete] = useState<Employee | null>(null);

  const [isPending, startTransition] = useTransition();

  // Controle de abertura externa vindo do botão do topo
  const isCreateOpen = isNewFuncionarioOpen || modalOpen;
  const setCreateOpen = (val: boolean) => {
    setModalOpen(val);
    onNewFuncionarioOpenChange?.(val);
    if (!val) setEditingFuncionario(null);
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

  const handleEdit = (f: Employee) => {
    setEditingFuncionario(f);
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
      } catch (err) {
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
      } catch (err) {
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
        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total de Colaboradores
              </span>
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <UsersIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeCount} em atividade
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ativos na Equipe
              </span>
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <UserCheckIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {activeCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalCount - activeCount} inativos
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Previsão Folha Base
              </span>
              <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                <BanknoteIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-purple-700">
              {formatCurrency(totalFolhaBase)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Soma salários ativos
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cargos e Funções
              </span>
              <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                <BriefcaseIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
              {uniqueRoles.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Especialidades ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Barra de Ações e Atalho para Financeiro ─────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <BanknoteIcon size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Pagamento e Folha Integrados ao Financeiro
            </h4>
            <p className="text-xs text-slate-600">
              Os lançamentos de salários, adiantamentos e vales são geridos e conciliados diretamente no módulo financeiro.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="h-9 gap-1.5 rounded-full border-primary bg-white text-xs font-semibold text-primary hover:bg-primary/10"
          >
            <Link href="/financeiro">
              <span>Acessar Folha no Financeiro</span>
              <ExternalLinkIcon size={13} />
            </Link>
          </Button>
          <Button
            onClick={() => {
              setEditingFuncionario(null);
              setCreateOpen(true);
            }}
            className="h-9 gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <PlusIcon size={14} />
            <span>Novo Colaborador</span>
          </Button>
        </div>
      </div>

      {/* ── Filtros e Busca da Tabela ───────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, cargo, CPF ou telefone..."
              className="h-9 rounded-xl border-slate-200 bg-slate-50/70 pl-9 text-xs focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val: "ALL" | "ACTIVE" | "INACTIVE") => setStatusFilter(val)}
            >
              <SelectTrigger className="h-9 w-36 rounded-xl border-slate-200 bg-slate-50/70 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value="ACTIVE">Apenas Ativos</SelectItem>
                <SelectItem value="INACTIVE">Apenas Inativos</SelectItem>
              </SelectContent>
            </Select>

            {uniqueRoles.length > 0 && (
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 w-44 rounded-xl border-slate-200 bg-slate-50/70 text-xs">
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Cargos</SelectItem>
                  {uniqueRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(searchQuery || statusFilter !== "ALL" || roleFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setRoleFilter("ALL");
                }}
                className="h-9 gap-1 rounded-xl text-xs text-slate-500 hover:text-slate-800"
              >
                <FilterXIcon size={14} />
                <span>Limpar</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabela de Colaboradores ─────────────────────────── */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Colaborador
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cargo / Contrato
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Salário Base
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Chave Pix
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Contato
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFuncionarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-slate-500">
                    <UserXIcon size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">
                      Nenhum colaborador encontrado
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Cadastre novos funcionários ou ajuste seus filtros de busca.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFuncionarios.map(({ funcionario, totalPagoMesAtual }) => (
                  <TableRow
                    key={funcionario.id}
                    className="border-slate-100 transition-colors hover:bg-slate-50/70"
                  >
                    {/* Nome + Avatar */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {funcionario.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {funcionario.name}
                          </p>
                          {funcionario.cpf && (
                            <p className="text-[11px] text-slate-400">
                              CPF: {funcionario.cpf}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Cargo / Contrato */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                        <BriefcaseIcon size={11} />
                        {funcionario.roleTitle}
                      </span>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {CONTRACT_TYPES[funcionario.contractType] || funcionario.contractType}
                      </p>
                    </TableCell>

                    {/* Salário Base */}
                    <TableCell>
                      <p className="text-xs font-bold text-slate-900">
                        {formatCurrency(Number(funcionario.baseSalary || 0))}
                      </p>
                      {totalPagoMesAtual > 0 ? (
                        <p className="text-[10px] text-emerald-600 font-medium">
                          {formatCurrency(totalPagoMesAtual)} pago este mês
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400">
                          Aguardando liquidação
                        </p>
                      )}
                    </TableCell>

                    {/* Chave Pix */}
                    <TableCell>
                      {funcionario.pixKey ? (
                        <button
                          onClick={() => handleCopyPix(funcionario.pixKey)}
                          title="Clique para copiar a chave Pix"
                          className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
                        >
                          <span className="max-w-[120px] truncate font-mono">
                            {funcionario.pixKey}
                          </span>
                          <CopyIcon size={11} className="text-slate-400 group-hover:text-primary" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Não informada
                        </span>
                      )}
                    </TableCell>

                    {/* Contato */}
                    <TableCell>
                      {funcionario.phone ? (
                        <a
                          href={`https://wa.me/55${funcionario.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-slate-700 hover:text-emerald-600 transition-colors"
                        >
                          <PhoneIcon size={12} className="text-emerald-600" />
                          <span>{funcionario.phone}</span>
                        </a>
                      ) : funcionario.email ? (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <MailIcon size={12} />
                          <span className="truncate max-w-[110px]">{funcionario.email}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </TableCell>

                    {/* Status Switch */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={funcionario.status === "ACTIVE"}
                          onCheckedChange={() =>
                            handleToggleStatus(funcionario.id, funcionario.status)
                          }
                          disabled={isPending}
                        />
                        <span
                          className={cn(
                            "text-[11px] font-semibold",
                            funcionario.status === "ACTIVE"
                              ? "text-emerald-600"
                              : "text-slate-400",
                          )}
                        >
                          {funcionario.status === "ACTIVE" ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(funcionario)}
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          title="Editar dados do colaborador"
                        >
                          <EditIcon size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="h-8 w-8 rounded-lg text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                          title="Ver pagamentos no Financeiro"
                        >
                          <Link href="/financeiro">
                            <BanknoteIcon size={14} />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFuncionarioToDelete(funcionario);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Excluir colaborador"
                        >
                          <Trash2Icon size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Modal de Cadastro e Edição de Funcionário ────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-primary bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display text-primary">
              {editingFuncionario ? "Editar Colaborador" : "Novo Colaborador"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre as informações cadastrais e dados para liquidação de proventos.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (editingFuncionario) {
                formData.set("id", editingFuncionario.id);
              }
              startTransition(async () => {
                try {
                  await criarOuEditarFuncionarioAction(slug, formData);
                  toast.success(
                    editingFuncionario
                      ? "Colaborador atualizado com sucesso!"
                      : "Colaborador cadastrado com sucesso!",
                  );
                  setCreateOpen(false);
                } catch (err: unknown) {
                  toast.error(
                    err instanceof Error ? err.message : "Erro ao salvar colaborador.",
                  );
                }
              });
            }}
            className="space-y-4 pt-2"
          >
            {/* Bloco 1: Identificação */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Nome Completo *
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editingFuncionario?.name || ""}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  className="h-10 rounded-xl border-slate-200 text-xs focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roleTitle" className="text-xs font-semibold text-slate-700">
                  Cargo / Função *
                </Label>
                <Input
                  id="roleTitle"
                  name="roleTitle"
                  required
                  list="roles-datalist"
                  defaultValue={editingFuncionario?.roleTitle || ""}
                  placeholder="Ex: Cozinheiro(a) ou selecione..."
                  className="h-10 rounded-xl border-slate-200 text-xs focus:bg-white"
                />
                <datalist id="roles-datalist">
                  {COMMON_ROLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contractType" className="text-xs font-semibold text-slate-700">
                  Tipo de Contrato
                </Label>
                <Select
                  name="contractType"
                  defaultValue={editingFuncionario?.contractType || "CLT"}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
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
                  defaultValue={Number(editingFuncionario?.baseSalary || 0)}
                  placeholder="0,00"
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentFrequency" className="text-xs font-semibold text-slate-700">
                  Frequência de Pagamento
                </Label>
                <Select
                  name="paymentFrequency"
                  defaultValue={editingFuncionario?.paymentFrequency || "MONTHLY"}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                    <SelectValue placeholder="Frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Mensal (Salário padrão)</SelectItem>
                    <SelectItem value="BIWEEKLY">Quinzenal (Adiantamento + Saldo)</SelectItem>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="DAILY">Diária / Por Turno</SelectItem>
                  </SelectContent>
                </Select>
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
                  defaultValue={editingFuncionario?.pixType || "CPF"}
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
                  defaultValue={editingFuncionario?.pixKey || ""}
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
                  defaultValue={editingFuncionario?.cpf || ""}
                  placeholder="000.000.000-00"
                  className="h-10 rounded-xl border-slate-200 text-xs focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                  WhatsApp / Telefone
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingFuncionario?.phone || ""}
                  placeholder="(00) 00000-0000"
                  className="h-10 rounded-xl border-slate-200 text-xs focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hireDate" className="text-xs font-semibold text-slate-700">
                  Data de Admissão
                </Label>
                <Input
                  id="hireDate"
                  name="hireDate"
                  type="date"
                  defaultValue={
                    editingFuncionario?.hireDate
                      ? String(editingFuncionario.hireDate).slice(0, 10)
                      : ""
                  }
                  className="h-10 rounded-xl border-slate-200 text-xs focus:bg-white"
                />
              </div>
            </div>

            {/* Bloco 5: Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">
                Observações Adicionais
              </Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={editingFuncionario?.notes || ""}
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
                <span>{editingFuncionario ? "Salvar Alterações" : "Cadastrar Colaborador"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de Exclusão ──────────────────────────────── */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Colaborador"
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
