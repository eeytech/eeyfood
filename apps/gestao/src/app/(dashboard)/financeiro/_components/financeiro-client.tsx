"use client";

import {
  BanknoteIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  FilterXIcon,
  HandCoinsIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UsersIcon,
  UserXIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  fecharGorjetaGarcomAction,
  type GarcomMetricas,
} from "@/app/(dashboard)/configuracoes/garcons-actions";
import {
  excluirPagamentoFuncionarioAction,
  registrarPagamentoFuncionarioAction,
  type FuncionarioMetricas,
  type FuncionarioPagamentoItem,
} from "@/app/(dashboard)/configuracoes/funcionarios-actions";
import {
  createFinancialCategoryAction,
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
  updateTransactionStatusAction,
} from "@/app/(dashboard)/financeiro-actions";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
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
import type { FinancialCategory, FinancialTransaction } from "@fsw/db";

interface TransactionWithCategory {
  transaction: FinancialTransaction;
  category: { id: string; name: string; type: string } | null;
}

interface FinanceiroClientProps {
  slug: string;
  transacoes: TransactionWithCategory[];
  categorias: FinancialCategory[];
  garcons?: GarcomMetricas[];
  funcionarios?: FuncionarioMetricas[];
  pagamentosFuncionarios?: FuncionarioPagamentoItem[];
  receitasPendentes: number;
  despesasPendentes: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: Date) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "Data indisp.";
  }
}

const statusConfig: Record<
  string,
  { label: string; badgeClass: string }
> = {
  PENDING: {
    label: "Pendente",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
  },
  PAID: {
    label: "Pago / Recebido",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  },
  CANCELLED: {
    label: "Cancelado",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export function FinanceiroClient({
  slug,
  transacoes,
  categorias,
  garcons = [],
  funcionarios = [],
  pagamentosFuncionarios = [],
  receitasPendentes,
  despesasPendentes,
}: FinanceiroClientProps) {
  // Main Tab (Transações vs Pagamento de Funcionários)
  const [activeMainTab, setActiveMainTab] = useState<"TRANSACTIONS" | "EMPLOYEES">("TRANSACTIONS");

  // Pagamento de Funcionários
  const [employeePaymentModalOpen, setEmployeePaymentModalOpen] = useState(false);
  const [selectedEmployeeForPayment, setSelectedEmployeeForPayment] = useState<FuncionarioMetricas | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentType, setPaymentType] = useState<string>("SALARY");
  const [paymentRefMonth, setPaymentRefMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [paymentLaunchExpense, setPaymentLaunchExpense] = useState<boolean>(true);
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [deletingPaymentItem, setDeletingPaymentItem] = useState<FuncionarioPagamentoItem | null>(null);

  // Filtros de Pagamentos de Funcionários
  const [empSearch, setEmpSearch] = useState("");
  const [empTypeFilter, setEmpTypeFilter] = useState("all");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "revenue" | "expense">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [createTransactionOpen, setCreateTransactionOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [editTransaction, setEditTransaction] =
    useState<FinancialTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<{ id: string; description: string } | null>(null);

  // Fechar Gorjetas / Repasse
  const [closingDialogOpen, setClosingDialogOpen] = useState(false);
  const [selectedGarcomForClosing, setSelectedGarcomForClosing] =
    useState<GarcomMetricas | null>(null);
  const [closingAmount, setClosingAmount] = useState<string>("");
  const [closingNotes, setClosingNotes] = useState<string>("");
  const [createFinancialExpense, setCreateFinancialExpense] = useState(true);

  const [isPending, startTransition] = useTransition();

  const isFiltering =
    search.trim() !== "" || statusFilter !== "all" || categoryFilter !== "all";

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCurrentPage(1);
  };

  const applyFilters = useCallback(
    (items: TransactionWithCategory[]) =>
      items.filter((item) => {
        // Search text
        if (search.trim()) {
          const query = search.toLowerCase().trim();
          const matchesDesc = item.transaction.description
            .toLowerCase()
            .includes(query);
          const matchesCat =
            item.category?.name.toLowerCase().includes(query) ?? false;
          if (!matchesDesc && !matchesCat) return false;
        }

        // Status
        if (statusFilter !== "all" && item.transaction.status !== statusFilter) {
          return false;
        }

        // Category
        if (categoryFilter !== "all" && item.transaction.categoryId !== categoryFilter) {
          return false;
        }

        return true;
      }),
    [search, statusFilter, categoryFilter],
  );

  const allFiltered = useMemo(() => applyFilters(transacoes), [transacoes, applyFilters]);
  const revenueFiltered = useMemo(
    () => applyFilters(transacoes.filter((i) => i.transaction.type === "REVENUE")),
    [transacoes, applyFilters],
  );
  const expenseFiltered = useMemo(
    () => applyFilters(transacoes.filter((i) => i.transaction.type === "EXPENSE")),
    [transacoes, applyFilters],
  );

  const currentTabItems =
    activeTab === "revenue"
      ? revenueFiltered
      : activeTab === "expense"
        ? expenseFiltered
        : allFiltered;

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(currentTabItems.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = currentTabItems.slice(startIndex, endIndex);

  const handleDeleteConfirm = () => {
    if (!deletingTransaction) return;
    startTransition(async () => {
      try {
        await deleteTransactionAction(slug, deletingTransaction.id);
        toast.success(`Transação "${deletingTransaction.description}" excluída.`);
        setDeletingTransaction(null);
      } catch {
        toast.error("Não foi possível excluir a transação.");
      }
    });
  };

  const handleStatusUpdate = (
    transactionId: string,
    status: "PAID" | "CANCELLED",
    description: string,
  ) => {
    startTransition(async () => {
      try {
        await updateTransactionStatusAction(slug, transactionId, status);
        toast.success(
          `Transação "${description}" marcada como ${status === "PAID" ? "paga" : "cancelada"}.`,
        );
      } catch {
        toast.error("Não foi possível atualizar o status.");
      }
    });
  };

  const handleCreateTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createTransactionAction(slug, formData);
        toast.success("Transação lançada com sucesso!");
        setCreateTransactionOpen(false);
      } catch {
        toast.error("Erro ao lançar transação.");
      }
    });
  };

  const handleUpdateTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTransaction) return;
    const formData = new FormData(e.currentTarget);
    formData.set("transactionId", editTransaction.id);
    startTransition(async () => {
      try {
        await updateTransactionAction(slug, formData);
        toast.success("Transação atualizada com sucesso!");
        setEditTransaction(null);
      } catch {
        toast.error("Erro ao atualizar transação.");
      }
    });
  };

  const handleCreateCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createFinancialCategoryAction(slug, formData);
        toast.success("Categoria criada com sucesso!");
        setCreateCategoryOpen(false);
      } catch {
        toast.error("Erro ao criar categoria.");
      }
    });
  };

  const handleOpenClosing = (g?: GarcomMetricas) => {
    const target = g || garcons[0] || null;
    setSelectedGarcomForClosing(target);
    setClosingAmount(
      target && target.pendingBalance > 0 ? String(target.pendingBalance) : "",
    );
    setClosingNotes("");
    setCreateFinancialExpense(true);
    setClosingDialogOpen(true);
  };

  const handleClosingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedGarcomForClosing) return;

    const formData = new FormData();
    formData.set("waiterId", selectedGarcomForClosing.waiter.id);
    formData.set("amount", closingAmount);
    formData.set("notes", closingNotes);
    formData.set("createFinancialExpense", String(createFinancialExpense));

    startTransition(async () => {
      const res = await fecharGorjetaGarcomAction(slug, formData);
      if (res.success) {
        toast.success("Repasse de gorjeta registrado com sucesso!");
        setClosingDialogOpen(false);
      } else {
        toast.error(res.error || "Erro ao registrar repasse.");
      }
    });
  };

  // ── Handlers de Pagamento de Funcionários ──
  const handleOpenEmployeePayment = (f?: FuncionarioMetricas) => {
    const target = f || funcionarios[0] || null;
    setSelectedEmployeeForPayment(target);
    setPaymentAmount(target ? String(target.funcionario.baseSalary || "") : "");
    setPaymentType("SALARY");
    setPaymentRefMonth(new Date().toISOString().slice(0, 7));
    setPaymentMethod("PIX");
    setPaymentLaunchExpense(true);
    setPaymentNotes("");
    setEmployeePaymentModalOpen(true);
  };

  const handleEmployeePaymentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployeeForPayment) {
      toast.error("Selecione um funcionário.");
      return;
    }
    const val = parseFloat(paymentAmount.replace(",", "."));
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    const formData = new FormData();
    formData.set("employeeId", selectedEmployeeForPayment.funcionario.id);
    formData.set("amount", String(val));
    formData.set("type", paymentType);
    formData.set("referenceMonth", paymentRefMonth);
    formData.set("paymentMethod", paymentMethod);
    formData.set("launchExpense", String(paymentLaunchExpense));
    formData.set("notes", paymentNotes);

    startTransition(async () => {
      try {
        await registrarPagamentoFuncionarioAction(slug, formData);
        toast.success(
          `Pagamento de ${formatCurrency(val)} registrado para ${selectedEmployeeForPayment.funcionario.name}!`,
        );
        setEmployeePaymentModalOpen(false);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao processar pagamento.",
        );
      }
    });
  };

  const handleConfirmDeleteEmployeePayment = () => {
    if (!deletingPaymentItem) return;
    startTransition(async () => {
      try {
        await excluirPagamentoFuncionarioAction(slug, deletingPaymentItem.id);
        toast.success("Pagamento removido com sucesso.");
        setDeletingPaymentItem(null);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao excluir pagamento.",
        );
      }
    });
  };

  const handleCopyPix = (pixKey?: string | null) => {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey);
    toast.success("Chave Pix copiada!");
  };

  // Filtragem de Pagamentos de Funcionários
  const filteredEmployeePayments = useMemo(() => {
    return pagamentosFuncionarios.filter((p) => {
      if (empTypeFilter !== "all" && p.type !== empTypeFilter) return false;
      if (empSearch.trim()) {
        const q = empSearch.toLowerCase().trim();
        const matchesName = p.employeeName.toLowerCase().includes(q);
        const matchesRole = p.employeeRole.toLowerCase().includes(q);
        const matchesNotes = p.notes?.toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesNotes) return false;
      }
      return true;
    });
  }, [pagamentosFuncionarios, empSearch, empTypeFilter]);

  // Métricas de Folha no Financeiro
  const totalFolhaBase = funcionarios
    .filter((f) => f.funcionario.status === "ACTIVE")
    .reduce((acc, f) => acc + Number(f.funcionario.baseSalary || 0), 0);

  const nowYearMonth = new Date().toISOString().slice(0, 7);
  const totalPagoMesAtual = pagamentosFuncionarios
    .filter((p) => p.referenceMonth === nowYearMonth || new Date(p.paidAt).toISOString().startsWith(nowYearMonth))
    .reduce((acc, p) => acc + p.amount, 0);

  const totalHistoricoPago = pagamentosFuncionarios.reduce((acc, p) => acc + p.amount, 0);

  const netProjected = receitasPendentes - despesasPendentes;

  return (
    <div className="space-y-6">
      {/* ── Dialogs: Lançamento / Edição / Categoria ───── */}
      <Dialog
        open={createTransactionOpen}
        onOpenChange={setCreateTransactionOpen}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <ReceiptIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Nova Transação
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Lance uma receita ou despesa no fluxo de caixa do restaurante.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <TransactionForm
            slug={slug}
            categorias={categorias}
            onSubmit={handleCreateTransaction}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTransaction !== null}
        onOpenChange={(open) => !open && setEditTransaction(null)}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <PencilIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Editar Transação
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {editTransaction?.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editTransaction && (
            <TransactionForm
              key={editTransaction.id}
              slug={slug}
              categorias={categorias}
              defaultValues={editTransaction}
              onSubmit={handleUpdateTransaction}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <TagIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Nova Categoria Financeira
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Organize suas transações categorizando custos e fontes de receita.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name" className="text-xs font-semibold text-slate-700">
                Nome da Categoria
              </Label>
              <Input
                id="cat-name"
                name="name"
                placeholder="Ex.: Insumos, Aluguel, Pessoal"
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-type" className="text-xs font-semibold text-slate-700">
                Natureza
              </Label>
              <Select name="type" defaultValue="EXPENSE">
                <SelectTrigger id="cat-type" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white">
                  <SelectValue placeholder="Selecione a natureza" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                  <SelectItem value="EXPENSE">Despesa (Contas a Pagar)</SelectItem>
                  <SelectItem value="REVENUE">Receita (Contas a Receber)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              className="h-10 w-full rounded-full bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? "Criando..." : "Criar Categoria"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Fechar Gorjetas / Repasse ────────────────────────────── */}
      <Dialog open={closingDialogOpen} onOpenChange={setClosingDialogOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-[480px]">
          <form onSubmit={handleClosingSubmit}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                  <HandCoinsIcon size={20} />
                </div>
                <div>
                  <DialogTitle className="font-display text-lg font-bold text-slate-900">
                    Registrar Repasse de Gorjetas / Comissão
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Dê baixa nas comissões apuradas para o garçom e registre o lançamento no financeiro.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {garcons.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Nenhum garçom cadastrado na equipe. Cadastre garçons em Acessos &gt; Garçons e Salão.
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="closingWaiter" className="text-xs font-semibold text-slate-700">
                    Selecione o Garçom
                  </Label>
                  <Select
                    value={selectedGarcomForClosing?.waiter.id}
                    onValueChange={(val) => {
                      const found = garcons.find((g) => g.waiter.id === val) || null;
                      setSelectedGarcomForClosing(found);
                      if (found && found.pendingBalance > 0) {
                        setClosingAmount(String(found.pendingBalance));
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs">
                      <SelectValue placeholder="Selecione o garçom" />
                    </SelectTrigger>
                    <SelectContent>
                      {garcons.map((g) => (
                        <SelectItem key={g.waiter.id} value={g.waiter.id}>
                          {g.waiter.name} — Saldo pendente: {formatCurrency(g.pendingBalance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedGarcomForClosing && (
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>
                        {selectedGarcomForClosing.waiter.commissionPercent > 0
                          ? `Comissão Apurada (${selectedGarcomForClosing.waiter.commissionPercent}% s/ itens):`
                          : "Taxa de Serviço Devida:"}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(
                          selectedGarcomForClosing.commissionDue ??
                            (selectedGarcomForClosing.waiter.commissionPercent > 0
                              ? ((selectedGarcomForClosing.totalSubtotal ??
                                  selectedGarcomForClosing.totalSales) *
                                  selectedGarcomForClosing.waiter.commissionPercent) /
                                100
                              : selectedGarcomForClosing.totalServiceFee),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Já Repassado Anteriormente:</span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(selectedGarcomForClosing.totalTipsPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between text-purple-700 font-bold border-t border-slate-200/60 pt-1.5 mt-1">
                      <span>Saldo Pendente Atual:</span>
                      <span>{formatCurrency(selectedGarcomForClosing.pendingBalance)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="closingAmount" className="text-xs font-semibold text-slate-700">
                    Valor a Pagar / Repassar (R$)
                  </Label>
                  <Input
                    id="closingAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="0,00"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="closingNotes" className="text-xs font-semibold text-slate-700">
                    Observações / Comprovante
                  </Label>
                  <Input
                    id="closingNotes"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Ex: Pagamento Pix semanal (semana 38)"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-slate-800">
                      Lançar Despesa no Financeiro
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Registra automaticamente uma saída de caixa em Financeiro &gt; Transações.
                    </p>
                  </div>
                  <Switch
                    checked={createFinancialExpense}
                    onCheckedChange={setCreateFinancialExpense}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setClosingDialogOpen(false)}
                disabled={isPending}
                className="h-10 rounded-full text-xs font-semibold"
              >
                Cancelar
              </Button>
              {garcons.length > 0 && (
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-10 gap-1.5 rounded-full bg-purple-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700"
                >
                  {isPending && <Loader2Icon size={14} className="animate-spin" />}
                  Confirmar Repasse
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <BanknoteIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Gestão Financeira
            </h1>
            <p className="text-sm text-slate-500">
              Controle seu fluxo de caixa, contas a pagar e receber, categorias e conciliação bancária.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenEmployeePayment()}
            className="h-10 gap-1.5 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          >
            <BanknoteIcon size={14} className="text-emerald-600" />
            <span>Pagar Funcionário</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenClosing()}
            className="h-10 gap-1.5 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          >
            <HandCoinsIcon size={14} className="text-purple-600" />
            <span>Fechar Gorjetas / Repasse</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setCreateCategoryOpen(true)}
            className="h-10 gap-1.5 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          >
            <TagIcon size={14} />
            <span>Nova Categoria</span>
          </Button>
          <Button
            onClick={() => setCreateTransactionOpen(true)}
            className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            <PlusIcon size={16} />
            <span>Nova Transação</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Lançamentos
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <ReceiptIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {transacoes.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {transacoes.filter((t) => t.transaction.status === "PAID").length} quitadas no fluxo
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Receitas a Receber
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <TrendingUpIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {formatCurrency(receitasPendentes)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {transacoes.filter((t) => t.transaction.type === "REVENUE" && t.transaction.status === "PENDING").length} recebimento(s) pendente(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Contas a Pagar
              </span>
              <div className="rounded-lg bg-rose-100 p-1.5 text-rose-700">
                <TrendingDownIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-rose-700">
              {formatCurrency(despesasPendentes)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {transacoes.filter((t) => t.transaction.type === "EXPENSE" && t.transaction.status === "PENDING").length} pagamento(s) pendente(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Saldo Previsto
              </span>
              <div
                className={cn(
                  "rounded-lg p-1.5",
                  netProjected >= 0 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700",
                )}
              >
                <BanknoteIcon size={16} />
              </div>
            </div>
            <p
              className={cn(
                "mt-2 font-display text-2xl font-bold",
                netProjected >= 0 ? "text-blue-700" : "text-amber-700",
              )}
            >
              {formatCurrency(netProjected)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Projeção de fluxo pendente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Sub-Tabs Navigation (Fluxo vs Pagamento de Funcionários) ────── */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveMainTab("TRANSACTIONS")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all",
            activeMainTab === "TRANSACTIONS"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800",
          )}
        >
          <ReceiptIcon size={16} />
          <span>Fluxo de Caixa e Transações</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
            {transacoes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("EMPLOYEES")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all",
            activeMainTab === "EMPLOYEES"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800",
          )}
        >
          <UsersIcon size={16} />
          <span>Pagamentos de Funcionários e Folha</span>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 font-medium">
            {pagamentosFuncionarios.length}
          </span>
        </button>
      </div>

      {activeMainTab === "TRANSACTIONS" ? (
      /* ── Container da Tabela e Transações ── */
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {/* Filtros de Transações */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por descrição ou categoria..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            {/* Selects: Status e Categoria */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-44">
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
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="PENDING">Pendentes</SelectItem>
                    <SelectItem value="PAID">Pagos / Recebidos</SelectItem>
                    <SelectItem value="CANCELLED">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-48">
                <Select
                  value={categoryFilter}
                  onValueChange={(val) => {
                    setCategoryFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Categoria..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} ({cat.type === "REVENUE" ? "Rec." : "Desp."})
                      </SelectItem>
                    ))}
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

        {/* ── Abas de Natureza (Todas / Receitas / Despesas) ── */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as "all" | "revenue" | "expense");
            setCurrentPage(1);
          }}
        >
          <div className="border-b border-slate-100 bg-white px-4 py-3">
            <TabsList className="h-auto flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
              <TabsTrigger
                value="all"
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                Todas ({allFiltered.length})
              </TabsTrigger>
              <TabsTrigger
                value="revenue"
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <TrendingUpIcon size={13} className="mr-1.5 text-emerald-600" />
                Receitas ({revenueFiltered.length})
              </TabsTrigger>
              <TabsTrigger
                value="expense"
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <TrendingDownIcon size={13} className="mr-1.5 text-rose-600" />
                Despesas ({expenseFiltered.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="m-0 p-0">
            {currentTabItems.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
                  <ReceiptIcon size={32} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhuma transação encontrada
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {isFiltering
                    ? "Tente ajustar os termos da busca ou limpar os filtros para visualizar outros lançamentos."
                    : "Nenhuma transação registrada nesta aba ainda. Comece lançando uma receita ou despesa!"}
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
                    onClick={() => setCreateTransactionOpen(true)}
                    className="mt-4 gap-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <PlusIcon size={14} />
                    Lançar primeira transação
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
                        <TableHead className="w-[140px] text-xs font-semibold text-slate-700">
                          Vencimento
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">
                          Descrição
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">
                          Categoria
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">
                          Valor
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
                      {paginatedItems.map((item) => {
                        const isRevenue = item.transaction.type === "REVENUE";
                        const st = statusConfig[item.transaction.status] ?? {
                          label: item.transaction.status,
                          badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                        };

                        return (
                          <TableRow
                            key={item.transaction.id}
                            className="transition-colors hover:bg-slate-50/70"
                          >
                            {/* Data */}
                            <TableCell className="py-3.5 text-xs text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <CalendarIcon size={12} className="shrink-0 text-slate-400" />
                                <span>{formatDate(item.transaction.dueDate)}</span>
                              </div>
                            </TableCell>

                            {/* Descrição */}
                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                    isRevenue
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700",
                                  )}
                                >
                                  {isRevenue ? (
                                    <TrendingUpIcon size={14} />
                                  ) : (
                                    <TrendingDownIcon size={14} />
                                  )}
                                </div>
                                <span className="font-semibold text-slate-900">
                                  {item.transaction.description}
                                </span>
                              </div>
                            </TableCell>

                            {/* Categoria */}
                            <TableCell className="py-3.5">
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                {item.category?.name ?? "Geral"}
                              </span>
                            </TableCell>

                            {/* Valor */}
                            <TableCell
                              className={cn(
                                "py-3.5 text-right font-semibold",
                                isRevenue ? "text-emerald-700" : "text-rose-700",
                              )}
                            >
                              {isRevenue ? "+" : "−"} {formatCurrency(item.transaction.amount)}
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-3.5 text-center">
                              <Badge
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  st.badgeClass,
                                )}
                              >
                                {st.label}
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
                                  {item.transaction.status === "PENDING" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleStatusUpdate(
                                          item.transaction.id,
                                          "PAID",
                                          item.transaction.description,
                                        )
                                      }
                                      className="gap-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                    >
                                      <CheckCircle2Icon size={14} className="text-primary" />
                                      Marcar como Quitado
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => setEditTransaction(item.transaction)}
                                    className="gap-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                  >
                                    <PencilIcon size={14} className="text-primary" />
                                    Editar lançamento
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-slate-100" />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDeletingTransaction({
                                        id: item.transaction.id,
                                        description: item.transaction.description,
                                      })
                                    }
                                    className="gap-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                                  >
                                    <Trash2Icon size={14} />
                                    Excluir lançamento
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
                  {paginatedItems.map((item) => {
                    const isRevenue = item.transaction.type === "REVENUE";
                    const st = statusConfig[item.transaction.status] ?? {
                      label: item.transaction.status,
                      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                    };

                    return (
                      <div key={item.transaction.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                                isRevenue
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700",
                              )}
                            >
                              {isRevenue ? (
                                <TrendingUpIcon size={15} />
                              ) : (
                                <TrendingDownIcon size={15} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {item.transaction.description}
                              </p>
                              <p className="flex items-center gap-1 text-xs text-slate-500">
                                <CalendarIcon size={11} className="text-slate-400" />
                                {formatDate(item.transaction.dueDate)}
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
                              {item.transaction.status === "PENDING" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusUpdate(
                                      item.transaction.id,
                                      "PAID",
                                      item.transaction.description,
                                    )
                                  }
                                  className="gap-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                >
                                  <CheckCircle2Icon size={14} className="text-primary" />
                                  Marcar como Quitado
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setEditTransaction(item.transaction)}
                                className="gap-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                              >
                                <PencilIcon size={14} className="text-primary" />
                                Editar dados
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem
                                onClick={() =>
                                  setDeletingTransaction({
                                    id: item.transaction.id,
                                    description: item.transaction.description,
                                  })
                                }
                                className="gap-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                              >
                                <Trash2Icon size={14} />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {item.category?.name ?? "Geral"}
                          </span>

                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                isRevenue ? "text-emerald-700" : "text-rose-700",
                              )}
                            >
                              {isRevenue ? "+" : "−"} {formatCurrency(item.transaction.amount)}
                            </span>
                            <Badge className={cn("text-[11px]", st.badgeClass)}>
                              {st.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paginação */}
                <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      Exibindo <strong className="font-semibold text-slate-900">{currentTabItems.length}</strong> de{" "}
                      {transacoes.length} lançamento{transacoes.length !== 1 ? "s" : ""}
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
                        <SelectContent className="rounded-lg border-slate-200 bg-white shadow-lg">
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
          </TabsContent>
        </Tabs>
      </Card>
      ) : (
        /* ── Aba: Pagamentos de Funcionários e Folha ───────── */
        <div className="space-y-6">
          {/* ── Cards de Resumo da Folha ───────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Folha Base Mensal
                  </span>
                  <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                    <BanknoteIcon size={16} />
                  </div>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-purple-700">
                  {formatCurrency(totalFolhaBase)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {funcionarios.filter((f) => f.funcionario.status === "ACTIVE").length} colaboradores ativos
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Pago no Mês
                  </span>
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                    <CheckCircle2Icon size={16} />
                  </div>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
                  {formatCurrency(totalPagoMesAtual)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Liquidações do mês corrente
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Pagamentos Efetuados
                  </span>
                  <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                    <ReceiptIcon size={16} />
                  </div>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-blue-700">
                  {pagamentosFuncionarios.length}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Total de recibos registrados
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Histórico Pago
                  </span>
                  <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                    <TrendingDownIcon size={16} />
                  </div>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-slate-800">
                  {formatCurrency(totalHistoricoPago)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Acumulado de repasses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Painel de Pagamentos e Lançamento de Folha ──── */}
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Header da Tabela com Filtros e Ações */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-2 max-w-md">
                  <div className="relative flex-1">
                    <SearchIcon
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar por colaborador ou observação..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="h-9 rounded-xl border-slate-200 bg-white pl-9 text-xs focus:bg-white"
                    />
                    {empSearch && (
                      <button
                        onClick={() => setEmpSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XIcon size={14} />
                      </button>
                    )}
                  </div>

                  <Select value={empTypeFilter} onValueChange={setEmpTypeFilter}>
                    <SelectTrigger className="h-9 w-40 rounded-xl border-slate-200 bg-white text-xs">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="SALARY">Salário Mensal</SelectItem>
                      <SelectItem value="ADVANCE">Vale / Adiantamento</SelectItem>
                      <SelectItem value="DAILY">Diária / Avulso</SelectItem>
                      <SelectItem value="BONUS">Bonificação</SelectItem>
                      <SelectItem value="VACATION">Férias</SelectItem>
                      <SelectItem value="THIRTEENTH">13º Salário</SelectItem>
                      <SelectItem value="OTHER">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleOpenEmployeePayment()}
                    className="h-9 gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                  >
                    <PlusIcon size={14} />
                    <span>Lançar Pagamento</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabela de Pagamentos */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Colaborador
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tipo / Mês Ref.
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Valor
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Chave Pix
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Forma / Data
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Caixa
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployeePayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-slate-500">
                        <UserXIcon size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-700">
                          Nenhum pagamento registrado
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Utilize o botão acima para lançar pagamentos de salários, vales ou adiantamentos.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployeePayments.map((p) => {
                      const typeBadgeConfig: Record<string, { label: string; className: string }> = {
                        SALARY: { label: "Salário Mensal", className: "bg-blue-100 text-blue-700" },
                        ADVANCE: { label: "Adiantamento / Vale", className: "bg-amber-100 text-amber-700" },
                        DAILY: { label: "Diária / Avulso", className: "bg-purple-100 text-purple-700" },
                        BONUS: { label: "Bonificação", className: "bg-emerald-100 text-emerald-700" },
                        VACATION: { label: "Férias", className: "bg-indigo-100 text-indigo-700" },
                        THIRTEENTH: { label: "13º Salário", className: "bg-rose-100 text-rose-700" },
                        OTHER: { label: "Outro", className: "bg-slate-100 text-slate-700" },
                      };
                      const badge = typeBadgeConfig[p.type] || { label: p.type, className: "bg-slate-100 text-slate-700" };

                      return (
                        <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50/70">
                          {/* Colaborador */}
                          <TableCell>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{p.employeeName}</p>
                              <p className="text-[11px] text-slate-400">{p.employeeRole}</p>
                            </div>
                          </TableCell>

                          {/* Tipo / Mês */}
                          <TableCell>
                            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badge.className)}>
                              {badge.label}
                            </span>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              Ref: {p.referenceMonth}
                            </p>
                          </TableCell>

                          {/* Valor */}
                          <TableCell>
                            <p className="text-xs font-bold text-slate-900">{formatCurrency(p.amount)}</p>
                            {p.notes && <p className="max-w-[180px] truncate text-[10px] text-slate-400">{p.notes}</p>}
                          </TableCell>

                          {/* Chave Pix */}
                          <TableCell>
                            {p.employeePix ? (
                              <button
                                onClick={() => handleCopyPix(p.employeePix)}
                                title="Copiar chave Pix"
                                className="group inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 hover:border-primary/40 hover:text-primary transition-all"
                              >
                                <span className="max-w-[120px] truncate font-mono">{p.employeePix}</span>
                                <CopyIcon size={11} className="text-slate-400 group-hover:text-primary" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Não informada</span>
                            )}
                          </TableCell>

                          {/* Forma / Data */}
                          <TableCell>
                            <p className="text-xs font-semibold text-slate-700">{p.paymentMethod}</p>
                            <p className="text-[11px] text-slate-400">{formatDate(p.paidAt)}</p>
                          </TableCell>

                          {/* Caixa / Transação */}
                          <TableCell>
                            {p.financialTransactionId ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                <CheckCircle2Icon size={11} />
                                <span>No Caixa</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Avulso</span>
                            )}
                          </TableCell>

                          {/* Ações */}
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingPaymentItem(p)}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Remover pagamento"
                            >
                              <Trash2Icon size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* ── Seção de Colaboradores e Ações Rápidas ──────── */}
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Colaboradores Cadastrados
                </h4>
                <p className="text-xs text-slate-500">
                  Clique em &quot;Pagar&quot; para liquidar proventos rapidamente via Pix ou dinheiro.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="h-8 gap-1.5 rounded-full text-xs font-semibold border-slate-200"
              >
                <Link href="/configuracoes/usuarios">
                  <span>Gerenciar Funcionários</span>
                  <ExternalLinkIcon size={12} />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {funcionarios.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs text-slate-500">
                  Nenhum funcionário cadastrado ainda.{" "}
                  <Link href="/configuracoes/usuarios" className="font-semibold text-primary underline">
                    Cadastrar na aba de funcionários
                  </Link>
                </div>
              ) : (
                funcionarios.map(({ funcionario, totalPagoMesAtual }) => (
                  <div
                    key={funcionario.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 bg-slate-50/50 hover:bg-white hover:border-primary/40 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-bold text-slate-900">{funcionario.name}</p>
                        <span className="rounded-sm bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                          {funcionario.roleTitle}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Base: <strong>{formatCurrency(Number(funcionario.baseSalary || 0))}</strong>
                      </p>
                      {funcionario.pixKey && (
                        <p className="truncate text-[10px] text-slate-400 font-mono">
                          Pix: {funcionario.pixKey}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenEmployeePayment({
                        funcionario,
                        totalPagoMesAtual,
                        totalPagoHistorico: 0,
                        ultimoPagamento: null,
                      })}
                      className="h-8 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                    >
                      Pagar
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Dialog: Pagar Funcionário / Folha ───────────────── */}
      <Dialog open={employeePaymentModalOpen} onOpenChange={setEmployeePaymentModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl border-2 border-primary bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display text-primary">
              Lançar Pagamento de Colaborador
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registre a liquidação de salários, vales ou diárias com integração automática ao caixa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEmployeePaymentSubmit} className="space-y-4 pt-2">
            {/* Seletor de Colaborador */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Selecione o Colaborador
              </Label>
              <Select
                value={selectedEmployeeForPayment?.funcionario.id}
                onValueChange={(id) => {
                  const found = funcionarios.find((f) => f.funcionario.id === id);
                  if (found) {
                    setSelectedEmployeeForPayment(found);
                    setPaymentAmount(String(found.funcionario.baseSalary || ""));
                  }
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Selecione um funcionário..." />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.map(({ funcionario }) => (
                    <SelectItem key={funcionario.id} value={funcionario.id}>
                      {funcionario.name} — {funcionario.roleTitle} ({formatCurrency(Number(funcionario.baseSalary || 0))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info do Colaborador Selecionado + Chave Pix */}
            {selectedEmployeeForPayment && (
              <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Salário Base Cadastrado:</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(Number(selectedEmployeeForPayment.funcionario.baseSalary || 0))}
                  </span>
                </div>
                {selectedEmployeeForPayment.funcionario.pixKey ? (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-primary/10">
                    <span className="text-slate-600">Chave Pix ({selectedEmployeeForPayment.funcionario.pixType}):</span>
                    <button
                      type="button"
                      onClick={() => handleCopyPix(selectedEmployeeForPayment.funcionario.pixKey)}
                      className="group flex items-center gap-1 font-mono font-semibold text-primary hover:underline"
                    >
                      <span className="max-w-[180px] truncate">{selectedEmployeeForPayment.funcionario.pixKey}</span>
                      <CopyIcon size={12} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-600">
                    Aviso: Nenhuma chave Pix cadastrada para este colaborador.
                  </p>
                )}
              </div>
            )}

            {/* Tipo de Pagamento e Mês Ref */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Tipo de Provento
                </Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALARY">Salário Mensal</SelectItem>
                    <SelectItem value="ADVANCE">Adiantamento / Vale</SelectItem>
                    <SelectItem value="DAILY">Diária / Por Turno</SelectItem>
                    <SelectItem value="BONUS">Bonificação / Bônus</SelectItem>
                    <SelectItem value="VACATION">Férias</SelectItem>
                    <SelectItem value="THIRTEENTH">13º Salário</SelectItem>
                    <SelectItem value="OTHER">Outro Provento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentRefMonth" className="text-xs font-semibold text-slate-700">
                  Mês de Referência
                </Label>
                <Input
                  id="paymentRefMonth"
                  type="month"
                  value={paymentRefMonth}
                  onChange={(e) => setPaymentRefMonth(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 text-xs"
                  required
                />
              </div>
            </div>

            {/* Valor e Forma de Pagamento */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="paymentAmount" className="text-xs font-semibold text-slate-700">
                  Valor a Pagar (R$)
                </Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0,00"
                  className="h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Forma de Pagamento
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">Pix Transferência</SelectItem>
                    <SelectItem value="TRANSFER">TED / DOC Bancário</SelectItem>
                    <SelectItem value="CASH">Dinheiro em Espécie</SelectItem>
                    <SelectItem value="OTHER">Cheque / Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentNotes" className="text-xs font-semibold text-slate-700">
                Observações / Detalhes
              </Label>
              <Input
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ex: Adiantamento referente a 1ª quinzena de outubro"
                className="h-10 rounded-xl border-slate-200 text-xs"
              />
            </div>

            {/* Switch: Lançar Despesa no Caixa */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 bg-slate-50/50">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Lançar Despesa no Financeiro
                </Label>
                <p className="text-[11px] text-slate-500">
                  Registra saída automática em Transações &gt; Categoria &quot;Folha de Pagamento&quot;.
                </p>
              </div>
              <Switch
                checked={paymentLaunchExpense}
                onCheckedChange={setPaymentLaunchExpense}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmployeePaymentModalOpen(false)}
                disabled={isPending}
                className="h-10 rounded-full text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || !selectedEmployeeForPayment}
                className="h-10 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                {isPending && <Loader2Icon size={14} className="animate-spin" />}
                <span>Confirmar Pagamento</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Exclusão de Pagamento de Funcionário ── */}
      <ConfirmDeleteDialog
        open={Boolean(deletingPaymentItem)}
        onOpenChange={(open) => {
          if (!open) setDeletingPaymentItem(null);
        }}
        title="Excluir Pagamento"
        description={
          deletingPaymentItem ? (
            <>
              Tem certeza que deseja estornar o pagamento de{" "}
              <strong>{formatCurrency(deletingPaymentItem.amount)}</strong> para{" "}
              <strong>{deletingPaymentItem.employeeName}</strong>? Se houver lançamento de despesa no caixa vinculado, ele também será removido.
            </>
          ) : undefined
        }
        isPending={isPending}
        onConfirm={handleConfirmDeleteEmployeePayment}
      />

      {/* ── Dialog: Confirmar Exclusão de Transação ───────── */}
      <ConfirmDeleteDialog
        open={Boolean(deletingTransaction)}
        onOpenChange={(open) => {
          if (!open) setDeletingTransaction(null);
        }}
        title="Excluir lançamento"
        description={
          <>
            Tem certeza que deseja remover o lançamento{" "}
            <strong className="text-slate-900 font-semibold">
              &quot;{deletingTransaction?.description}&quot;
            </strong>
            ? Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Sim, excluir lançamento"
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

interface TransactionFormProps {
  slug: string;
  categorias: FinancialCategory[];
  defaultValues?: FinancialTransaction;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}

function TransactionForm({
  categorias,
  defaultValues,
  onSubmit,
  isPending,
}: TransactionFormProps) {
  const defaultDate = defaultValues?.dueDate
    ? new Date(defaultValues.dueDate).toISOString().split("T")[0]
    : "";

  const [type, setType] = useState<string>(defaultValues?.type ?? "EXPENSE");
  const [status, setStatus] = useState<string>(defaultValues?.status ?? "PENDING");
  const [categoryId, setCategoryId] = useState<string>(defaultValues?.categoryId || "none");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="tx-description" className="text-xs font-semibold text-slate-700">
          Descrição
        </Label>
        <Input
          id="tx-description"
          name="description"
          placeholder="Ex.: Aluguel do imóvel, Compra de carne, Fornecedor bebidas"
          defaultValue={defaultValues?.description}
          className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tx-amount" className="text-xs font-semibold text-slate-700">
            Valor (R$)
          </Label>
          <Input
            id="tx-amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaultValues ? String(defaultValues.amount) : ""}
            className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-dueDate" className="text-xs font-semibold text-slate-700">
            Data de Vencimento
          </Label>
          <DatePicker
            id="tx-dueDate"
            name="dueDate"
            defaultValue={defaultDate}
            required
            placeholder="Data de vencimento"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tx-type" className="text-xs font-semibold text-slate-700">
            Natureza da Operação
          </Label>
          <Select name="type" value={type} onValueChange={setType}>
            <SelectTrigger id="tx-type" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white">
              <SelectValue placeholder="Selecione a natureza" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
              <SelectItem value="EXPENSE">Despesa (Contas a Pagar)</SelectItem>
              <SelectItem value="REVENUE">Receita (Contas a Receber)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-status" className="text-xs font-semibold text-slate-700">
            Status
          </Label>
          <Select name="status" value={status} onValueChange={setStatus}>
            <SelectTrigger id="tx-status" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="PAID">Pago / Recebido</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tx-category" className="text-xs font-semibold text-slate-700">
          Categoria
        </Label>
        <Select
          name="categoryId"
          value={categoryId}
          onValueChange={setCategoryId}
        >
          <SelectTrigger id="tx-category" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
            <SelectItem value="none">Sem categoria (Geral)</SelectItem>
            {categorias.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name} ({cat.type === "REVENUE" ? "Receita" : "Despesa"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="categoryId" value={categoryId === "none" ? "" : categoryId} />
      </div>

      <Button
        type="submit"
        className="h-10 w-full rounded-full bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        disabled={isPending}
      >
        {isPending
          ? defaultValues
            ? "Salvando..."
            : "Lançando..."
          : defaultValues
            ? "Salvar Alterações"
            : "Lançar no Fluxo de Caixa"}
      </Button>
    </form>
  );
}
