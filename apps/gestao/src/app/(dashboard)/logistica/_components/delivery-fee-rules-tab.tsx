"use client";

import type { DeliveryFeeRule } from "@fsw/db";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CompassIcon,
  FilterXIcon,
  LayersIcon,
  Loader2Icon,
  MapPinIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  TruckIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  alternarStatusRegraFreteAction,
  atualizarRegraFreteAction,
  criarRegraFreteAction,
  excluirRegraFreteAction,
} from "@/app/(dashboard)/logistica-actions";
import { Badge } from "@/components/ui/badge";
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

interface DeliveryFeeRulesTabProps {
  slug: string;
  rules: DeliveryFeeRule[];
}

const RULE_TYPE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: typeof MapPinIcon; description: string }
> = {
  RADIUS_KM: {
    label: "Raio (km)",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200/80 hover:bg-blue-100",
    icon: CompassIcon,
    description: "Calculado pela distância em linha reta da loja até o cliente",
  },
  NEIGHBORHOOD: {
    label: "Bairro",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100",
    icon: MapPinIcon,
    description: "Identificado pelo nome do bairro informado no endereço",
  },
  CEP_RANGE: {
    label: "Faixa de CEP",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200/80 hover:bg-purple-100",
    icon: LayersIcon,
    description: "Atribuído com base no CEP inicial e final",
  },
};

const formatCurrency = (value: number | string | null | undefined) => {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? 0)) || 0;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

interface RuleFormData {
  name: string;
  type: "RADIUS_KM" | "NEIGHBORHOOD" | "CEP_RANGE";
  fee: string;
  minimumOrderValue: string;
  freeDeliveryThreshold: string;
  maxDistanceKm: string;
  neighborhood: string;
  cepFrom: string;
  cepTo: string;
  displayOrder: string;
  isActive: boolean;
}

const defaultFormData: RuleFormData = {
  name: "",
  type: "NEIGHBORHOOD",
  fee: "5.00",
  minimumOrderValue: "0",
  freeDeliveryThreshold: "",
  maxDistanceKm: "",
  neighborhood: "",
  cepFrom: "",
  cepTo: "",
  displayOrder: "0",
  isActive: true,
};

export function DeliveryFeeRulesTab({ slug, rules: initialRules }: DeliveryFeeRulesTabProps) {
  const [rules, setRules] = useState<DeliveryFeeRule[]>(initialRules);
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DeliveryFeeRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<DeliveryFeeRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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

  // Metric Stats
  const totalCount = rules.length;
  const activeCount = rules.filter((r) => r.isActive).length;
  const neighborhoodCount = rules.filter((r) => r.type === "NEIGHBORHOOD").length;
  const radiusCount = rules.filter((r) => r.type === "RADIUS_KM").length;

  const isFiltering =
    searchQuery.trim() !== "" || typeFilter !== "ALL" || statusFilter !== "ALL";

  const handleClearFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
  };

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (rule: DeliveryFeeRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      type: rule.type,
      fee: String(rule.fee),
      minimumOrderValue: String(rule.minimumOrderValue ?? 0),
      freeDeliveryThreshold:
        rule.freeDeliveryThreshold != null ? String(rule.freeDeliveryThreshold) : "",
      maxDistanceKm: rule.maxDistanceKm != null ? String(rule.maxDistanceKm) : "",
      neighborhood: rule.neighborhood ?? "",
      cepFrom: rule.cepFrom ?? "",
      cepTo: rule.cepTo ?? "",
      displayOrder: String(rule.displayOrder ?? 0),
      isActive: rule.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("isActive", formData.isActive ? "true" : "false");
    fd.set("type", formData.type);

    startTransition(async () => {
      try {
        if (editingRule) {
          fd.set("ruleId", editingRule.id);
          await atualizarRegraFreteAction(slug, fd);
          setRules((prev) =>
            prev.map((r) =>
              r.id === editingRule.id
                ? {
                    ...r,
                    name: fd.get("name") as string,
                    type: formData.type,
                    fee: parseFloat(fd.get("fee") as string) || 0,
                    minimumOrderValue:
                      parseFloat(fd.get("minimumOrderValue") as string) || 0,
                    freeDeliveryThreshold: fd.get("freeDeliveryThreshold")
                      ? parseFloat(fd.get("freeDeliveryThreshold") as string) || null
                      : null,
                    maxDistanceKm: fd.get("maxDistanceKm")
                      ? parseFloat(fd.get("maxDistanceKm") as string) || null
                      : null,
                    neighborhood: (fd.get("neighborhood") as string) || null,
                    cepFrom: (fd.get("cepFrom") as string) || null,
                    cepTo: (fd.get("cepTo") as string) || null,
                    isActive: formData.isActive,
                  }
                : r,
            ),
          );
          toast.success("Zona de frete atualizada com sucesso!");
        } else {
          await criarRegraFreteAction(slug, fd);
          toast.success("Nova zona de frete criada com sucesso!");
          // Recarrega lista ou adiciona otimisticamente
          window.location.reload();
        }
        setIsDialogOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar zona.");
      }
    });
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
    <div className="space-y-6">
      {/* ── Page Header (Padrão Usuários) ───────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <MapPinIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Zonas e Regras de Frete
            </h1>
            <p className="text-sm text-slate-500">
              Configure taxas dinâmicas por bairro, raio em km ou faixa de CEP aplicadas automaticamente no cardápio.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <PlusIcon size={16} />
          <span>Nova Zona de Frete</span>
        </Button>
      </div>

      {/* ── Metric Cards (Padrão 4 Colunas Usuários) ────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Zonas
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <LayersIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeCount} ativas para entrega
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Zonas por Bairro
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <MapPinIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {neighborhoodCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Mapeadas por nome
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Zonas por Raio
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <CompassIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
              {radiusCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Distância em km
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status Operacional
              </span>
              <div className="rounded-lg bg-teal-100 p-1.5 text-teal-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-teal-700">
              {activeCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalCount - activeCount > 0
                ? `${totalCount - activeCount} desativada(s)`
                : "100% ativas no sistema"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters Card (Padrão Usuários) ───────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
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
            </div>
          </div>

          {/* Bottom summary / clear filters bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Exibindo <strong>{filteredRules.length}</strong> de <strong>{totalCount}</strong>{" "}
              zonas de frete
            </span>
            {isFiltering && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 gap-1 px-2 text-xs text-slate-600 hover:text-slate-900"
              >
                <FilterXIcon size={13} /> Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Table Card (Padrão Usuários) ─────────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
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
                className="mt-2 h-9 gap-1.5 rounded-full bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <PlusIcon size={14} /> Cadastrar Primeira Zona
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-700">Zona / Regra</TableHead>
                  <TableHead className="font-semibold text-slate-700">Tipo & Critério</TableHead>
                  <TableHead className="font-semibold text-slate-700">Taxa de Frete</TableHead>
                  <TableHead className="font-semibold text-slate-700">Pedido Mínimo</TableHead>
                  <TableHead className="font-semibold text-slate-700">Frete Grátis Acima de</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">Ativa</TableHead>
                  <TableHead className="w-16 text-right font-semibold text-slate-700">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => {
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
                    <TableRow key={rule.id} className="transition-colors hover:bg-slate-50/50">
                      {/* Nome e Ordem */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <TypeIcon size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{rule.name}</p>
                            <p className="text-[11px] text-slate-400">
                              Prioridade #{rule.displayOrder ?? 0}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Tipo e Critério */}
                      <TableCell>
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${typeConf.badgeClass}`}
                          >
                            <TypeIcon size={12} />
                            {typeConf.label}
                          </span>
                          <p className="text-xs text-slate-600">{criterionText}</p>
                        </div>
                      </TableCell>

                      {/* Taxa */}
                      <TableCell>
                        <span className="font-semibold text-slate-900">
                          {rule.fee === 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">
                              Grátis
                            </Badge>
                          ) : (
                            formatCurrency(rule.fee)
                          )}
                        </span>
                      </TableCell>

                      {/* Pedido Mínimo */}
                      <TableCell className="text-xs text-slate-600">
                        {rule.minimumOrderValue && rule.minimumOrderValue > 0
                          ? formatCurrency(rule.minimumOrderValue)
                          : "Sem mínimo"}
                      </TableCell>

                      {/* Frete Grátis Acima */}
                      <TableCell className="text-xs text-slate-600">
                        {rule.freeDeliveryThreshold && rule.freeDeliveryThreshold > 0 ? (
                          <span className="font-medium text-emerald-700">
                            {formatCurrency(rule.freeDeliveryThreshold)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>

                      {/* Switch Ativa */}
                      <TableCell className="text-center">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleStatus(rule)}
                          disabled={isPending}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </TableCell>

                      {/* Dropdown Ações */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-slate-100"
                            >
                              <MoreHorizontalIcon size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 rounded-xl border-slate-200 bg-white p-1.5 shadow-lg"
                          >
                            <DropdownMenuLabel className="px-2 py-1 text-xs text-slate-400">
                              Gerenciar Zona
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(rule)}
                              className="cursor-pointer gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 focus:bg-slate-50"
                            >
                              <PencilIcon size={14} /> Editar dados
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-slate-100" />
                            <DropdownMenuItem
                              onClick={() => setDeletingRule(rule)}
                              className="cursor-pointer gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 focus:bg-rose-50"
                            >
                              <Trash2Icon size={14} /> Excluir zona
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
        )}
      </Card>

      {/* ── Dialog Criar / Editar (Padrão Usuários) ───────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              {editingRule ? "Editar Zona de Frete" : "Nova Zona de Frete"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina o critério geográfico e o valor de entrega que será cobrado dos clientes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome da Zona */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                Nome de identificação *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Centro, Zona Sul, Até 5km..."
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                required
              />
            </div>

            {/* Tipo de Regra */}
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-xs font-semibold text-slate-700">
                Critério de aplicação *
              </Label>
              <Select
                value={formData.type}
                onValueChange={(val: "RADIUS_KM" | "NEIGHBORHOOD" | "CEP_RANGE") =>
                  setFormData((f) => ({ ...f, type: val }))
                }
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white">
                  <SelectValue placeholder="Selecione o critério" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                  <SelectItem value="NEIGHBORHOOD">Bairro (Identificação por nome)</SelectItem>
                  <SelectItem value="RADIUS_KM">Raio em KM (Linha reta da loja)</SelectItem>
                  <SelectItem value="CEP_RANGE">Faixa de CEP (Faixa numérica)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos condicionais por Tipo */}
            {formData.type === "NEIGHBORHOOD" && (
              <div className="space-y-1.5">
                <Label htmlFor="neighborhood" className="text-xs font-semibold text-slate-700">
                  Nome do Bairro *
                </Label>
                <Input
                  id="neighborhood"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData((f) => ({ ...f, neighborhood: e.target.value }))}
                  placeholder="Ex: Centro, Vila Nova, Jardim das Flores..."
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  A comparação ignora acentuação e maiúsculas/minúsculas automaticamente.
                </p>
              </div>
            )}

            {formData.type === "RADIUS_KM" && (
              <div className="space-y-1.5">
                <Label htmlFor="maxDistanceKm" className="text-xs font-semibold text-slate-700">
                  Distância Máxima (km) *
                </Label>
                <Input
                  id="maxDistanceKm"
                  name="maxDistanceKm"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.maxDistanceKm}
                  onChange={(e) => setFormData((f) => ({ ...f, maxDistanceKm: e.target.value }))}
                  placeholder="Ex: 5"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  A distância é calculada das coordenadas cadastradas da loja até o endereço do cliente.
                </p>
              </div>
            )}

            {formData.type === "CEP_RANGE" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cepFrom" className="text-xs font-semibold text-slate-700">
                    CEP Inicial *
                  </Label>
                  <Input
                    id="cepFrom"
                    name="cepFrom"
                    value={formData.cepFrom}
                    onChange={(e) => setFormData((f) => ({ ...f, cepFrom: e.target.value }))}
                    placeholder="00000-000"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cepTo" className="text-xs font-semibold text-slate-700">
                    CEP Final *
                  </Label>
                  <Input
                    id="cepTo"
                    name="cepTo"
                    value={formData.cepTo}
                    onChange={(e) => setFormData((f) => ({ ...f, cepTo: e.target.value }))}
                    placeholder="99999-999"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                    required
                  />
                </div>
              </div>
            )}

            {/* Valores financeiros */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fee" className="text-xs font-semibold text-slate-700">
                  Taxa de Entrega (R$) *
                </Label>
                <Input
                  id="fee"
                  name="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fee}
                  onChange={(e) => setFormData((f) => ({ ...f, fee: e.target.value }))}
                  placeholder="0.00"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-900 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minimumOrderValue" className="text-xs font-semibold text-slate-700">
                  Pedido Mínimo (R$)
                </Label>
                <Input
                  id="minimumOrderValue"
                  name="minimumOrderValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minimumOrderValue}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, minimumOrderValue: e.target.value }))
                  }
                  placeholder="0.00"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                />
              </div>
            </div>

            {/* Frete Grátis Acima de */}
            <div className="space-y-1.5">
              <Label htmlFor="freeDeliveryThreshold" className="text-xs font-semibold text-slate-700">
                Frete Grátis a partir de (R$) <span className="font-normal text-slate-400">(opcional)</span>
              </Label>
              <Input
                id="freeDeliveryThreshold"
                name="freeDeliveryThreshold"
                type="number"
                step="0.01"
                min="0"
                value={formData.freeDeliveryThreshold}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, freeDeliveryThreshold: e.target.value }))
                }
                placeholder="Ex: 50.00 (deixe em branco se não houver)"
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
              />
            </div>

            {/* Status e Prioridade */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div>
                <Label className="text-xs font-semibold text-slate-800">Zona Ativa no Sistema</Label>
                <p className="text-[11px] text-slate-500">
                  Desative temporariamente sem perder as configurações.
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((f) => ({ ...f, isActive: checked }))}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            <DialogFooter className="gap-2 border-t border-slate-100 pt-4 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-full text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-slate-900 px-6 font-semibold text-white hover:bg-slate-800"
              >
                {isPending && <Loader2Icon size={14} className="mr-2 animate-spin" />}
                {editingRule ? "Salvar Alterações" : "Criar Zona"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmação Exclusão ───────────────────── */}
      <Dialog open={!!deletingRule} onOpenChange={(open) => !open && setDeletingRule(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <Trash2Icon size={20} />
            </div>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Excluir Zona de Frete
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tem certeza que deseja remover a zona{" "}
              <strong className="text-slate-900">{deletingRule?.name}</strong>? Os clientes deste
              endereço passarão a usar a taxa padrão da loja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingRule(null)}
              className="rounded-full text-slate-600"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-full bg-rose-600 font-semibold text-white hover:bg-rose-700"
            >
              {isPending && <Loader2Icon size={14} className="mr-2 animate-spin" />}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
