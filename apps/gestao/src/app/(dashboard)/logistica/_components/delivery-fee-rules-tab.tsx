"use client";

import type { DeliveryFeeRule } from "@fsw/db";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CompassIcon,
  FilterXIcon,
  LayersIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  alternarStatusRegraFreteAction,
  excluirRegraFreteAction,
} from "@/app/(dashboard)/logistica-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DeliveryFeeRuleForm } from "./delivery-fee-rule-form";
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

interface DeliveryFeeRulesTabProps {
  slug: string;
  rules: DeliveryFeeRule[];
  isCreateOpen?: boolean;
  onOpenCreateChange?: (open: boolean) => void;
}

const RULE_TYPE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: typeof MapPinIcon; description: string }
> = {
  RADIUS_KM: {
    label: "Raio (km)",
    badgeClass: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15",
    icon: CompassIcon,
    description: "Calculado pela distância em linha reta da loja até o cliente",
  },
  NEIGHBORHOOD: {
    label: "Bairro",
    badgeClass: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15",
    icon: MapPinIcon,
    description: "Identificado pelo nome do bairro informado no endereço",
  },
  CEP_RANGE: {
    label: "Faixa de CEP",
    badgeClass: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15",
    icon: LayersIcon,
    description: "Atribuído com base no CEP inicial e final",
  },
};

const formatCurrency = (value: number | string | null | undefined) => {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? 0)) || 0;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

export function DeliveryFeeRulesTab({
  slug,
  rules: initialRules,
  isCreateOpen,
  onOpenCreateChange,
}: DeliveryFeeRulesTabProps) {
  const [rules, setRules] = useState<DeliveryFeeRule[]>(initialRules);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  // Dialogs
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const createOpen = isCreateOpen !== undefined ? isCreateOpen : internalCreateOpen;
  const setCreateOpen = (open: boolean) => {
    setInternalCreateOpen(open);
    onOpenCreateChange?.(open);
  };

  const [editingRule, setEditingRule] = useState<DeliveryFeeRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<DeliveryFeeRule | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = rule.name.toLowerCase().includes(query);
        const matchesNeighborhood = rule.neighborhood?.toLowerCase().includes(query) ?? false;
        const matchesCep =
          (rule.cepFrom?.includes(query) || rule.cepTo?.includes(query)) ?? false;
        if (!matchesName && !matchesNeighborhood && !matchesCep) return false;
      }

      if (typeFilter !== "ALL" && rule.type !== typeFilter) {
        return false;
      }

      if (statusFilter === "ACTIVE" && !rule.isActive) return false;
      if (statusFilter === "INACTIVE" && rule.isActive) return false;

      return true;
    });
  }, [rules, searchQuery, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRules = useMemo(() => {
    return filteredRules.slice(
      (validCurrentPage - 1) * pageSize,
      validCurrentPage * pageSize,
    );
  }, [filteredRules, validCurrentPage, pageSize]);

  // Metric Stats
  const totalCount = rules.length;

  const isFiltering =
    searchQuery.trim() !== "" || typeFilter !== "ALL" || statusFilter !== "ALL";

  const handleClearFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    setEditingRule(null);
    setCreateOpen(true);
  };

  const handleOpenEdit = (rule: DeliveryFeeRule) => {
    setEditingRule(rule);
  };

  const handleToggleStatus = (rule: DeliveryFeeRule) => {
    const newStatus = !rule.isActive;
    startTransition(async () => {
      try {
        await alternarStatusRegraFreteAction(slug, rule.id, newStatus);
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, isActive: newStatus } : r)),
        );
        toast.success(`Zona "${rule.name}" ${newStatus ? "ativada" : "desativada"} com sucesso.`);
      } catch {
        toast.error("Erro ao alterar status da zona.");
      }
    });
  };

  const handleDelete = () => {
    if (!deletingRule) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("ruleId", deletingRule.id);
        await excluirRegraFreteAction(slug, fd);
        setRules((prev) => prev.filter((r) => r.id !== deletingRule.id));
        toast.success(`Zona "${deletingRule.name}" removida com sucesso.`);
        setDeletingRule(null);
      } catch {
        toast.error("Erro ao excluir zona.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Table Card ─────────────────────────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {/* Filtros da Tabela de Zonas de Frete */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por nome da zona, bairro ou CEP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Selects: Tipo e Status */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-48">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Tipo de zona..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todos os tipos</SelectItem>
                    <SelectItem value="NEIGHBORHOOD">Bairro</SelectItem>
                    <SelectItem value="RADIUS_KM">Raio (km)</SelectItem>
                    <SelectItem value="CEP_RANGE">Faixa de CEP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-36">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="ACTIVE">Apenas Ativas</SelectItem>
                    <SelectItem value="INACTIVE">Inativas</SelectItem>
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
        {filteredRules.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <MapPinIcon size={24} />
            </div>
            <p className="font-display text-base font-semibold text-slate-800">
              {isFiltering ? "Nenhuma zona encontrada para os filtros aplicados." : "Nenhuma zona de frete configurada."}
            </p>
            <p className="max-w-md text-xs text-slate-500">
              {isFiltering
                ? "Tente ajustar o termo de busca ou redefinir os filtros acima."
                : "Cadastre zonas por bairro ou raio em km para cobrar frete justo e automático."}
            </p>
            {!isFiltering && (
              <Button
                onClick={handleOpenCreate}
                size="sm"
                className="mt-2 h-9 gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
              >
                <PlusIcon size={14} /> Cadastrar Primeira Zona
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
                    <TableHead className="w-[280px] text-xs font-semibold text-slate-700">Zona / Regra</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Tipo e Critério</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Taxa de Frete</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Pedido Mínimo</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Frete Grátis Acima de</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="w-[80px] text-right text-xs font-semibold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {paginatedRules.map((rule) => {
                    const typeConf = RULE_TYPE_CONFIG[rule.type] ?? RULE_TYPE_CONFIG.NEIGHBORHOOD;
                    const TypeIcon = typeConf.icon;

                    let criterionText = "—";
                    if (rule.type === "RADIUS_KM") {
                      criterionText = `Até ${rule.maxDistanceKm ?? 0} km da loja`;
                    } else if (rule.type === "NEIGHBORHOOD") {
                      criterionText = rule.neighborhood ? `Bairro: ${rule.neighborhood}` : "—";
                    } else if (rule.type === "CEP_RANGE") {
                      criterionText = `${rule.cepFrom ?? "—"} até ${rule.cepTo ?? "—"}`;
                    }

                    return (
                      <TableRow key={rule.id} className="transition-colors hover:bg-slate-50/70">
                        {/* Nome e Ordem */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                              <TypeIcon size={16} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-900">{rule.name}</p>
                              <p className="text-[11px] text-slate-400">
                                Prioridade #{rule.displayOrder ?? 0}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Tipo e Critério */}
                        <TableCell className="py-3.5">
                          <div className="space-y-1">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-normal transition-colors",
                                typeConf.badgeClass,
                              )}
                            >
                              <TypeIcon size={12} className="shrink-0 text-primary" />
                              {typeConf.label}
                            </span>
                            <p className="text-xs text-slate-600">{criterionText}</p>
                          </div>
                        </TableCell>

                        {/* Taxa */}
                        <TableCell className="py-3.5">
                          <span className="font-semibold text-slate-900">
                            {rule.fee === 0 ? (
                              <Badge className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/15">
                                Grátis
                              </Badge>
                            ) : (
                              formatCurrency(rule.fee)
                            )}
                          </span>
                        </TableCell>

                        {/* Pedido Mínimo */}
                        <TableCell className="py-3.5 text-xs text-slate-600">
                          {rule.minimumOrderValue && rule.minimumOrderValue > 0
                            ? formatCurrency(rule.minimumOrderValue)
                            : "Sem mínimo"}
                        </TableCell>

                        {/* Frete Grátis Acima */}
                        <TableCell className="py-3.5 text-xs text-slate-600">
                          {rule.freeDeliveryThreshold && rule.freeDeliveryThreshold > 0 ? (
                            <span className="font-medium text-primary">
                              {formatCurrency(rule.freeDeliveryThreshold)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Switch Status (Padrão Acessos) */}
                        <TableCell className="py-3.5 text-center">
                          <div className="inline-flex items-center gap-2">
                            <Switch
                              checked={rule.isActive}
                              onCheckedChange={() => handleToggleStatus(rule)}
                              disabled={isPending}
                              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
                            />
                            <span
                              className={cn(
                                "text-xs font-medium",
                                rule.isActive ? "text-primary font-semibold" : "text-slate-400",
                              )}
                            >
                              {rule.isActive ? "Ativa" : "Inativa"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Dropdown Ações */}
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
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(rule)}
                                className="gap-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                              >
                                <PencilIcon size={14} className="text-primary" /> Editar dados
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem
                                onClick={() => setDeletingRule(rule)}
                                className="gap-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                              >
                                <Trash2Icon size={14} /> Excluir zona de frete
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
              {paginatedRules.map((rule) => {
                const typeConf = RULE_TYPE_CONFIG[rule.type] ?? RULE_TYPE_CONFIG.NEIGHBORHOOD;
                const TypeIcon = typeConf.icon;

                let criterionText = "—";
                if (rule.type === "RADIUS_KM") {
                  criterionText = `Até ${rule.maxDistanceKm ?? 0} km da loja`;
                } else if (rule.type === "NEIGHBORHOOD") {
                  criterionText = rule.neighborhood ? `Bairro: ${rule.neighborhood}` : "—";
                } else if (rule.type === "CEP_RANGE") {
                  criterionText = `${rule.cepFrom ?? "—"} até ${rule.cepTo ?? "—"}`;
                }

                return (
                  <div key={rule.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                          <TypeIcon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
                          <p className="text-xs text-slate-500">{criterionText}</p>
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
                            onClick={() => handleOpenEdit(rule)}
                            className="gap-2 rounded-lg text-xs font-semibold text-slate-700"
                          >
                            <PencilIcon size={14} className="text-primary" />
                            Editar dados
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100" />
                          <DropdownMenuItem
                            onClick={() => setDeletingRule(rule)}
                            className="gap-2 rounded-lg text-xs font-semibold text-red-600"
                          >
                            <Trash2Icon size={14} />
                            Excluir zona de frete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-slate-900">
                        {rule.fee === 0 ? "Frete Grátis" : formatCurrency(rule.fee)}
                      </span>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            rule.isActive ? "text-primary font-semibold" : "text-slate-400",
                          )}
                        >
                          {rule.isActive ? "Ativa" : "Inativa"}
                        </span>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleStatus(rule)}
                          disabled={isPending}
                          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controles de Paginação & Contador (Padrão Acessos) */}
            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>
                  Exibindo{" "}
                  <strong className="font-semibold text-slate-900">{filteredRules.length}</strong> de{" "}
                  {totalCount} zona{totalCount !== 1 ? "s" : ""} de frete
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
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
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
      </Card>

      {/* ── Dialog Cadastrar Nova Zona de Frete ─────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Cadastrar Nova Zona de Frete
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Defina o critério geográfico e o valor de entrega que será cobrado dos clientes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {createOpen && (
            <DeliveryFeeRuleForm
              slug={slug}
              onSuccess={(created) => {
                setRules((prev) => [created, ...prev]);
                setCreateOpen(false);
              }}
              onCancel={() => setCreateOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog Editar Zona de Frete ───────────────────── */}
      <Dialog
        open={editingRule !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRule(null);
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <PencilIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Editar Zona de Frete
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Atualize o critério geográfico e o valor de entrega da zona.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingRule && (
            <DeliveryFeeRuleForm
              key={editingRule.id}
              slug={slug}
              defaultValues={editingRule}
              onSuccess={(updated) => {
                setRules((prev) =>
                  prev.map((r) => (r.id === updated.id ? updated : r)),
                );
                setEditingRule(null);
              }}
              onCancel={() => setEditingRule(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmação Exclusão ───────────────────── */}
      <ConfirmDeleteDialog
        open={Boolean(deletingRule)}
        onOpenChange={(open) => {
          if (!open) setDeletingRule(null);
        }}
        title="Excluir Zona de Frete"
        description={
          <>
            Tem certeza que deseja remover a zona{" "}
            <strong className="text-slate-900 font-semibold">{deletingRule?.name}</strong>? Os clientes deste
            endereço passarão a usar a taxa padrão da loja.
          </>
        }
        confirmLabel="Sim, excluir zona"
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
