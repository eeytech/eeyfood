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
import { BRAZIL_UFS } from "@/lib/address-utils";
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

const formatCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
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
  const [garcomName, setGarcomName] = useState("");
  const [garcomPhone, setGarcomPhone] = useState("");
  const [garcomCpf, setGarcomCpf] = useState("");
  const [garcomCommissionPercent, setGarcomCommissionPercent] = useState("0");
  const [garcomStatus, setGarcomStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [garcomCep, setGarcomCep] = useState("");
  const [garcomLogradouro, setGarcomLogradouro] = useState("");
  const [garcomNumero, setGarcomNumero] = useState("");
  const [garcomComplemento, setGarcomComplemento] = useState("");
  const [garcomBairro, setGarcomBairro] = useState("");
  const [garcomCidade, setGarcomCidade] = useState("");
  const [garcomEstado, setGarcomEstado] = useState("");
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [garcomErrors, setGarcomErrors] = useState<Record<string, string>>({});
  const [deletingGarcom, setDeletingGarcom] = useState<{ id: string; name: string } | null>(null);

  // Dialog de Regra de Serviço
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState(regraComissao?.name || "Taxa de Serviço do Salão (10%)");
  const [serviceFeePercent, setServiceFeePercent] = useState(String(regraComissao?.serviceFeePercent ?? 10));
  const [waiterSharePercent, setWaiterSharePercent] = useState(String(regraComissao?.waiterSharePercent ?? 100));
  const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});


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

  const handleGarcomCepLookup = async (cepVal: string) => {
    const digits = cepVal.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setGarcomLogradouro(data.logradouro ?? "");
      setGarcomBairro(data.bairro ?? "");
      setGarcomCidade(data.localidade ?? "");
      setGarcomEstado(data.uf ?? "");
    } catch {
      // busca de CEP silenciosa
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleOpenNewGarcom = () => {
    setEditingGarcom(null);
    setGarcomName("");
    setGarcomPhone("");
    setGarcomCpf("");
    setGarcomCommissionPercent("0");
    setGarcomStatus("ACTIVE");
    setGarcomCep("");
    setGarcomLogradouro("");
    setGarcomNumero("");
    setGarcomComplemento("");
    setGarcomBairro("");
    setGarcomCidade("");
    setGarcomEstado("");
    setGarcomErrors({});
    setGarcomDialogOpen(true);
  };

  // Sincronização com botão do cabeçalho da página
  useEffect(() => {
    if (isNewGarcomOpen) {
      handleOpenNewGarcom();
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

  // Abrir Modal para Editar Garçom
  const handleOpenEditGarcom = (g: GarcomMetricas) => {
    setEditingGarcom(g);
    setGarcomName(g.waiter.name || "");
    setGarcomPhone(formatPhone(g.waiter.phone || ""));
    setGarcomCpf(formatCpf(g.waiter.cpf || ""));
    setGarcomCommissionPercent(String(g.waiter.commissionPercent ?? 0));
    setGarcomStatus(g.waiter.status as "ACTIVE" | "INACTIVE");
    setGarcomCep(g.waiter.cep ? formatCep(g.waiter.cep) : "");
    setGarcomLogradouro(g.waiter.logradouro || "");
    setGarcomNumero(g.waiter.numero || "");
    setGarcomComplemento(g.waiter.complemento || "");
    setGarcomBairro(g.waiter.bairro || "");
    setGarcomCidade(g.waiter.cidade || "");
    setGarcomEstado(g.waiter.estado || "");
    setGarcomErrors({});
    setGarcomDialogOpen(true);
  };

  // Submeter Garçom
  const handleGarcomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    const trimmedName = garcomName.trim();
    if (!trimmedName) {
      newErrors.name = "Informe o nome ou apelido do garçom no salão.";
    } else if (trimmedName.length < 2) {
      newErrors.name = "O nome deve ter no mínimo 2 caracteres.";
    }

    if (garcomPhone.trim()) {
      const phoneDigits = garcomPhone.replace(/\D/g, "");
      if (phoneDigits.length > 0 && phoneDigits.length < 10) {
        newErrors.phone = "Telefone incompleto. Deve conter DDD e número válido.";
      }
    }

    if (garcomCpf.trim()) {
      const cpfDigits = garcomCpf.replace(/\D/g, "");
      if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
        newErrors.cpf = "CPF incompleto. Deve conter 11 dígitos.";
      }
    }

    const commVal = Number(garcomCommissionPercent);
    if (
      garcomCommissionPercent.trim() !== "" &&
      (isNaN(commVal) || commVal < 0 || commVal > 100)
    ) {
      newErrors.commissionPercent = "A comissão deve ser um valor entre 0% e 100%.";
    }

    if (garcomCep.trim()) {
      const cepDigits = garcomCep.replace(/\D/g, "");
      if (cepDigits.length > 0 && cepDigits.length !== 8) {
        newErrors.cep = "CEP incompleto. Deve conter 8 dígitos.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setGarcomErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError || "Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setGarcomErrors({});

    const formData = new FormData();
    if (editingGarcom) {
      formData.set("id", editingGarcom.waiter.id);
    }
    formData.set("name", trimmedName);
    formData.set("phone", garcomPhone);
    formData.set("cpf", garcomCpf);
    formData.set("commissionPercent", String(isNaN(commVal) ? 0 : commVal));
    formData.set("status", garcomStatus);
    formData.set("cep", garcomCep);
    formData.set("logradouro", garcomLogradouro);
    formData.set("numero", garcomNumero);
    formData.set("complemento", garcomComplemento);
    formData.set("bairro", garcomBairro);
    formData.set("cidade", garcomCidade);
    formData.set("estado", garcomEstado);

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

  const handleOpenRuleDialog = () => {
    setRuleName(regraComissao?.name || "Taxa de Serviço do Salão (10%)");
    setServiceFeePercent(String(regraComissao?.serviceFeePercent ?? 10));
    setWaiterSharePercent(String(regraComissao?.waiterSharePercent ?? 100));
    setRuleErrors({});
    setRuleDialogOpen(true);
  };

  // Submeter Regra de Comissão
  const handleRuleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    const trimmedName = ruleName.trim();
    if (!trimmedName) {
      newErrors.name = "Informe o nome da regra de comissão.";
    }

    const feeVal = Number(serviceFeePercent);
    if (serviceFeePercent.trim() === "" || isNaN(feeVal) || feeVal < 0 || feeVal > 100) {
      newErrors.serviceFeePercent = "A taxa de serviço sugerida deve estar entre 0% e 100%.";
    }

    const shareVal = Number(waiterSharePercent);
    if (waiterSharePercent.trim() === "" || isNaN(shareVal) || shareVal < 0 || shareVal > 100) {
      newErrors.waiterSharePercent = "O repasse para a equipe deve estar entre 0% e 100%.";
    }

    if (Object.keys(newErrors).length > 0) {
      setRuleErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError || "Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setRuleErrors({});

    const formData = new FormData();
    formData.set("name", trimmedName);
    formData.set("serviceFeePercent", String(feeVal));
    formData.set("waiterSharePercent", String(shareVal));
    formData.set("isActive", "true");

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
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <UtensilsIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
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
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <DollarSignIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
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
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <BadgePercentIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
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
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <HandCoinsIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
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
            <BadgePercentIcon size={13} className="mr-1.5 text-primary" />
            {regraComissao
              ? `${regraComissao.name} (${regraComissao.serviceFeePercent}% com repasse de ${regraComissao.waiterSharePercent}%)`
              : "Taxa de Serviço: 10% (Padrão)"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenRuleDialog}
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
                            <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-primary font-bold">
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

                        <TableCell className="text-right text-xs font-semibold text-primary">
                          {formatCurrency(g.totalServiceFee)}
                        </TableCell>

                        <TableCell className="text-right text-xs font-medium text-slate-500">
                          {formatCurrency(g.totalTipsPaid)}
                        </TableCell>

                        <TableCell className="text-right text-xs font-bold text-primary">
                          {formatCurrency(g.pendingBalance)}
                        </TableCell>

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
                                handleToggleStatus(
                                  g.waiter.id,
                                  g.waiter.status as "ACTIVE" | "INACTIVE",
                                )
                              }
                              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
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
                                className="gap-2 text-xs font-semibold"
                              >
                                <Edit2Icon size={13} className="text-primary" />
                                Editar dados
                              </DropdownMenuItem>


                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleStatus(
                                    g.waiter.id,
                                    g.waiter.status as "ACTIVE" | "INACTIVE",
                                  )
                                }
                                className="gap-2 text-xs font-semibold"
                              >
                                {isAvailable ? (
                                  <>
                                    <UserXIcon size={13} className="text-primary" />
                                    Desativar garçom
                                  </>
                                ) : (
                                  <>
                                    <UserCheckIcon size={13} className="text-primary" />
                                    Ativar garçom
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => setDeletingGarcom({ id: g.waiter.id, name: g.waiter.name })}
                                className="gap-2 text-xs font-semibold text-red-600 focus:text-red-600"
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
                          <DropdownMenuItem onClick={() => handleOpenEditGarcom(g)} className="gap-2 text-xs font-semibold">
                            <Edit2Icon size={13} className="text-primary" />
                            Editar dados
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeletingGarcom({ id: g.waiter.id, name: g.waiter.name })} className="gap-2 text-xs font-semibold text-red-600">
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
                        <span className="font-semibold text-primary">{formatCurrency(g.totalServiceFee)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Saldo</span>
                        <span className="font-bold text-primary">{formatCurrency(g.pendingBalance)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">
                        Comissão: <strong className="text-slate-700">{g.waiter.commissionPercent > 0 ? `${g.waiter.commissionPercent}%` : "Padrão"}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isAvailable}
                          disabled={isPending}
                          onCheckedChange={() =>
                            handleToggleStatus(g.waiter.id, g.waiter.status as "ACTIVE" | "INACTIVE")
                          }
                          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
                        />
                        <span className={cn("text-xs font-medium", isAvailable ? "text-primary font-semibold" : "text-slate-400")}>
                          {isAvailable ? "Ativo" : "Inativo"}
                        </span>
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

      {/* ── Histórico de Fechamentos de Gorjetas ───────────────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ReceiptIcon size={18} className="text-primary" />
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
                        <TableCell className="text-right text-xs font-bold text-primary">
                          {formatCurrency(f.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 truncate max-w-[250px]">
                          {f.notes || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="border border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary hover:bg-primary/15">
                            <CheckCircle2Icon size={11} className="mr-1 text-primary" />
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
                    <span className="text-[11px] font-medium text-primary">
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
      <Dialog
        open={garcomDialogOpen}
        onOpenChange={(open) => {
          setGarcomDialogOpen(open);
          if (!open) {
            setGarcomErrors({});
          }
        }}
      >
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-3xl border-slate-200 bg-white p-6 shadow-2xl">
          <form onSubmit={handleGarcomSubmit} noValidate>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {editingGarcom ? "Editar Garçom" : "Cadastrar Novo Garçom"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre o profissional que atenderá mesas no salão e registrará pedidos via Comanda Mobile.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* ── Dados Pessoais ── */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                    Nome Completo / Apelido no Salão <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={garcomName}
                    onChange={(e) => {
                      setGarcomName(e.target.value);
                      if (garcomErrors.name) setGarcomErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder="Ex: Carlos Oliveira (Carlinhos)"
                    className={cn(
                      "h-10 rounded-xl border-slate-200 text-xs transition-colors",
                      garcomErrors.name && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                    )}
                  />
                  {garcomErrors.name && (
                    <p className="text-[11px] font-medium text-rose-500">{garcomErrors.name}</p>
                  )}
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
                      onChange={(e) => {
                        setGarcomPhone(formatPhone(e.target.value));
                        if (garcomErrors.phone) setGarcomErrors((prev) => ({ ...prev, phone: "" }));
                      }}
                      placeholder="(11) 98765-4321"
                      className={cn(
                        "h-10 rounded-xl border-slate-200 text-xs transition-colors",
                        garcomErrors.phone && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                      )}
                    />
                    {garcomErrors.phone && (
                      <p className="text-[11px] font-medium text-rose-500">{garcomErrors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cpf" className="text-xs font-semibold text-slate-700">
                      CPF
                    </Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      value={garcomCpf}
                      onChange={(e) => {
                        setGarcomCpf(formatCpf(e.target.value));
                        if (garcomErrors.cpf) setGarcomErrors((prev) => ({ ...prev, cpf: "" }));
                      }}
                      placeholder="000.000.000-00"
                      className={cn(
                        "h-10 rounded-xl border-slate-200 text-xs transition-colors",
                        garcomErrors.cpf && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                      )}
                    />
                    {garcomErrors.cpf && (
                      <p className="text-[11px] font-medium text-rose-500">{garcomErrors.cpf}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                      value={garcomCommissionPercent}
                      onChange={(e) => {
                        setGarcomCommissionPercent(e.target.value);
                        if (garcomErrors.commissionPercent) setGarcomErrors((prev) => ({ ...prev, commissionPercent: "" }));
                      }}
                      placeholder="0 (deixe 0 para taxa padrão)"
                      className={cn(
                        "h-10 rounded-xl border-slate-200 text-xs transition-colors",
                        garcomErrors.commissionPercent && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                      )}
                    />
                    {garcomErrors.commissionPercent ? (
                      <p className="text-[11px] font-medium text-rose-500">{garcomErrors.commissionPercent}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400">
                        Deixe 0% para usar a taxa padrão da casa.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs font-semibold text-slate-700">
                      Status
                    </Label>
                    <Select
                      value={garcomStatus}
                      onValueChange={(val) => setGarcomStatus(val as "ACTIVE" | "INACTIVE")}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Ativo (visível no app garçom)</SelectItem>
                        <SelectItem value="INACTIVE">Inativo (bloqueado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ── Endereço ── */}
              <div className="pt-2">
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
                    <Label htmlFor="garcom-cep" className="text-xs font-semibold text-slate-700">
                      CEP
                    </Label>
                    <div className="relative">
                      <Input
                        id="garcom-cep"
                        name="cep"
                        placeholder="00000-000"
                        value={garcomCep}
                        onChange={(e) => {
                          const formatted = formatCep(e.target.value);
                          setGarcomCep(formatted);
                          if (garcomErrors.cep) setGarcomErrors((prev) => ({ ...prev, cep: "" }));
                          if (formatted.replace(/\D/g, "").length === 8) {
                            handleGarcomCepLookup(formatted);
                          }
                        }}
                        onBlur={() => handleGarcomCepLookup(garcomCep)}
                        maxLength={9}
                        className={cn(
                          "h-10 rounded-xl border-slate-200 bg-white pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary transition-colors",
                          garcomErrors.cep && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                        )}
                      />
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {isSearchingCep ? (
                          <Loader2Icon size={14} className="animate-spin text-primary" />
                        ) : (
                          <SearchIcon size={14} />
                        )}
                      </div>
                    </div>
                    {garcomErrors.cep && (
                      <p className="text-[11px] font-medium text-rose-500">{garcomErrors.cep}</p>
                    )}
                  </div>

                  {/* Logradouro / Rua */}
                  <div className="space-y-1.5 sm:col-span-8">
                    <Label htmlFor="garcom-logradouro" className="text-xs font-semibold text-slate-700">
                      Logradouro / Rua
                    </Label>
                    <Input
                      id="garcom-logradouro"
                      name="logradouro"
                      placeholder="Ex: Av. Paulista, Rua das Flores"
                      value={garcomLogradouro}
                      onChange={(e) => setGarcomLogradouro(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary"
                    />
                  </div>

                  {/* Número */}
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="garcom-numero" className="text-xs font-semibold text-slate-700">
                      Número
                    </Label>
                    <Input
                      id="garcom-numero"
                      name="numero"
                      placeholder="Ex: 123"
                      value={garcomNumero}
                      onChange={(e) => setGarcomNumero(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary"
                    />
                  </div>

                  {/* UF */}
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="garcom-estado" className="text-xs font-semibold text-slate-700">
                      UF
                    </Label>
                    <Select
                      value={garcomEstado || undefined}
                      onValueChange={(val) => setGarcomEstado(val)}
                    >
                      <SelectTrigger
                        id="garcom-estado"
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
                    <input type="hidden" name="estado" value={garcomEstado} />
                  </div>

                  {/* Complemento */}
                  <div className="space-y-1.5 sm:col-span-6">
                    <Label htmlFor="garcom-complemento" className="text-xs font-semibold text-slate-700">
                      Complemento
                    </Label>
                    <Input
                      id="garcom-complemento"
                      name="complemento"
                      placeholder="Ex: Apto, Bloco..."
                      value={garcomComplemento}
                      onChange={(e) => setGarcomComplemento(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary"
                    />
                  </div>

                  {/* Bairro */}
                  <div className="space-y-1.5 sm:col-span-6">
                    <Label htmlFor="garcom-bairro" className="text-xs font-semibold text-slate-700">
                      Bairro
                    </Label>
                    <Input
                      id="garcom-bairro"
                      name="bairro"
                      placeholder="Ex: Centro"
                      value={garcomBairro}
                      onChange={(e) => setGarcomBairro(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="space-y-1.5 sm:col-span-6">
                    <Label htmlFor="garcom-cidade" className="text-xs font-semibold text-slate-700">
                      Cidade
                    </Label>
                    <Input
                      id="garcom-cidade"
                      name="cidade"
                      placeholder="Ex: São Paulo"
                      value={garcomCidade}
                      onChange={(e) => setGarcomCidade(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGarcomDialogOpen(false)}
                disabled={isPending}
                className="h-10 rounded-full text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="h-10 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90">
                {isPending && <Loader2Icon size={14} className="animate-spin" />}
                {editingGarcom ? "Salvar Alterações" : "Cadastrar Garçom"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Regras de Taxa de Serviço ───────────────────────────── */}
      <Dialog
        open={ruleDialogOpen}
        onOpenChange={(open) => {
          setRuleDialogOpen(open);
          if (!open) {
            setRuleErrors({});
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleRuleSubmit} noValidate>
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
                  value={ruleName}
                  onChange={(e) => {
                    setRuleName(e.target.value);
                    if (ruleErrors.name) setRuleErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className={cn(
                    "h-9 text-xs transition-colors",
                    ruleErrors.name && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                  )}
                />
                {ruleErrors.name && (
                  <p className="text-[11px] font-medium text-rose-500">{ruleErrors.name}</p>
                )}
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
                    max="100"
                    value={serviceFeePercent}
                    onChange={(e) => {
                      setServiceFeePercent(e.target.value);
                      if (ruleErrors.serviceFeePercent) setRuleErrors((prev) => ({ ...prev, serviceFeePercent: "" }));
                    }}
                    className={cn(
                      "h-9 text-xs transition-colors",
                      ruleErrors.serviceFeePercent && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                    )}
                  />
                  {ruleErrors.serviceFeePercent ? (
                    <p className="text-[11px] font-medium text-rose-500">{ruleErrors.serviceFeePercent}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">Geralmente 10%</p>
                  )}
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
                    value={waiterSharePercent}
                    onChange={(e) => {
                      setWaiterSharePercent(e.target.value);
                      if (ruleErrors.waiterSharePercent) setRuleErrors((prev) => ({ ...prev, waiterSharePercent: "" }));
                    }}
                    className={cn(
                      "h-9 text-xs transition-colors",
                      ruleErrors.waiterSharePercent && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
                    )}
                  />
                  {ruleErrors.waiterSharePercent ? (
                    <p className="text-[11px] font-medium text-rose-500">{ruleErrors.waiterSharePercent}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">100% = repasse integral</p>
                  )}
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
              <Button type="submit" disabled={isPending} className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25">
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
            ? Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Sim, excluir garçom"
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
