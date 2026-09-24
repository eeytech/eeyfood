"use client";

import {
  AlertCircleIcon,
  CheckCheckIcon,
  CheckSquareIcon,
  InfoIcon,
  Loader2Icon,
  MessageSquareIcon,
  SearchIcon,
  SendIcon,
  SmartphoneIcon,
  SparklesIcon,
  SquareIcon,
  UserCheckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CampanhaCustomer {
  id: string;
  name: string;
  phone: string;
  segment: string;
  totalOrders: number;
}

interface Segment {
  value: string;
  label: string;
}

interface CampanhaFormProps {
  segments: Segment[];
  counts: Record<string, number>;
  customers?: CampanhaCustomer[];
  dispatchAction: (formData: FormData) => Promise<{ sent: number; total: number }>;
}

const TEMPLATES = [
  {
    title: "🎉 Desconto de Volta",
    segment: "INACTIVE",
    text: "Oi {nome}! Sentimos sua falta por aqui. Preparamos um presente: 10% de desconto no seu próximo pedido com o cupom VOLTA10. Peça hoje e aproveite!",
  },
  {
    title: "⭐ Benefício VIP",
    segment: "VIP",
    text: "Olá {nome}! Você é um dos nossos clientes mais especiais. Como agradecimento, liberamos frete grátis no seu próximo pedido válido para hoje!",
  },
  {
    title: "🔥 Novidade no Cardápio",
    segment: "ALL",
    text: "Oi {nome}! Tem novidade quentinha no nosso cardápio hoje. Acesse nosso cardápio digital e venha experimentar!",
  },
];

const SEGMENT_BADGES: Record<string, { label: string; className: string }> = {
  ALL: { label: "Todos", className: "bg-slate-100 text-slate-700" },
  NEW: { label: "Novo", className: "bg-blue-100 text-blue-700 border-blue-200" },
  VIP: { label: "VIP", className: "bg-amber-100 text-amber-700 border-amber-200" },
  LOYAL: { label: "Leal", className: "bg-purple-100 text-purple-700 border-purple-200" },
  AT_RISK: { label: "Em Risco", className: "bg-orange-100 text-orange-700 border-orange-200" },
  CHURNED: { label: "Inativo", className: "bg-rose-100 text-rose-700 border-rose-200" },
  INACTIVE: { label: "Inativo", className: "bg-rose-100 text-rose-700 border-rose-200" },
  RECOVERED: { label: "Recuperado", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function CampanhaForm({
  segments,
  counts,
  customers = [],
  dispatchAction,
}: CampanhaFormProps) {
  const [targetType, setTargetType] = useState<"SEGMENT" | "SPECIFIC">("SEGMENT");
  const [segment, setSegment] = useState("ALL");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [searchContact, setSearchContact] = useState("");
  const [contactSegmentFilter, setContactSegmentFilter] = useState("ALL");

  const [message, setMessage] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filtered contacts in "SPECIFIC" mode
  const filteredContacts = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        !searchContact.trim() ||
        c.name.toLowerCase().includes(searchContact.toLowerCase()) ||
        c.phone.replace(/\D/g, "").includes(searchContact.replace(/\D/g, ""));

      const matchesSegment =
        contactSegmentFilter === "ALL" || c.segment === contactSegmentFilter;

      return matchesSearch && matchesSegment;
    });
  }, [customers, searchContact, contactSegmentFilter]);

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      filteredContacts.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedCustomerIds(new Set());
  };

  const totalRecipients =
    targetType === "SPECIFIC"
      ? selectedCustomerIds.size
      : counts[segment] ?? 0;

  const currentSegmentLabel =
    segments.find((s) => s.value === segment)?.label ?? segment;

  // Selected contact objects
  const selectedCustomers = useMemo(() => {
    return customers.filter((c) => selectedCustomerIds.has(c.id));
  }, [customers, selectedCustomerIds]);

  // Dynamic preview name (first selected contact or "Maria")
  const sampleName = useMemo(() => {
    if (targetType === "SPECIFIC" && selectedCustomers.length > 0) {
      return selectedCustomers[0].name.split(" ")[0];
    }
    return "Maria";
  }, [targetType, selectedCustomers]);

  const previewText = message
    ? message.replace(/{nome}/gi, sampleName)
    : `Olá ${sampleName}! Sua mensagem personalizada de WhatsApp aparecerá aqui em tempo real.`;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalRecipients === 0) {
      if (targetType === "SPECIFIC") {
        toast.error("Por favor, selecione pelo menos um contato para o envio.");
      } else {
        toast.error("Nenhum cliente disponível neste segmento para envio.");
      }
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      toast.error("Por favor, digite uma mensagem válida de pelo menos 5 caracteres.");
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleExecuteDispatch = () => {
    setIsConfirmOpen(false);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("targetType", targetType);
        fd.append("message", message);

        if (targetType === "SPECIFIC") {
          fd.append("specificIds", Array.from(selectedCustomerIds).join(","));
          selectedCustomerIds.forEach((id) => fd.append("customerIds", id));
        } else {
          fd.append("segment", segment);
        }

        const result = await dispatchAction(fd);
        toast.success(
          `Campanha enviada com sucesso para ${result.sent} de ${result.total} clientes!`,
        );
        setMessage("");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao disparar campanha.",
        );
      }
    });
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Dispatch Form (7 cols on desktop) */}
        <div className="lg:col-span-7">
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-slate-900 p-1.5 text-white">
                  <SendIcon size={16} />
                </div>
                <div>
                  <CardTitle className="font-display text-base font-semibold text-slate-900">
                    Novo Disparo de Mensagem
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Escolha entre segmentação por grupo ou contatos específicos para enviar mensagens via WhatsApp.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <form onSubmit={handleOpenConfirm} className="space-y-4">
                {/* ── Mode Switcher: Segment vs Specific Contacts ── */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Modo de Envio
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setTargetType("SEGMENT")}
                      className={cn(
                        "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all",
                        targetType === "SEGMENT"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      <UsersIcon size={14} />
                      Por Segmento
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetType("SPECIFIC")}
                      className={cn(
                        "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all",
                        targetType === "SPECIFIC"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      <UserCheckIcon size={14} />
                      Contatos Específicos
                      {selectedCustomerIds.size > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                          {selectedCustomerIds.size}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Mode 1: Segment Selector ── */}
                {targetType === "SEGMENT" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="segment" className="text-xs font-semibold text-slate-700">
                      Público-Alvo / Segmento
                    </Label>
                    <Select
                      name="segment"
                      value={segment}
                      onValueChange={setSegment}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-700 focus:bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                        {segments.map((seg) => (
                          <SelectItem
                            key={seg.value}
                            value={seg.value}
                            className="text-xs"
                          >
                            <div className="flex items-center justify-between gap-3 w-full">
                              <span>{seg.label}</span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                ({counts[seg.value] ?? 0} clientes)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ── Mode 2: Specific Contacts Picker ── */}
                {targetType === "SPECIFIC" && (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <UserCheckIcon size={14} className="text-primary" />
                        Escolher Contatos da Base
                      </Label>
                      <Badge
                        variant={selectedCustomerIds.size > 0 ? "default" : "outline"}
                        className={cn(
                          "text-[11px] font-semibold",
                          selectedCustomerIds.size > 0
                            ? "bg-slate-900 text-white"
                            : "text-slate-500",
                        )}
                      >
                        {selectedCustomerIds.size} selecionado{selectedCustomerIds.size !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    {/* Search & Filter Controls */}
                    <div className="grid gap-2 sm:grid-cols-12">
                      <div className="relative sm:col-span-8">
                        <SearchIcon
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <Input
                          placeholder="Buscar por nome ou telefone..."
                          value={searchContact}
                          onChange={(e) => setSearchContact(e.target.value)}
                          className="h-9 pl-8 pr-8 rounded-lg border-slate-200 bg-white text-xs focus:border-slate-400"
                        />
                        {searchContact && (
                          <button
                            type="button"
                            onClick={() => setSearchContact("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <XIcon size={13} />
                          </button>
                        )}
                      </div>

                      <div className="sm:col-span-4">
                        <Select
                          value={contactSegmentFilter}
                          onValueChange={setContactSegmentFilter}
                        >
                          <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700">
                            <SelectValue placeholder="Filtrar grupo" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 bg-white text-xs shadow-lg">
                            <SelectItem value="ALL">Todos os grupos</SelectItem>
                            <SelectItem value="VIP">VIP</SelectItem>
                            <SelectItem value="NEW">Novos</SelectItem>
                            <SelectItem value="LOYAL">Leais</SelectItem>
                            <SelectItem value="AT_RISK">Em Risco</SelectItem>
                            <SelectItem value="INACTIVE">Inativos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Quick Selection Helpers */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>
                        {filteredContacts.length} contato{filteredContacts.length !== 1 ? "s" : ""} encontrado{filteredContacts.length !== 1 ? "s" : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        {filteredContacts.length > 0 && (
                          <button
                            type="button"
                            onClick={selectAllVisible}
                            className="text-primary hover:underline font-medium"
                          >
                            Selecionar visíveis
                          </button>
                        )}
                        {selectedCustomerIds.size > 0 && (
                          <>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={clearSelection}
                              className="text-rose-600 hover:underline font-medium"
                            >
                              Limpar seleção
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Scrollable Contacts List */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white shadow-inner">
                      {filteredContacts.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          Nenhum contato encontrado com os filtros atuais.
                        </div>
                      ) : (
                        filteredContacts.map((contact) => {
                          const isSelected = selectedCustomerIds.has(contact.id);
                          const segBadge =
                            SEGMENT_BADGES[contact.segment] ?? SEGMENT_BADGES.ALL;

                          return (
                            <div
                              key={contact.id}
                              onClick={() => toggleSelectCustomer(contact.id)}
                              className={cn(
                                "flex items-center justify-between gap-3 p-2.5 text-xs cursor-pointer transition-colors select-none",
                                isSelected
                                  ? "bg-slate-50/90 font-medium"
                                  : "hover:bg-slate-50/50",
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="text-slate-700">
                                  {isSelected ? (
                                    <CheckSquareIcon
                                      size={16}
                                      className="text-slate-900"
                                    />
                                  ) : (
                                    <SquareIcon
                                      size={16}
                                      className="text-slate-300"
                                    />
                                  )}
                                </div>
                                <div className="truncate">
                                  <p className="text-slate-900 font-semibold truncate">
                                    {contact.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-mono">
                                    {formatPhone(contact.phone)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                    segBadge.className,
                                  )}
                                >
                                  {segBadge.label}
                                </span>
                                <span className="text-[10px] text-slate-400 hidden sm:inline">
                                  {contact.totalOrders} pedido{contact.totalOrders !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Selected Chips Bar */}
                    {selectedCustomers.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-200">
                        <p className="text-[11px] font-semibold text-slate-600">
                          Contatos selecionados ({selectedCustomers.length}):
                        </p>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {selectedCustomers.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 shadow-2xs"
                            >
                              <span className="max-w-[120px] truncate">{c.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectCustomer(c.id);
                                }}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <XIcon size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Template quick pills */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <SparklesIcon size={13} className="text-amber-500" />
                      Modelos Rápidos de Mensagem
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Clique para preencher
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMessage(tmpl.text);
                          if (
                            targetType === "SEGMENT" &&
                            counts[tmpl.segment] !== undefined
                          ) {
                            setSegment(tmpl.segment);
                          }
                        }}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      >
                        {tmpl.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message" className="text-xs font-semibold text-slate-700">
                      Conteúdo da Mensagem
                    </Label>
                    <span className="text-[11px] text-slate-400">
                      Variável disponível: <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-700">{"{nome}"}</code>
                    </span>
                  </div>
                  <Textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Oi {nome}! Sentimos sua falta. Que tal pedir hoje e ganhar um desconto especial?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    minLength={5}
                    className="rounded-xl border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white resize-none"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                    <span>{message.length} caracteres digitados</span>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600">
                      {totalRecipients} {targetType === "SPECIFIC" ? "contato" : "cliente"}{totalRecipients !== 1 ? "s" : ""} selecionado{totalRecipients !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isPending || !message.trim() || totalRecipients === 0}
                  className="h-10 w-full gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                  {isPending ? (
                    <>
                      <Loader2Icon size={16} className="animate-spin" />
                      <span>Enviando mensagens via WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <SendIcon size={16} />
                      <span>
                        {targetType === "SPECIFIC"
                          ? `Disparar para ${totalRecipients} Contato${totalRecipients !== 1 ? "s" : ""} Selecionado${totalRecipients !== 1 ? "s" : ""}`
                          : `Disparar Campanha para ${totalRecipients} Clientes`}
                      </span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live WhatsApp Preview & Best Practices (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Live Mobile WhatsApp Mockup */}
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <SmartphoneIcon size={14} className="text-slate-500" />
                  Prévia no WhatsApp
                </CardTitle>
                <span className="text-[11px] text-slate-400">
                  {targetType === "SPECIFIC" && selectedCustomers.length > 0
                    ? `Simulação para ${sampleName}`
                    : "Simulação de cliente"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 bg-slate-100/70">
              {/* WhatsApp Chat Bubble Mockup */}
              <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-slate-200/60 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[11px] font-bold">
                    EEY
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Seu Restaurante</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Conta Comercial Verificada</p>
                  </div>
                </div>

                <div className="text-xs whitespace-pre-wrap leading-relaxed text-slate-800">
                  {previewText}
                </div>

                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                  <span>14:30</span>
                  <CheckCheckIcon size={13} className="text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices Guide Card */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <InfoIcon size={14} className="text-blue-500" />
                Diretrizes de Envio & Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <div className="rounded bg-blue-50 p-1 text-blue-600 shrink-0 mt-0.5">
                  <MessageSquareIcon size={12} />
                </div>
                <p>
                  <strong className="text-slate-900">Envio Personalizado:</strong> Você pode disparar para um cliente individual ou criar seleções personalizadas para mensagens diretas de pós-venda.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded bg-emerald-50 p-1 text-emerald-600 shrink-0 mt-0.5">
                  <SparklesIcon size={12} />
                </div>
                <p>
                  <strong className="text-slate-900">Variável de Nome:</strong> A tag <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-800">{"{nome}"}</code> é substituída pelo primeiro nome do cliente na hora do disparo.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded bg-amber-50 p-1 text-amber-600 shrink-0 mt-0.5">
                  <AlertCircleIcon size={12} />
                </div>
                <p>
                  <strong className="text-slate-900">Intervalo Anti-Bloqueio:</strong> O sistema adiciona automaticamente uma pausa entre cada disparo para manter a integridade e saúde do chip WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 bg-white p-6 shadow-xl">
          <DialogHeader>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm mb-2">
              <SendIcon size={20} />
            </div>
            <DialogTitle className="font-display text-lg font-bold text-center text-slate-900">
              Confirmar Disparo de Mensagem
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-slate-500">
              {targetType === "SPECIFIC" ? (
                <>
                  Você está prestes a disparar esta mensagem via WhatsApp para{" "}
                  <strong className="text-slate-900 font-semibold">{totalRecipients}</strong> contato{totalRecipients !== 1 ? "s" : ""} específico{totalRecipients !== 1 ? "s" : ""}.
                </>
              ) : (
                <>
                  Você está prestes a disparar esta mensagem via WhatsApp para{" "}
                  <strong className="text-slate-900 font-semibold">{totalRecipients}</strong> cliente{totalRecipients !== 1 ? "s" : ""} no segmento{" "}
                  <strong className="text-slate-900 font-semibold">&ldquo;{currentSegmentLabel}&rdquo;</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* If specific, list recipients */}
          {targetType === "SPECIFIC" && selectedCustomers.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1 max-h-28 overflow-y-auto">
              <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">
                Destinatários:
              </p>
              {selectedCustomers.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-slate-600">
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="font-mono text-slate-400 text-[11px]">{formatPhone(c.phone)}</span>
                </div>
              ))}
              {selectedCustomers.length > 5 && (
                <p className="text-[11px] text-slate-400 italic pt-0.5">
                  ...e mais {selectedCustomers.length - 5} contatos selecionados.
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto">
            {previewText}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              className="h-10 rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleExecuteDispatch}
              className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <SendIcon size={14} />
              Confirmar e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
