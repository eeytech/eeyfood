"use client";

import {
  AlertCircleIcon,
  BoxesIcon,
  CheckCircle2Icon,
  ChefHatIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CircleDollarSignIcon,
  ClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  FilterXIcon,
  HeadphonesIcon,
  HelpCircleIcon,
  LifeBuoyIcon,
  LoaderCircleIcon,
  MailIcon,
  MessageSquareIcon,
  MonitorSmartphoneIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

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
  adicionarMensagemChamadoAction,
  atualizarStatusChamadoAction,
  criarChamadoAction,
  excluirChamadoAction,
} from "./suporte-actions";
import type {
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "./suporte-types";

interface SuporteClientProps {
  slug: string;
  initialTickets: SupportTicket[];
}

interface StatusConfig {
  label: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
}

const STATUS_CONFIG: Record<TicketStatus, StatusConfig> = {
  OPEN: {
    label: "Aberto",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200/80 hover:bg-blue-100",
    icon: AlertCircleIcon,
    description: "Aguardando primeiro retorno da equipe técnica",
  },
  IN_PROGRESS: {
    label: "Em Análise",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100",
    icon: ClockIcon,
    description: "Um técnico está investigando a solicitação",
  },
  WAITING_CUSTOMER: {
    label: "Aguardando Retorno",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200/80 hover:bg-purple-100",
    icon: MessageSquareIcon,
    description: "Aguardando resposta ou dados adicionais do restaurante",
  },
  RESOLVED: {
    label: "Resolvido",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100",
    icon: CheckCircle2Icon,
    description: "Chamado solucionado com sucesso",
  },
  CLOSED: {
    label: "Encerrado",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    icon: CheckCircle2Icon,
    description: "Chamado finalizado e arquivado",
  },
};

interface PriorityConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
}

const PRIORITY_CONFIG: Record<TicketPriority, PriorityConfig> = {
  LOW: {
    label: "Baixa",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
    description: "Dúvidas gerais, melhorias ou pequenos ajustes",
  },
  NORMAL: {
    label: "Média",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
    description: "Impacto moderado que não impede a operação",
  },
  HIGH: {
    label: "Alta",
    badgeClass: "bg-orange-50 text-orange-800 border-orange-200",
    dotClass: "bg-orange-500",
    description: "Dificulta pedidos, entregas ou rotinas fiscais",
  },
  URGENT: {
    label: "Urgente",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    dotClass: "bg-rose-600",
    description: "Operação parada, caixa travado ou PDV fora do ar",
  },
};

interface CategoryConfig {
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
}

const CATEGORY_CONFIG: Record<TicketCategory, CategoryConfig> = {
  PDV_CAIXA: {
    label: "PDV & Caixa",
    shortLabel: "PDV & Caixa",
    icon: MonitorSmartphoneIcon,
    description: "Abertura, fechamento, vendas e recebimentos no balcão",
  },
  KDS_COZINHA: {
    label: "Cozinha & KDS",
    shortLabel: "Cozinha (KDS)",
    icon: ChefHatIcon,
    description: "Painel de produção, tempos de preparo e despacho de pratos",
  },
  CARDAPIO_ESTOQUE: {
    label: "Cardápio & Estoque",
    shortLabel: "Cardápio/Estoque",
    icon: BoxesIcon,
    description: "Categorias, itens, adicionais, fichas técnicas e insumos",
  },
  IMPRESSAO_HARDWARE: {
    label: "Impressoras & Balança",
    shortLabel: "Impressão",
    icon: PrinterIcon,
    description: "Impressoras térmicas de cupom, Web Serial e periféricos",
  },
  FINANCEIRO_FISCAL: {
    label: "Financeiro & Fiscal (NFC-e)",
    shortLabel: "Fiscal (NFC-e)",
    icon: CircleDollarSignIcon,
    description: "Emissão de NFC-e/NF-e, contingência SEFAZ e contas bancárias",
  },
  INTEGRACOES: {
    label: "Integrações (iFood, WhatsApp)",
    shortLabel: "Integrações",
    icon: SparklesIcon,
    description: "iFood, bot de WhatsApp, notificações e sincronizações",
  },
  OUTRO: {
    label: "Dúvidas Gerais / Outro",
    shortLabel: "Geral",
    icon: HelpCircleIcon,
    description: "Orientações gerais, cadastros e suporte operacional",
  },
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
};

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "Data indisp.";
  }
};

const FAQS = [
  {
    q: "Como configurar a impressão automática para a cozinha?",
    a: "Acesse Cardápio > Setores de Produção, vincule as categorias desejadas ao setor da cozinha e ative a impressão contínua via Web Serial no navegador do PDV.",
  },
  {
    q: "O que fazer se a emissão de NFC-e ficar temporariamente indisponível?",
    a: "Caso a SEFAZ do seu estado oscile, o sistema entra em contingência offline de forma automática e retransmite as notas fiscais assim que a conexão for reestabelecida.",
  },
  {
    q: "Como pausar ou definir horários de funcionamento do cardápio online?",
    a: "Em Configurações > Horários de Funcionamento, você pode marcar a loja como temporariamente pausada ou definir um tempo estendido para o preparo e entrega.",
  },
];

export function SuporteClient({ slug, initialTickets }: SuporteClientProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<SupportTicket | null>(null);

  // Form states
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState<TicketCategory>("PDV_CAIXA");
  const [createPriority, setCreatePriority] = useState<TicketPriority>("NORMAL");
  const [createUserPhone, setCreateUserPhone] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [replyMessage, setReplyMessage] = useState("");

  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Pagination (matching usuarios-client pattern)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Search term
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesProtocol = t.protocol.toLowerCase().includes(query);
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description.toLowerCase().includes(query);
        const matchesUser = t.userName.toLowerCase().includes(query);
        const matchesEmail = t.userEmail.toLowerCase().includes(query);
        if (
          !matchesProtocol &&
          !matchesTitle &&
          !matchesDesc &&
          !matchesUser &&
          !matchesEmail
        ) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "ALL" && t.category !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE") {
          if (t.status === "RESOLVED" || t.status === "CLOSED") return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, searchQuery, categoryFilter, statusFilter, priorityFilter]);

  // Metric stats
  const totalCount = tickets.length;
  const inProgressCount = tickets.filter(
    (t) =>
      t.status === "OPEN" ||
      t.status === "IN_PROGRESS" ||
      t.status === "WAITING_CUSTOMER",
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "RESOLVED" || t.status === "CLOSED",
  ).length;
  const urgentCount = tickets.filter(
    (t) =>
      t.priority === "URGENT" &&
      t.status !== "RESOLVED" &&
      t.status !== "CLOSED",
  ).length;

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

  const isFiltering =
    searchQuery.trim() !== "" ||
    categoryFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL";

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCurrentPage(1);
  };

  // Handlers
  const handleOpenCreate = () => {
    setCreateError(null);
    setCreateTitle("");
    setCreateCategory("PDV_CAIXA");
    setCreatePriority("NORMAL");
    setCreateUserPhone("");
    setCreateDescription("");
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);

    const formData = new FormData();
    formData.set("title", createTitle);
    formData.set("description", createDescription);
    formData.set("category", createCategory);
    formData.set("priority", createPriority);
    if (createUserPhone.trim()) {
      formData.set("userPhone", createUserPhone.trim());
    }
    formData.set("restaurantSlug", slug);

    startTransition(async () => {
      const result = await criarChamadoAction(null, formData);

      if (result.error) {
        setCreateError(result.error);
        toast.error(result.error);
        return;
      }

      // Optimistic addition
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const newProtocol = `#SUP-${randomNum}`;
      const now = new Date().toISOString();

      const optimisticTicket: SupportTicket = {
        id: result.ticketId || `tkt-${Date.now()}`,
        protocol: newProtocol,
        title: createTitle,
        description: createDescription,
        category: createCategory,
        priority: createPriority,
        status: "OPEN",
        userName: "Administrador",
        userEmail: "contato@restaurante.com",
        userPhone: createUserPhone.trim() || undefined,
        restaurantSlug: slug,
        createdAt: now,
        updatedAt: now,
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: "USER",
            senderName: "Administrador",
            content: createDescription,
            createdAt: now,
          },
        ],
      };

      setTickets((prev) => [optimisticTicket, ...prev]);
      setIsCreateOpen(false);
      toast.success("Novo chamado de suporte cadastrado com sucesso!");
    });
  };

  const handleUpdateStatus = (ticketId: string, newStatus: TicketStatus) => {
    startTransition(async () => {
      const result = await atualizarStatusChamadoAction(ticketId, newStatus);
      if (!result.success) {
        toast.error(result.error || "Não foi possível atualizar o chamado.");
        return;
      }

      const now = new Date().toISOString();
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, status: newStatus, updatedAt: now } : t,
        ),
      );

      setSelectedTicket((prev) =>
        prev && prev.id === ticketId
          ? { ...prev, status: newStatus, updatedAt: now }
          : prev,
      );

      const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Status do chamado alterado para "${statusLabel}".`);
    });
  };

  const handleSendReply = () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    const content = replyMessage.trim();
    const ticketId = selectedTicket.id;

    startTransition(async () => {
      const result = await adicionarMensagemChamadoAction(ticketId, content);
      if (!result.success) {
        toast.error(result.error || "Não foi possível enviar a resposta.");
        return;
      }

      const now = new Date().toISOString();
      const newMessage = {
        id: `msg-${Date.now()}`,
        sender: "USER" as const,
        senderName: selectedTicket.userName || "Administrador",
        content,
        createdAt: now,
      };

      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === ticketId) {
            return {
              ...t,
              updatedAt: now,
              status:
                t.status === "RESOLVED" || t.status === "CLOSED"
                  ? "IN_PROGRESS"
                  : t.status,
              messages: [...t.messages, newMessage],
            };
          }
          return t;
        }),
      );

      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              updatedAt: now,
              status:
                prev.status === "RESOLVED" || prev.status === "CLOSED"
                  ? "IN_PROGRESS"
                  : prev.status,
              messages: [...prev.messages, newMessage],
            }
          : null,
      );

      setReplyMessage("");
      toast.success("Mensagem enviada com sucesso!");
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingTicket) return;
    const ticketId = deletingTicket.id;

    startTransition(async () => {
      const result = await excluirChamadoAction(ticketId, slug);
      if (!result.success) {
        toast.error(result.error || "Não foi possível excluir o chamado.");
        return;
      }

      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
      setDeletingTicket(null);
      toast.success(`Chamado ${deletingTicket.protocol} removido com sucesso.`);
    });
  };

  const handleCopyProtocol = (protocol: string) => {
    navigator.clipboard.writeText(protocol);
    toast.success(`Protocolo ${protocol} copiado para a área de transferência!`);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <HeadphonesIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Central de Suporte & Ajuda
            </h1>
            <p className="text-sm text-slate-500">
              Acompanhe solicitações técnicas, tire dúvidas operacionais e abra chamados com atendimento ágil.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            asChild
            variant="outline"
            className="h-10 gap-2 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20sistema%20EeyFood"
              target="_blank"
              rel="noopener noreferrer"
            >
              <PhoneIcon size={14} className="text-emerald-600" />
              <span>Plantão WhatsApp</span>
              <ExternalLinkIcon size={12} className="text-slate-400" />
            </a>
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <PlusIcon size={16} />
            <span>Novo Chamado</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Total */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Chamados
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <LifeBuoyIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {inProgressCount} pendente{inProgressCount !== 1 ? "s" : ""} de retorno
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Em Atendimento */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Em Atendimento
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <ClockIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {inProgressCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {urgentCount > 0
                ? `${urgentCount} de prioridade urgente`
                : "Abertos e em análise técnica"}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Resolvidos */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Resolvidos
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {resolvedCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalCount > 0
                ? `${Math.round((resolvedCount / totalCount) * 100)}% de taxa de resolução`
                : "Nenhum histórico"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: SLA */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Tempo Médio (SLA)
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <SparklesIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
              ~15 min
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Atendimento priorizado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters Card ────────────────────────────────── */}
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
                placeholder="Buscar por protocolo, assunto, solicitante ou mensagem..."
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

            {/* Selects: Categoria, Status e Prioridade */}
            <div className="flex flex-wrap items-center gap-2">
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
                    <SelectItem value="ALL">Todas as categorias</SelectItem>
                    <SelectItem value="PDV_CAIXA">PDV & Caixa</SelectItem>
                    <SelectItem value="KDS_COZINHA">Cozinha & KDS</SelectItem>
                    <SelectItem value="CARDAPIO_ESTOQUE">Cardápio & Estoque</SelectItem>
                    <SelectItem value="IMPRESSAO_HARDWARE">Impressoras & Balança</SelectItem>
                    <SelectItem value="FINANCEIRO_FISCAL">Fiscal (NFC-e)</SelectItem>
                    <SelectItem value="INTEGRACOES">Integrações</SelectItem>
                    <SelectItem value="OUTRO">Dúvidas Gerais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                    <SelectItem value="ACTIVE">Em aberto</SelectItem>
                    <SelectItem value="OPEN">Abertos</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em análise</SelectItem>
                    <SelectItem value="WAITING_CUSTOMER">Aguard. retorno</SelectItem>
                    <SelectItem value="RESOLVED">Resolvidos</SelectItem>
                    <SelectItem value="CLOSED">Encerrados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-36">
                <Select
                  value={priorityFilter}
                  onValueChange={(val) => {
                    setPriorityFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Prioridade..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todas as prioridades</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="NORMAL">Média</SelectItem>
                    <SelectItem value="LOW">Baixa</SelectItem>
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
                {filteredTickets.length}
              </strong>{" "}
              de {totalCount} chamado{totalCount !== 1 ? "s" : ""}
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
        {filteredTickets.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <HeadphonesIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhum chamado encontrado
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {isFiltering
                ? "Tente ajustar os termos da busca ou limpar os filtros selecionados para ver outros chamados."
                : "Você não possui nenhum chamado de suporte em aberto no momento. Tudo funcionando perfeitamente!"}
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
                Cadastrar primeiro chamado
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
                    <TableHead className="w-[320px] text-xs font-semibold text-slate-700">
                      Protocolo & Assunto
                    </TableHead>
                    <TableHead className="w-[220px] text-xs font-semibold text-slate-700">
                      Solicitante
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Módulo / Categoria
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Prioridade
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Data de Abertura
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
                  {paginatedTickets.map((t) => {
                    const statusInfo = STATUS_CONFIG[t.status];
                    const priorityInfo = PRIORITY_CONFIG[t.priority];
                    const categoryInfo = CATEGORY_CONFIG[t.category];
                    const CategoryIcon = categoryInfo.icon;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer transition-colors hover:bg-slate-50/70"
                        onClick={() => setSelectedTicket(t)}
                      >
                        {/* Protocolo & Assunto */}
                        <TableCell className="py-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800">
                                {t.protocol}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                {t.messages.length} msg{t.messages.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="max-w-[300px] truncate text-sm font-semibold text-slate-900">
                              {t.title}
                            </p>
                            <p className="max-w-[300px] line-clamp-1 text-xs text-slate-500">
                              {t.description}
                            </p>
                          </div>
                        </TableCell>

                        {/* Solicitante (Avatar & Info matching usuarios-client) */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                              {getInitials(t.userName)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {t.userName}
                              </p>
                              <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                                <MailIcon size={12} className="shrink-0 text-slate-400" />
                                {t.userEmail}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Módulo / Categoria */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <div className="rounded-lg bg-slate-100 p-1.5 text-slate-600">
                              <CategoryIcon size={14} />
                            </div>
                            <span>{categoryInfo.shortLabel}</span>
                          </div>
                        </TableCell>

                        {/* Prioridade */}
                        <TableCell className="py-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                              priorityInfo.badgeClass,
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                priorityInfo.dotClass,
                              )}
                            />
                            {priorityInfo.label}
                          </span>
                        </TableCell>

                        {/* Data */}
                        <TableCell className="py-3.5">
                          <div className="text-xs text-slate-600">
                            <p className="font-medium text-slate-900">
                              {formatDate(t.createdAt)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Atualizado: {formatDate(t.updatedAt)}
                            </p>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tracking-normal transition-colors",
                              statusInfo.badgeClass,
                            )}
                          >
                            <StatusIcon size={13} className="shrink-0" />
                            <span>{statusInfo.label}</span>
                          </span>
                        </TableCell>

                        {/* Ações */}
                        <TableCell
                          className="py-3.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                              className="w-52 rounded-xl border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                            >
                              <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-semibold text-slate-500">
                                Opções do Chamado
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => setSelectedTicket(t)}
                                className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                              >
                                <MessageSquareIcon size={14} className="text-blue-600" />
                                Ver detalhes & respostas
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleCopyProtocol(t.protocol)}
                                className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                              >
                                <CopyIcon size={14} className="text-slate-500" />
                                Copiar protocolo
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="bg-slate-100" />

                              {t.status !== "RESOLVED" && t.status !== "CLOSED" ? (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(t.id, "RESOLVED")}
                                  className="gap-2 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 focus:bg-emerald-50"
                                >
                                  <CheckCircle2Icon size={14} />
                                  Marcar como Resolvido
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(t.id, "IN_PROGRESS")}
                                  className="gap-2 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 focus:bg-amber-50"
                                >
                                  <ClockIcon size={14} />
                                  Reabrir Chamado
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator className="bg-slate-100" />

                              <DropdownMenuItem
                                onClick={() => setDeletingTicket(t)}
                                className="gap-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                              >
                                <Trash2Icon size={14} />
                                Excluir chamado
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

            {/* Mobile Cards View (matching usuarios-client mobile cards) */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {paginatedTickets.map((t) => {
                const statusInfo = STATUS_CONFIG[t.status];
                const priorityInfo = PRIORITY_CONFIG[t.priority];
                const categoryInfo = CATEGORY_CONFIG[t.category];
                const StatusIcon = statusInfo.icon;
                const CategoryIcon = categoryInfo.icon;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="cursor-pointer space-y-3 p-4 transition-colors active:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                          {getInitials(t.userName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {t.protocol}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                              {t.messages.length} msg{t.messages.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {t.title}
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                            onClick={() => setSelectedTicket(t)}
                            className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                          >
                            <MessageSquareIcon size={14} />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopyProtocol(t.protocol)}
                            className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                          >
                            <CopyIcon size={14} />
                            Copiar protocolo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100" />
                          <DropdownMenuItem
                            onClick={() => setDeletingTicket(t)}
                            className="gap-2 rounded-lg text-xs font-medium text-red-600"
                          >
                            <Trash2Icon size={14} />
                            Excluir chamado
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="line-clamp-2 text-xs text-slate-500">
                      {t.description}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <CategoryIcon size={13} className="text-slate-500" />
                        <span>{categoryInfo.shortLabel}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            priorityInfo.badgeClass,
                          )}
                        >
                          <span
                            className={cn(
                              "h-1 w-1 rounded-full",
                              priorityInfo.dotClass,
                            )}
                          />
                          {priorityInfo.label}
                        </span>

                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            statusInfo.badgeClass,
                          )}
                        >
                          <StatusIcon size={11} />
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination Controls (identical to usuarios-client) ── */}
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
                <span>chamados por página</span>
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

      {/* ── FAQ & Knowledge Base Card ────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <HelpCircleIcon size={18} />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Perguntas Frequentes & Autoatendimento
              </h3>
              <p className="text-xs text-slate-500">
                Respostas rápidas e orientações passo a passo para as dúvidas mais comuns do restaurante.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition-colors hover:bg-slate-50"
              >
                <h4 className="text-xs font-semibold leading-snug text-slate-900">
                  {faq.q}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Dialog: Cadastrar Novo Chamado (matching usuarios-client) ─────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <HeadphonesIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Cadastrar Novo Chamado
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Preencha as informações para registrar sua solicitação técnica ou dúvida.
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
              <Label htmlFor="create-title" className="text-xs font-semibold text-slate-700">
                Título ou Resumo do Chamado *
              </Label>
              <Input
                id="create-title"
                required
                maxLength={120}
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Ex.: Impressora térmica travando no fechamento de pedidos"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Rich Select for Category (matching Role Select pattern in usuarios-client) */}
              <div className="space-y-1.5">
                <Label htmlFor="create-category" className="text-xs font-semibold text-slate-700">
                  Módulo / Categoria *
                </Label>
                <Select
                  value={createCategory}
                  onValueChange={(val) => setCreateCategory(val as TicketCategory)}
                >
                  <SelectTrigger
                    id="create-category"
                    className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-80 rounded-xl border-slate-200 bg-white shadow-xl">
                    {Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => {
                      const CatIcon = config.icon;
                      return (
                        <SelectItem
                          key={catKey}
                          value={catKey}
                          className="cursor-pointer py-2.5 focus:bg-slate-50"
                        >
                          <div className="flex items-start gap-2.5">
                            <CatIcon size={16} className="mt-0.5 text-slate-600" />
                            <div>
                              <p className="font-semibold leading-tight text-slate-900">
                                {config.label}
                              </p>
                              <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
                                {config.description}
                              </p>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Rich Select for Priority */}
              <div className="space-y-1.5">
                <Label htmlFor="create-priority" className="text-xs font-semibold text-slate-700">
                  Nível de Prioridade *
                </Label>
                <Select
                  value={createPriority}
                  onValueChange={(val) => setCreatePriority(val as TicketPriority)}
                >
                  <SelectTrigger
                    id="create-priority"
                    className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-80 rounded-xl border-slate-200 bg-white shadow-xl">
                    {Object.entries(PRIORITY_CONFIG).map(([prioKey, config]) => {
                      return (
                        <SelectItem
                          key={prioKey}
                          value={prioKey}
                          className="cursor-pointer py-2.5 focus:bg-slate-50"
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className={cn(
                                "mt-1.5 h-2 w-2 rounded-full shrink-0",
                                config.dotClass,
                              )}
                            />
                            <div>
                              <p className="font-semibold leading-tight text-slate-900">
                                {config.label}
                              </p>
                              <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
                                {config.description}
                              </p>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-phone" className="text-xs font-semibold text-slate-700">
                WhatsApp ou Celular para Contato
              </Label>
              <Input
                id="create-phone"
                value={createUserPhone}
                onChange={(e) => setCreateUserPhone(e.target.value)}
                placeholder="Ex.: (11) 98765-4321"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
              />
              <p className="text-[11px] text-slate-400">
                Se informado, nosso time técnico poderá retornar diretamente pelo WhatsApp para maior agilidade.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-desc" className="text-xs font-semibold text-slate-700">
                Descrição Detalhada do Ocorrido *
              </Label>
              <Textarea
                id="create-desc"
                required
                rows={4}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Descreva o que aconteceu, quais passos reproduzem a situação e qualquer mensagem de erro exibida na tela..."
                className="resize-none rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
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
                {isPending ? "Cadastrando..." : "Cadastrar Chamado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalhes & Timeline do Chamado ─────────── */}
      <Dialog
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
      >
        <DialogContent className="max-w-2xl rounded-2xl border-slate-200 bg-white p-6 shadow-2xl">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {selectedTicket.protocol}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          STATUS_CONFIG[selectedTicket.status].badgeClass,
                        )}
                      >
                        {STATUS_CONFIG[selectedTicket.status].label}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          PRIORITY_CONFIG[selectedTicket.priority].badgeClass,
                        )}
                      >
                        {PRIORITY_CONFIG[selectedTicket.priority].label}
                      </span>
                    </div>

                    <DialogTitle className="font-display text-lg font-bold text-slate-900">
                      {selectedTicket.title}
                    </DialogTitle>

                    <p className="text-xs text-slate-500">
                      Aberto por{" "}
                      <strong className="font-medium text-slate-800">
                        {selectedTicket.userName}
                      </strong>{" "}
                      ({selectedTicket.userEmail}) • {formatDate(selectedTicket.createdAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {selectedTicket.status !== "RESOLVED" &&
                    selectedTicket.status !== "CLOSED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleUpdateStatus(selectedTicket.id, "RESOLVED")
                        }
                        disabled={isPending}
                        className="gap-1.5 rounded-full border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        <CheckCircle2Icon size={14} />
                        <span>Marcar Resolvido</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleUpdateStatus(selectedTicket.id, "IN_PROGRESS")
                        }
                        disabled={isPending}
                        className="gap-1.5 rounded-full border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        <ClockIcon size={14} />
                        <span>Reabrir</span>
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Ticket Metadata Overview */}
              <div className="my-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Módulo
                  </span>
                  <p className="mt-0.5 text-xs font-semibold text-slate-800">
                    {CATEGORY_CONFIG[selectedTicket.category]?.label}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Telefone / Whats
                  </span>
                  <p className="mt-0.5 text-xs font-semibold text-slate-800">
                    {selectedTicket.userPhone || "Não informado"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Aberto em
                  </span>
                  <p className="mt-0.5 text-xs font-semibold text-slate-800">
                    {formatDate(selectedTicket.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Última Atualização
                  </span>
                  <p className="mt-0.5 text-xs font-semibold text-slate-800">
                    {formatDate(selectedTicket.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Chat & Messages Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    Linha do Tempo & Respostas
                  </span>
                  <span>{selectedTicket.messages.length} iten(s)</span>
                </div>

                <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
                  {selectedTicket.messages.map((msg) => {
                    const isSupport = msg.sender === "SUPPORT";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "space-y-1.5 rounded-2xl p-4 text-xs leading-relaxed",
                          isSupport
                            ? "border border-blue-100 bg-blue-50/70 text-slate-900"
                            : "border border-slate-200 bg-slate-50 text-slate-900",
                        )}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5">
                            {isSupport ? (
                              <>
                                <HeadphonesIcon
                                  size={13}
                                  className="text-blue-700"
                                />
                                <span className="text-blue-900">
                                  {msg.senderName}
                                </span>
                              </>
                            ) : (
                              <>
                                <UserIcon size={13} className="text-slate-600" />
                                <span>{msg.senderName} (Restaurante)</span>
                              </>
                            )}
                          </span>
                          <span className="text-[10px] font-normal text-slate-400">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-[13px] text-slate-700">
                          {msg.content}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Reply box */}
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Adicione um complemento ou mensagem adicional..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      className="h-10 rounded-xl border-slate-200 text-xs focus:border-slate-900"
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={isPending || !replyMessage.trim()}
                      className="h-10 shrink-0 gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      <SendIcon size={13} />
                      <span>Responder</span>
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-100 pt-3 sm:justify-between">
                <Button
                  asChild
                  variant="ghost"
                  className="gap-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <a
                    href={`https://wa.me/5511999999999?text=Ol%C3%A1!%20Gostaria%20de%20falar%20sobre%20o%20chamado%20${encodeURIComponent(selectedTicket.protocol)}%20(${encodeURIComponent(selectedTicket.title)})`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <PhoneIcon size={13} />
                    <span>Falar no WhatsApp sobre este protocolo</span>
                  </a>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-full border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Fechar Visualização
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Excluir Chamado (matching usuarios-client delete dialog) ─────────────── */}
      <Dialog
        open={Boolean(deletingTicket)}
        onOpenChange={(open) => {
          if (!open) setDeletingTicket(null);
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-red-100 p-2 text-red-600">
                <Trash2Icon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Excluir Chamado
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Esta ação removerá o histórico desta solicitação de suporte.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-sm text-slate-600">
            Tem certeza de que deseja remover permanentemente o chamado{" "}
            <strong className="text-slate-900">
              {deletingTicket?.protocol} — "{deletingTicket?.title}"
            </strong>
            ?
          </p>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTicket(null)}
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
              {isPending ? "Excluindo..." : "Excluir Chamado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
