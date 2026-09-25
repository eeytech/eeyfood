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

const STATUS_CONFIG: Record<
  TicketStatus,
  {
    label: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    description: string;
  }
> = {
  OPEN: {
    label: "Aberto",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100",
    icon: AlertCircleIcon,
    description: "Aguardando primeiro retorno da equipe de suporte",
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

const PRIORITY_CONFIG: Record<
  TicketPriority,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  LOW: {
    label: "Baixa",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
  NORMAL: {
    label: "Média",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  HIGH: {
    label: "Alta",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    dotClass: "bg-orange-500",
  },
  URGENT: {
    label: "Urgente",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse",
    dotClass: "bg-rose-600",
  },
};

const CATEGORY_CONFIG: Record<
  TicketCategory,
  {
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
  }
> = {
  PDV_CAIXA: { label: "PDV & Caixa", icon: MonitorSmartphoneIcon },
  KDS_COZINHA: { label: "Cozinha & KDS", icon: ChefHatIcon },
  CARDAPIO_ESTOQUE: { label: "Cardápio & Estoque", icon: BoxesIcon },
  IMPRESSAO_HARDWARE: { label: "Impressoras & Balança", icon: PrinterIcon },
  FINANCEIRO_FISCAL: { label: "Financeiro & Fiscal (NFC-e)", icon: CircleDollarSignIcon },
  INTEGRACOES: { label: "Integrações (iFood, WhatsApp)", icon: SparklesIcon },
  OUTRO: { label: "Dúvidas Gerais / Outro", icon: HelpCircleIcon },
};

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
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
    q: "O que fazer se a emissão de NFC-e ficar indisponível?",
    a: "Caso a SEFAZ do seu estado oscile, o sistema entra em contingência offline automaticamente e retransmite as notas fiscais assim que a conexão for restabelecida.",
  },
  {
    q: "Como pausar temporariamente os pedidos no cardápio online?",
    a: "Em Configurações > Horários de Funcionamento, você pode marcar a loja como pausada ou definir um tempo de espera estendido para entrega.",
  },
];

export function SuporteClient({ slug, initialTickets }: SuporteClientProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState<TicketCategory>("PDV_CAIXA");
  const [priority, setPriority] = useState<TicketPriority>("NORMAL");
  const [replyMessage, setReplyMessage] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesProtocol = t.protocol.toLowerCase().includes(query);
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description.toLowerCase().includes(query);
        const matchesUser = t.userName.toLowerCase().includes(query);
        if (!matchesProtocol && !matchesTitle && !matchesDesc && !matchesUser) {
          return false;
        }
      }

      if (categoryFilter !== "ALL" && t.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE") {
          if (t.status === "RESOLVED" || t.status === "CLOSED") return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, searchQuery, categoryFilter, statusFilter, priorityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  // Metrics
  const totalCount = tickets.length;
  const inProgressCount = tickets.filter(
    (t) => t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "WAITING_CUSTOMER",
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "RESOLVED" || t.status === "CLOSED",
  ).length;

  const isFiltering =
    Boolean(searchQuery.trim()) ||
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

  // Actions
  const handleCreateTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("category", category);
    formData.set("priority", priority);
    formData.set("restaurantSlug", slug);

    startTransition(async () => {
      const res = await criarChamadoAction(null, formData);
      if (res.error) {
        setCreateError(res.error);
        toast.error(res.error);
        return;
      }

      const title = formData.get("title")?.toString() || "";
      const description = formData.get("description")?.toString() || "";
      const userPhone = formData.get("userPhone")?.toString() || "";
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const now = new Date().toISOString();

      const optimisticTicket: SupportTicket = {
        id: res.ticketId || `tkt-${Date.now()}`,
        protocol: `#SUP-${randomNum}`,
        title,
        description,
        category,
        priority,
        status: "OPEN",
        userName: "Administrador",
        userEmail: "contato@restaurante.com",
        userPhone,
        restaurantSlug: slug,
        createdAt: now,
        updatedAt: now,
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: "USER",
            senderName: "Administrador",
            content: description,
            createdAt: now,
          },
        ],
      };

      setTickets((prev) => [optimisticTicket, ...prev]);
      setIsCreateOpen(false);
      toast.success("Chamado aberto com sucesso! Nossa equipe entrará em contato em breve.");
    });
  };

  const handleUpdateStatus = (ticketId: string, newStatus: TicketStatus) => {
    startTransition(async () => {
      const res = await atualizarStatusChamadoAction(ticketId, newStatus);
      if (!res.success) {
        toast.error(res.error || "Não foi possível atualizar o status.");
        return;
      }

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
            : t,
        ),
      );

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) =>
          prev
            ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() }
            : null,
        );
      }

      toast.success(`Status atualizado para "${STATUS_CONFIG[newStatus].label}"`);
    });
  };

  const handleSendReply = () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    const messageText = replyMessage.trim();
    setReplyMessage("");

    startTransition(async () => {
      const res = await adicionarMensagemChamadoAction(selectedTicket.id, messageText);
      if (!res.success) {
        toast.error(res.error || "Erro ao enviar resposta.");
        return;
      }

      const now = new Date().toISOString();
      const newMessage = {
        id: `msg-${Date.now()}`,
        sender: "USER" as const,
        senderName: selectedTicket.userName || "Administrador",
        content: messageText,
        createdAt: now,
      };

      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === selectedTicket.id) {
            return {
              ...t,
              updatedAt: now,
              status: t.status === "RESOLVED" || t.status === "CLOSED" ? "IN_PROGRESS" : t.status,
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
              status: prev.status === "RESOLVED" || prev.status === "CLOSED" ? "IN_PROGRESS" : prev.status,
              messages: [...prev.messages, newMessage],
            }
          : null,
      );

      toast.success("Mensagem enviada com sucesso!");
    });
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
              Abra chamados, acompanhe solicitações técnicas e tire dúvidas diretamente com nossa equipe.
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
              href="https://wa.me/5511999999999?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20sistema%20EeyFood"
              target="_blank"
              rel="noopener noreferrer"
            >
              <PhoneIcon size={14} className="text-emerald-600" />
              <span>Plantão WhatsApp</span>
              <ExternalLinkIcon size={12} className="text-slate-400" />
            </a>
          </Button>

          <Button
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <PlusIcon size={16} />
            <span>Novo Chamado</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Total de Chamados
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700 shrink-0">
                <LifeBuoyIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              Histórico de solicitações
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Em Andamento
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700 shrink-0">
                <ClockIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {inProgressCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {inProgressCount === 0 ? "Nenhum pendente" : "Em análise técnica"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Resolvidos
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 shrink-0">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {resolvedCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              Casos solucionados
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Tempo de Resposta
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700 shrink-0">
                <SparklesIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
              ~15 min
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
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
                placeholder="Buscar por protocolo, título ou palavra-chave..."
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
              <div className="w-full sm:w-44">
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
                    <SelectItem value="IMPRESSAO_HARDWARE">Impressoras</SelectItem>
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
                ? "Tente ajustar os termos da busca ou limpar os filtros para ver outros chamados."
                : "Você não possui nenhum chamado de suporte aberto no momento. Tudo funcionando perfeitamente!"}
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
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 gap-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <PlusIcon size={14} />
                Abrir chamado agora
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
                    <TableHead className="w-[340px] text-xs font-semibold text-slate-700">
                      Protocolo & Assunto
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
                              <span className="font-mono text-xs font-semibold text-slate-700">
                                {t.protocol}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                {t.messages.length} msg{t.messages.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="truncate text-sm font-semibold text-slate-900 max-w-[320px]">
                              {t.title}
                            </p>
                            <p className="line-clamp-1 text-xs text-slate-500 max-w-[320px]">
                              {t.description}
                            </p>
                          </div>
                        </TableCell>

                        {/* Categoria */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <div className="rounded-lg bg-slate-100 p-1.5 text-slate-600">
                              <CategoryIcon size={14} />
                            </div>
                            <span>{categoryInfo.label}</span>
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
                            <span className={cn("h-1.5 w-1.5 rounded-full", priorityInfo.dotClass)} />
                            {priorityInfo.label}
                          </span>
                        </TableCell>

                        {/* Data */}
                        <TableCell className="py-3.5">
                          <div className="text-xs text-slate-600">
                            <p className="font-medium text-slate-900">{formatDate(t.createdAt)}</p>
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
                                className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              >
                                <MoreHorizontalIcon size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-xl border-slate-200 bg-white p-1 shadow-lg"
                            >
                              <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Opções do chamado
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => setSelectedTicket(t)}
                                className="gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              >
                                <MessageSquareIcon size={14} className="text-blue-600" />
                                <span>Ver detalhes & respostas</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="my-1 bg-slate-100" />

                              {t.status !== "RESOLVED" && t.status !== "CLOSED" ? (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(t.id, "RESOLVED")}
                                  className="gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                >
                                  <CheckCircle2Icon size={14} />
                                  <span>Marcar como Resolvido</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(t.id, "IN_PROGRESS")}
                                  className="gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                                >
                                  <ClockIcon size={14} />
                                  <span>Reabrir Chamado</span>
                                </DropdownMenuItem>
                              )}
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
                    className="p-4 space-y-3 cursor-pointer transition-colors active:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {t.protocol}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">
                          {t.title}
                        </h4>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0",
                          statusInfo.badgeClass,
                        )}
                      >
                        <StatusIcon size={11} />
                        {statusInfo.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {t.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <CategoryIcon size={13} className="text-slate-500" />
                        {categoryInfo.label}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          priorityInfo.badgeClass,
                        )}
                      >
                        <span className={cn("h-1 w-1 rounded-full", priorityInfo.dotClass)} />
                        {priorityInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination footer */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row">
              <span className="text-xs text-slate-500">
                Página{" "}
                <strong className="font-semibold text-slate-900">
                  {currentPage}
                </strong>{" "}
                de {totalPages}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <ChevronsLeftIcon size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <ChevronLeftIcon size={14} />
                </Button>

                <div className="px-2 text-xs font-semibold text-slate-700">
                  {currentPage} / {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <ChevronRightIcon size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <ChevronsRightIcon size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── FAQ & Knowledge Base Card ────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <HelpCircleIcon size={18} />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Perguntas Frequentes (FAQ)
              </h3>
              <p className="text-xs text-slate-500">
                Respostas rápidas para as dúvidas mais comuns do dia a dia no restaurante.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition-colors hover:bg-slate-50"
              >
                <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                  {faq.q}
                </h4>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Modal: Novo Chamado ──────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl rounded-2xl border-slate-200 bg-white p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <HeadphonesIcon size={18} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Abrir Novo Chamado de Suporte
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Preencha os detalhes da sua dúvida ou incidente. Nossa equipe técnica responderá prontamente.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
            {createError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircleIcon size={16} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ticket-title" className="text-xs font-semibold text-slate-700">
                Título ou Resumo do Chamado *
              </Label>
              <Input
                id="ticket-title"
                name="title"
                placeholder="Ex: Impressora térmica travando no fechamento de pedidos"
                required
                maxLength={120}
                className="h-10 rounded-xl border-slate-200 text-sm focus:border-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Módulo / Categoria *
                </Label>
                <Select value={category} onValueChange={(val) => setCategory(val as TicketCategory)}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="PDV_CAIXA">PDV & Caixa</SelectItem>
                    <SelectItem value="KDS_COZINHA">Cozinha & KDS</SelectItem>
                    <SelectItem value="CARDAPIO_ESTOQUE">Cardápio & Estoque</SelectItem>
                    <SelectItem value="IMPRESSAO_HARDWARE">Impressoras & Balança</SelectItem>
                    <SelectItem value="FINANCEIRO_FISCAL">Fiscal (NFC-e)</SelectItem>
                    <SelectItem value="INTEGRACOES">Integrações (iFood, WhatsApp)</SelectItem>
                    <SelectItem value="OUTRO">Dúvidas Gerais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Nível de Prioridade *
                </Label>
                <Select value={priority} onValueChange={(val) => setPriority(val as TicketPriority)}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="LOW">Baixa (Dúvidas ou sugestões)</SelectItem>
                    <SelectItem value="NORMAL">Média (Impacto não impeditivo)</SelectItem>
                    <SelectItem value="HIGH">Alta (Dificulta a operação)</SelectItem>
                    <SelectItem value="URGENT">Urgente (Operação parada / Caixa travado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-phone" className="text-xs font-semibold text-slate-700">
                WhatsApp ou Celular para Contato
              </Label>
              <Input
                id="ticket-phone"
                name="userPhone"
                placeholder="(00) 00000-0000"
                className="h-10 rounded-xl border-slate-200 text-sm focus:border-slate-900"
              />
              <p className="text-[11px] text-slate-400">
                Se preenchido, podemos retornar diretamente via WhatsApp para maior agilidade.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-desc" className="text-xs font-semibold text-slate-700">
                Descrição Detalhada do Ocorrido *
              </Label>
              <Textarea
                id="ticket-desc"
                name="description"
                placeholder="Descreva o que aconteceu, quais passos reproduzem o problema e qualquer mensagem de erro exibida na tela..."
                required
                rows={4}
                className="rounded-xl border-slate-200 text-sm resize-none focus:border-slate-900"
              />
            </div>

            <DialogFooter className="gap-2 pt-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-2 rounded-full bg-slate-900 px-6 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {isPending && <LoaderCircleIcon size={14} className="animate-spin" />}
                <span>Enviar Chamado</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Detalhes do Chamado & Mensagens ─────────── */}
      <Dialog
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
      >
        <DialogContent className="max-w-2xl rounded-2xl border-slate-200 bg-white p-6 shadow-2xl">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700">
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
                      Aberto por {selectedTicket.userName} • {formatDate(selectedTicket.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(selectedTicket.id, "RESOLVED")}
                        disabled={isPending}
                        className="gap-1.5 rounded-full border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        <CheckCircle2Icon size={14} />
                        <span>Marcar como Resolvido</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(selectedTicket.id, "IN_PROGRESS")}
                        disabled={isPending}
                        className="gap-1.5 rounded-full border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        <ClockIcon size={14} />
                        <span>Reabrir Chamado</span>
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Chat & Messages Timeline */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                  <span className="font-semibold text-slate-700">Histórico de Mensagens</span>
                  <span>{selectedTicket.messages.length} iten(s)</span>
                </div>

                <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
                  {selectedTicket.messages.map((msg) => {
                    const isSupport = msg.sender === "SUPPORT";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "rounded-2xl p-4 text-xs leading-relaxed space-y-1.5",
                          isSupport
                            ? "border border-blue-100 bg-blue-50/70 text-slate-900"
                            : "border border-slate-200 bg-slate-50 text-slate-900",
                        )}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5">
                            {isSupport ? (
                              <>
                                <HeadphonesIcon size={13} className="text-blue-700" />
                                <span className="text-blue-900">{msg.senderName}</span>
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
                        <p className="whitespace-pre-wrap text-slate-700 text-[13px]">
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
                      className="h-10 gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 shrink-0"
                    >
                      <SendIcon size={13} />
                      <span>Responder</span>
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-full border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Fechar Visualização
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
