"use client";

import {
  AlertCircleIcon,
  BadgePercentIcon,
  CheckCircle2Icon,
  CoinsIcon,
  DollarSignIcon,
  Edit2Icon,
  FileTextIcon,
  HandCoinsIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  ReceiptIcon,
  Settings2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  UserCheckIcon,
  UsersIcon,
  UserXIcon,
  UtensilsIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  alternarStatusGarcomAction,
  CommissionRuleData,
  criarOuEditarGarcomAction,
  excluirGarcomAction,
  fecharGorjetaGarcomAction,
  GarcomMetricas,
  salvarRegraComissaoAction,
  TipClosingItem,
} from "../garcons-actions";

interface GarconsTabProps {
  slug: string;
  garcons: GarcomMetricas[];
  regraComissao: CommissionRuleData | null;
  fechamentos: TipClosingItem[];
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

export function GarconsTab({ slug, garcons, regraComissao, fechamentos }: GarconsTabProps) {
  const [isPending, startTransition] = useTransition();

  // Dialog de Criar/Editar Garçom
  const [garcomDialogOpen, setGarcomDialogOpen] = useState(false);
  const [editingGarcom, setEditingGarcom] = useState<GarcomMetricas | null>(null);

  // Dialog de Regra de Serviço
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  // Dialog de Fechar Gorjetas
  const [closingDialogOpen, setClosingDialogOpen] = useState(false);
  const [selectedGarcomForClosing, setSelectedGarcomForClosing] = useState<GarcomMetricas | null>(
    null,
  );
  const [closingAmount, setClosingAmount] = useState<string>("");
  const [closingNotes, setClosingNotes] = useState<string>("");
  const [createFinancialExpense, setCreateFinancialExpense] = useState(true);

  // Métricas Consolidadas
  const totalGarcons = garcons.length;
  const garconsAtivos = garcons.filter((g) => g.waiter.status === "ACTIVE").length;
  const totalVendidoSalao = garcons.reduce((acc, g) => acc + g.totalSales, 0);
  const totalTaxaServico = garcons.reduce((acc, g) => acc + g.totalServiceFee, 0);
  const totalGorjetasPagas = garcons.reduce((acc, g) => acc + g.totalTipsPaid, 0);
  const totalPendente = garcons.reduce((acc, g) => acc + g.pendingBalance, 0);

  // Abrir Modal para Novo Garçom
  const handleOpenNewGarcom = () => {
    setEditingGarcom(null);
    setGarcomDialogOpen(true);
  };

  // Abrir Modal para Editar Garçom
  const handleOpenEditGarcom = (g: GarcomMetricas) => {
    setEditingGarcom(g);
    setGarcomDialogOpen(true);
  };

  // Submeter Garçom
  const handleGarcomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (editingGarcom) {
      formData.set("id", editingGarcom.waiter.id);
    }

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
  const handleDeleteGarcom = (waiterId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover o garçom ${name}?`)) return;

    startTransition(async () => {
      const res = await excluirGarcomAction(slug, waiterId);
      if (res.success) {
        toast.success("Garçom removido com sucesso.");
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

  // Abrir Modal de Fechamento de Gorjetas
  const handleOpenClosing = (g?: GarcomMetricas) => {
    const target = g || garcons[0] || null;
    setSelectedGarcomForClosing(target);
    setClosingAmount(target && target.pendingBalance > 0 ? String(target.pendingBalance) : "");
    setClosingNotes("");
    setCreateFinancialExpense(true);
    setClosingDialogOpen(true);
  };

  // Submeter Fechamento de Gorjetas
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

  return (
    <div className="space-y-6">
      {/* ── KPIs Cards ────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Garçons Cadastrados</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <UtensilsIcon size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {garconsAtivos}
              </span>
              <span className="text-xs text-slate-500 font-medium">de {totalGarcons} ativos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Vendas no Salão</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSignIcon size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(totalVendidoSalao)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Taxa de Serviço (10%)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <BadgePercentIcon size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(totalTaxaServico)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Comissões a Pagar</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <HandCoinsIcon size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-purple-600">
                {formatCurrency(totalPendente)}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({formatCurrency(totalGorjetasPagas)} pagos)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Toolbar Actions ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-slate-200 bg-white text-xs font-medium text-slate-700">
            {regraComissao
              ? `${regraComissao.name} (${regraComissao.serviceFeePercent}% com repasse de ${regraComissao.waiterSharePercent}%)`
              : "Taxa de Serviço: 10% (Padrão)"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRuleDialogOpen(true)}
            className="h-7 gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <Settings2Icon size={13} />
            Configurar Regra
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenClosing()}
            disabled={garcons.length === 0}
            className="h-9 gap-1.5 rounded-lg border-slate-200 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50"
          >
            <HandCoinsIcon size={14} className="text-purple-600" />
            Fechar Gorjetas / Repasse
          </Button>

          <Button
            size="sm"
            onClick={handleOpenNewGarcom}
            className="h-9 gap-1.5 rounded-lg bg-slate-950 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
          >
            <PlusIcon size={14} />
            Novo Garçom
          </Button>
        </div>
      </div>

      {/* ── Tabela de Garçons ─────────────────────────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Equipe do Salão
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Garçons disponíveis para atendimento em mesas, comanda mobile e apuração de taxas.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
              {garcons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-sm text-slate-500">
                    Nenhum garçom cadastrado ainda. Clique em &ldquo;Novo Garçom&rdquo; para começar.
                  </TableCell>
                </TableRow>
              ) : (
                garcons.map((g) => {
                  const isAvailable = g.waiter.status === "ACTIVE";
                  return (
                    <TableRow key={g.waiter.id} className="border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700">
                            {g.waiter.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{g.waiter.name}</p>
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
                        <Badge
                          variant="outline"
                          className={
                            isAvailable
                              ? "border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-500"
                          }
                        >
                          {isAvailable ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                              <MoreHorizontalIcon size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleOpenEditGarcom(g)} className="gap-2 text-xs">
                              <Edit2Icon size={13} />
                              Editar dados
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => handleOpenClosing(g)} className="gap-2 text-xs font-medium text-purple-600">
                              <HandCoinsIcon size={13} />
                              Fechar gorjetas
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(g.waiter.id, g.waiter.status as "ACTIVE" | "INACTIVE")}
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
                              onClick={() => handleDeleteGarcom(g.waiter.id, g.waiter.name)}
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
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Histórico de Fechamentos de Gorjetas ───────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <ReceiptIcon size={18} className="text-purple-600" />
            Histórico de Repasses de Gorjetas & Comissões
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Registro dos pagamentos de comissões e taxas de serviço efetuados para a equipe.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
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
              {fechamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                    Nenhum fechamento de comissão registrado até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                fechamentos.map((f) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog: Criar/Editar Garçom ─────────────────────────────────── */}
      <Dialog open={garcomDialogOpen} onOpenChange={setGarcomDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleGarcomSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {editingGarcom ? "Editar Garçom" : "Novo Garçom do Salão"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre o profissional que atenderá mesas no salão e registrará pedidos via Comanda Mobile.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Nome Completo / Apelido no Salão *
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
                    defaultValue={editingGarcom?.waiter.phone || ""}
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
                    defaultValue={editingGarcom?.waiter.cpf || ""}
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
              <Button type="submit" disabled={isPending} className="h-9 gap-1.5 bg-slate-950 text-xs font-semibold text-white">
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
                Regra de Taxa de Serviço & Gorjetas
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
              <Button type="submit" disabled={isPending} className="h-9 gap-1.5 bg-slate-950 text-xs font-semibold text-white">
                {isPending && <Loader2Icon size={14} className="animate-spin" />}
                Salvar Regra
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Fechar Gorjetas / Repasse ────────────────────────────── */}
      <Dialog open={closingDialogOpen} onOpenChange={setClosingDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleClosingSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Registrar Repasse de Gorjetas / Comissão
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Dê baixa nas comissões apuradas para o garçom e opcionalmente gere o lançamento no financeiro.
              </DialogDescription>
            </DialogHeader>

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
                  <SelectTrigger className="h-9 text-xs">
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
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Total de Taxas Geradas:</span>
                    <span className="font-semibold">{formatCurrency(selectedGarcomForClosing.totalServiceFee)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Já Repassado Anteriormente:</span>
                    <span className="font-semibold">{formatCurrency(selectedGarcomForClosing.totalTipsPaid)}</span>
                  </div>
                  <div className="flex justify-between text-purple-700 font-bold border-t border-slate-200/60 pt-1 mt-1">
                    <span>Saldo Pendente Atual:</span>
                    <span>{formatCurrency(selectedGarcomForClosing.pendingBalance)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="closingAmount" className="text-xs font-semibold text-slate-700">
                  Valor a Pagar / Repassar (R$) *
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
                  className="h-9 text-xs font-semibold text-slate-900"
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
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setClosingDialogOpen(false)}
                disabled={isPending}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="h-9 gap-1.5 bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700">
                {isPending && <Loader2Icon size={14} className="animate-spin" />}
                Confirmar Repasse
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
