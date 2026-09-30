"use client";

import type { UserRole } from "@fsw/db";
import {
  AlertCircleIcon,
  BikeIcon,
  CheckCircle2Icon,
  ChefHatIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FilterXIcon,
  LoaderCircleIcon,
  LockIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Trash2Icon,
  TvIcon,
  UserCheckIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  UserXIcon,
  UtensilsCrossedIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  alternarStatusUsuarioAction,
  atualizarUsuarioAction,
  criarUsuarioAction,
  excluirUsuarioAction,
} from "../usuarios-actions";
import {
  CommissionRuleData,
  GarcomMetricas,
  TipClosingItem,
} from "../garcons-actions";
import { GarconsTab } from "./garcons-tab";
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
import { cn } from "@/lib/utils";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  restaurantId: string | null;
  createdAt: Date;
}

interface UsuariosClientProps {
  slug: string;
  users: UserItem[];
  garconsData?: {
    garcons: GarcomMetricas[];
    regraComissao: CommissionRuleData | null;
    fechamentos: TipClosingItem[];
  };
  currentUserRole?: string;
}

interface RoleConfig {
  label: string;
  shortLabel: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  KITCHEN: {
    label: "Operador de Cozinha / KDS",
    shortLabel: "Cozinha (KDS)",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100",
    icon: ChefHatIcon,
    description: "Visualiza pedidos no KDS, marca itens preparados e despacha pratos",
  },
  PANEL: {
    label: "Painel de Senhas / TV Salão",
    shortLabel: "TV de Senhas",
    badgeClass: "bg-teal-50 text-teal-800 border-teal-200/80 hover:bg-teal-100",
    icon: TvIcon,
    description: "Exibe exclusivamente a tela de senhas na TV para chamada de clientes no salão",
  },
  ADMIN: {
    label: "Administrador de Restaurante",
    shortLabel: "Administrador",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200/80 hover:bg-blue-100",
    icon: ShieldCheckIcon,
    description: "Acesso total a cardápio, estoque, relatórios, configurações e equipe",
  },
  MANAGER: {
    label: "Gerente Operacional",
    shortLabel: "Gerente",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100",
    icon: UsersIcon,
    description: "Supervisão da operação, pedidos, mesas, cancelamentos e equipe",
  },
  WAITER: {
    label: "Operador de Comandas / Garçom (Mobile e Salão)",
    shortLabel: "Comandas / Garçom",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200/80 hover:bg-indigo-100",
    icon: UtensilsCrossedIcon,
    description: "Acesso exclusivo ao painel de Comandas e Mesas, otimizado para celular como um aplicativo dedicado",
  },
  COURIER: {
    label: "Entregador / Motoboy",
    shortLabel: "Entregador",
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-200/80 hover:bg-cyan-100",
    icon: BikeIcon,
    description: "Acesso ao Painel de Entregas e Expedição para consulta de rotas e despacho de pedidos",
  },
  ATTENDANT: {
    label: "Atendente (Operações)",
    shortLabel: "Atendente",
    badgeClass: "bg-violet-50 text-violet-800 border-violet-200/80 hover:bg-violet-100",
    icon: MonitorSmartphoneIcon,
    description: "Acesso completo às operações de atendimento, balcão, PDV e pedidos",
  },
  SUPER_ADMIN: {
    label: "Super Administrador (Global)",
    shortLabel: "Super Admin",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200/80 hover:bg-purple-100",
    icon: SparklesIcon,
    description: "Acesso mestre e irrestrito a todos os restaurantes da rede",
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

const formatDate = (date: Date | string): string => {
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "Data indisp.";
  }
};

export function UsuariosClient({
  slug,
  users,
  garconsData,
  currentUserRole,
}: UsuariosClientProps) {
  const [isPending, startTransition] = useTransition();

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<"USUARIOS" | "GARCONS">("USUARIOS");

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("KITCHEN");

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("KITCHEN");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [isNewGarcomOpen, setIsNewGarcomOpen] = useState(false);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search term
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = u.name.toLowerCase().includes(query);
        const matchesEmail = u.email.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      // Role filter
      if (roleFilter !== "ALL" && u.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "ACTIVE" && !u.isActive) return false;
      if (statusFilter === "INACTIVE" && u.isActive) return false;

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Metric stats
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const kitchenCount = users.filter((u) => u.role === "KITCHEN").length;
  const adminCount = users.filter((u) =>
    ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(u.role),
  ).length;

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const isFiltering =
    searchQuery.trim() !== "" || roleFilter !== "ALL" || statusFilter !== "ALL";

  const handleClearFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  // Handlers
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);

    if (currentUserRole === "MANAGER" && (selectedRole === "ADMIN" || selectedRole === "SUPER_ADMIN")) {
      setCreateError(
        "Usuários com perfil de Gerente não têm permissão para cadastrar Administradores.",
      );
      toast.error("Usuários com perfil de Gerente não têm permissão para cadastrar Administradores.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("role", selectedRole);
    formData.append("restaurantSlug", slug);

    const password = formData.get("password")?.toString() || "";
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setCreateError(
        "A senha deve ter no mínimo 8 caracteres e conter pelo menos uma letra e um número.",
      );
      return;
    }

    startTransition(async () => {
      const result = await criarUsuarioAction(null, formData);
      if (result.error) {
        setCreateError(result.error);
        toast.error(result.error);
      } else {
        toast.success("Novo usuário cadastrado com sucesso!");
        setIsCreateOpen(false);
        setSelectedRole("KITCHEN");
      }
    });
  };

  const handleOpenEdit = (user: UserItem) => {
    if (currentUserRole === "MANAGER" && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
      toast.error("Usuários com perfil de Gerente não têm permissão para editar Administradores.");
      return;
    }
    setEditingUser(user);
    setEditName(user.name);
    setEditRole((user.role as UserRole) || "KITCHEN");
    setEditPassword("");
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (currentUserRole === "MANAGER" && (editRole === "ADMIN" || editRole === "SUPER_ADMIN")) {
      setEditError(
        "Usuários com perfil de Gerente não têm permissão para atribuir o cargo de Administrador.",
      );
      return;
    }

    if (editPassword.trim()) {
      const pwd = editPassword.trim();
      if (pwd.length < 8 || !/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
        setEditError(
          "A nova senha deve ter no mínimo 8 caracteres e conter pelo menos uma letra e um número.",
        );
        return;
      }
    }

    startTransition(async () => {
      const result = await atualizarUsuarioAction({
        userId: editingUser.id,
        name: editName,
        role: editRole,
        password: editPassword.trim() ? editPassword.trim() : undefined,
        restaurantSlug: slug,
      });

      if (result.error) {
        setEditError(result.error);
        toast.error(result.error);
      } else {
        toast.success("Dados do usuário atualizados com sucesso!");
        setEditingUser(null);
      }
    });
  };

  const handleToggleStatus = (
    userId: string,
    currentStatus: boolean,
    userName: string,
    userRole?: string,
  ) => {
    if (currentUserRole === "MANAGER" && (userRole === "ADMIN" || userRole === "SUPER_ADMIN")) {
      toast.error("Usuários com perfil de Gerente não têm permissão para alterar o status de Administradores.");
      return;
    }
    startTransition(async () => {
      try {
        await alternarStatusUsuarioAction(userId, !currentStatus, slug);
        toast.success(
          `Usuário "${userName}" ${!currentStatus ? "ativado" : "desativado"} com sucesso.`,
        );
      } catch {
        toast.error("Não foi possível alterar o status do usuário.");
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingUser) return;
    if (
      currentUserRole === "MANAGER" &&
      (deletingUser.role === "ADMIN" || deletingUser.role === "SUPER_ADMIN")
    ) {
      toast.error("Usuários com perfil de Gerente não têm permissão para excluir Administradores.");
      setDeletingUser(null);
      return;
    }
    startTransition(async () => {
      const result = await excluirUsuarioAction(deletingUser.id, slug);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Usuário "${deletingUser.name}" excluído com sucesso.`);
        setDeletingUser(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <UsersIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Acessos
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie os acessos da equipe, operadores de salão, cozinha e gerentes.
            </p>
          </div>
        </div>

        {activeTab === "USUARIOS" ? (
          <Button
            onClick={() => {
              setCreateError(null);
              setSelectedRole("KITCHEN");
              setIsCreateOpen(true);
            }}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <UserPlusIcon size={16} />
            <span>Novo Usuário</span>
          </Button>
        ) : (
          <Button
            onClick={() => setIsNewGarcomOpen(true)}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <UserPlusIcon size={16} />
            <span>Novo Garçom</span>
          </Button>
        )}
      </div>

      {/* ── Sub-Tabs Navigation ─────────────────────────── */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("USUARIOS")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all",
            activeTab === "USUARIOS"
              ? "border-slate-950 text-slate-950"
              : "border-transparent text-slate-500 hover:text-slate-800",
          )}
        >
          <UsersIcon size={16} />
          <span>Acessos ao Painel</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("GARCONS")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all",
            activeTab === "GARCONS"
              ? "border-slate-950 text-slate-950"
              : "border-transparent text-slate-500 hover:text-slate-800",
          )}
        >
          <UtensilsCrossedIcon size={16} />
          <span>Garçons e Salão</span>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 font-medium">
            {garconsData?.garcons.length || 0}
          </span>
        </button>
      </div>

      {activeTab === "GARCONS" ? (
        <GarconsTab
          slug={slug}
          garcons={garconsData?.garcons || []}
          regraComissao={garconsData?.regraComissao || null}
          fechamentos={garconsData?.fechamentos || []}
          isNewGarcomOpen={isNewGarcomOpen}
          onNewGarcomOpenChange={setIsNewGarcomOpen}
        />
      ) : (
        <>
          {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Usuários
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <UsersIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeCount} ativos no restaurante
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cozinha e KDS
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <ChefHatIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {kitchenCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Operadores do painel KDS
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Gestão e Admin
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <ShieldCheckIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
              {adminCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Admins e gerentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status Ativo
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {activeCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalCount - activeCount > 0
                ? `${totalCount - activeCount} inativo(s)`
                : "100% de contas ativas"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Table & List Container ───────────────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {/* Filtros da Tabela de Usuários */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por nome ou e-mail..."
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

            {/* Selects: Cargo e Status */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-48">
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
                    <SelectItem value="KITCHEN">Cozinha / KDS</SelectItem>
                    <SelectItem value="PANEL">Painel de Senhas (TV)</SelectItem>
                    <SelectItem value="COURIER">Entregador / Motoboy</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="MANAGER">Gerente</SelectItem>
                    <SelectItem value="WAITER">Comandas / Garçom (Mobile)</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Administrador</SelectItem>
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
        {/* Empty state */}
        {filteredUsers.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <UserXIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhum usuário encontrado
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {isFiltering
                ? "Tente ajustar os termos da busca ou limpar os filtros selecionados para ver outros colaboradores."
                : "Nenhum usuário cadastrado neste restaurante ainda. Comece adicionando um novo usuário!"}
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
                Cadastrar primeiro usuário
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
                    <TableHead className="w-[300px] text-xs font-semibold text-slate-700">
                      Colaborador
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Cargo / Função
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Data de Cadastro
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
                  {paginatedUsers.map((u) => {
                    const roleInfo = ROLE_CONFIG[u.role] ?? {
                      label: u.role,
                      shortLabel: u.role,
                      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                      icon: UserIcon,
                      description: "",
                    };
                    const RoleIcon = roleInfo.icon;

                    return (
                      <TableRow
                        key={u.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        {/* Colaborador */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                              {getInitials(u.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {u.name}
                              </p>
                              <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                                <MailIcon size={12} className="shrink-0 text-slate-400" />
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Cargo */}
                        <TableCell className="py-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tracking-normal transition-colors",
                              roleInfo.badgeClass,
                            )}
                          >
                            <RoleIcon size={12} className="shrink-0" />
                            {roleInfo.shortLabel}
                          </span>
                        </TableCell>

                        {/* Data */}
                        <TableCell className="py-3.5 text-xs text-slate-500">
                          {formatDate(u.createdAt)}
                        </TableCell>

                        {/* Status Switch */}
                        <TableCell className="py-3.5 text-center">
                          {(() => {
                            const isTargetAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
                            const isRestrictedForManager = currentUserRole === "MANAGER" && isTargetAdmin;
                            return (
                              <div className="inline-flex items-center gap-2">
                                <Switch
                                  checked={u.isActive}
                                  disabled={isPending || isRestrictedForManager}
                                  onCheckedChange={() =>
                                    handleToggleStatus(u.id, u.isActive, u.name, u.role)
                                  }
                                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                                />
                                <span
                                  className={cn(
                                    "text-xs font-medium",
                                    u.isActive ? "text-emerald-700" : "text-slate-400",
                                  )}
                                >
                                  {u.isActive ? "Ativo" : "Inativo"}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="py-3.5 text-right">
                          {(() => {
                            const isTargetAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
                            const isRestrictedForManager = currentUserRole === "MANAGER" && isTargetAdmin;

                            if (isRestrictedForManager) {
                              return (
                                <div className="flex items-center justify-end pr-2" title="Administradores estão acima do perfil de Gerente">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                    <LockIcon size={11} className="text-slate-400" />
                                    Protegido
                                  </span>
                                </div>
                              );
                            }

                            return (
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
                                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                                    Opções de Acesso
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenEdit(u)}
                                    className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                  >
                                    <PencilIcon size={14} className="text-slate-500" />
                                    Editar dados
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleStatus(u.id, u.isActive, u.name, u.role)
                                    }
                                    className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                  >
                                    {u.isActive ? (
                                      <>
                                        <UserXIcon size={14} className="text-amber-500" />
                                        Desativar acesso
                                      </>
                                    ) : (
                                      <>
                                        <UserCheckIcon size={14} className="text-emerald-600" />
                                        Ativar acesso
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-slate-100" />
                                  <DropdownMenuItem
                                    onClick={() => setDeletingUser(u)}
                                    className="gap-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                                  >
                                    <Trash2Icon size={14} />
                                    Excluir usuário
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {paginatedUsers.map((u) => {
                const roleInfo = ROLE_CONFIG[u.role] ?? {
                  label: u.role,
                  shortLabel: u.role,
                  badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                  icon: UserIcon,
                  description: "",
                };
                const RoleIcon = roleInfo.icon;
                const isTargetAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
                const isRestrictedForManager = currentUserRole === "MANAGER" && isTargetAdmin;

                return (
                  <div key={u.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>

                      {isRestrictedForManager ? (
                        <span
                          title="Administradores estão acima do perfil de Gerente"
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500"
                        >
                          <LockIcon size={11} className="text-slate-400" />
                          Protegido
                        </span>
                      ) : (
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
                              onClick={() => handleOpenEdit(u)}
                              className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                            >
                              <PencilIcon size={14} />
                              Editar dados
                            </DropdownMenuItem>
                            {u.role !== "SUPER_ADMIN" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggleStatus(u.id, u.isActive, u.name, u.role)
                                  }
                                  className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                                >
                                  {u.isActive ? (
                                    <>
                                      <UserXIcon size={14} className="text-amber-500" />
                                      Desativar acesso
                                    </>
                                  ) : (
                                    <>
                                      <UserCheckIcon size={14} className="text-emerald-600" />
                                      Ativar acesso
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem
                                  onClick={() => setDeletingUser(u)}
                                  className="gap-2 rounded-lg text-xs font-medium text-red-600"
                                >
                                  <Trash2Icon size={14} />
                                  Excluir usuário
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          roleInfo.badgeClass,
                        )}
                      >
                        <RoleIcon size={11} />
                        {roleInfo.shortLabel}
                      </span>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            u.isActive ? "text-emerald-700" : "text-slate-400",
                          )}
                        >
                          {u.isActive ? "Ativo" : "Inativo"}
                        </span>
                        <Switch
                          checked={u.isActive}
                          disabled={isPending || isRestrictedForManager}
                          onCheckedChange={() =>
                            handleToggleStatus(u.id, u.isActive, u.name, u.role)
                          }
                          className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
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
                    {filteredUsers.length}
                  </strong>{" "}
                  de {totalCount} usuário{totalCount !== 1 ? "s" : ""}
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

      {/* ── Dialog: Cadastrar Novo Usuário ─────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <UserPlusIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Cadastrar Novo Usuário
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Preencha as informações para criar um novo acesso ao sistema.
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
              <Label htmlFor="create-name" className="text-xs font-semibold text-slate-700">
                Nome Completo
              </Label>
              <Input
                id="create-name"
                name="name"
                required
                placeholder="Ex.: Carlos Cozinheiro"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-email" className="text-xs font-semibold text-slate-700">
                E-mail de Login
              </Label>
              <Input
                id="create-email"
                name="email"
                type="email"
                required
                placeholder="Ex.: cozinha@restaurante.com"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-password" className="text-xs font-semibold text-slate-700">
                Senha Inicial
              </Label>
              <Input
                id="create-password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Mínimo de 8 caracteres (letras e números)"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
              />
              <p className="text-[11px] text-slate-500">
                A senha deve ter no mínimo 8 caracteres e conter pelo menos uma letra e um número.
              </p>
            </div>

            {/* Shadcn UI Select for Role */}
            <div className="space-y-1.5">
              <Label htmlFor="create-role" className="text-xs font-semibold text-slate-700">
                Cargo / Nível de Permissão
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(val) => setSelectedRole(val as UserRole)}
              >
                <SelectTrigger
                  id="create-role"
                  className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80 rounded-xl border-slate-200 bg-white shadow-xl">
                  {Object.entries(ROLE_CONFIG)
                    .filter(([roleKey]) => {
                      if (roleKey === "SUPER_ADMIN") return false;
                      if (currentUserRole === "MANAGER" && roleKey === "ADMIN") return false;
                      return true;
                    })
                    .map(([roleKey, config]) => {
                    const RoleIcon = config.icon;
                    return (
                      <SelectItem
                        key={roleKey}
                        value={roleKey}
                        className="py-2.5 cursor-pointer focus:bg-slate-50"
                      >
                        <div className="flex items-start gap-2.5">
                          <RoleIcon size={16} className="mt-0.5 text-slate-600" />
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {config.label}
                            </p>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
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
                {isPending ? "Cadastrando..." : "Cadastrar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar Usuário ─────────────────────── */}
      <Dialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <PencilIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Editar Usuário
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Altere o nome, cargo ou redefina a senha de acesso.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            {editError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">E-mail</Label>
              <Input
                disabled
                value={editingUser?.email ?? ""}
                className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-500"
              />
              <p className="text-[11px] text-slate-400">
                O e-mail é a chave de login e não pode ser alterado.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-semibold text-slate-700">
                Nome Completo
              </Label>
              <Input
                id="edit-name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
              />
            </div>

            {/* Shadcn UI Select for Role */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-role" className="text-xs font-semibold text-slate-700">
                Cargo / Nível de Permissão
              </Label>
              <Select
                value={editRole}
                onValueChange={(val) => setEditRole(val as UserRole)}
              >
                <SelectTrigger
                  id="edit-role"
                  className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80 rounded-xl border-slate-200 bg-white shadow-xl">
                  {Object.entries(ROLE_CONFIG)
                    .filter(([roleKey]) => {
                      if (roleKey === "SUPER_ADMIN") return false;
                      if (currentUserRole === "MANAGER" && roleKey === "ADMIN") return false;
                      return true;
                    })
                    .map(([roleKey, config]) => {
                    const RoleIcon = config.icon;
                    return (
                      <SelectItem
                        key={roleKey}
                        value={roleKey}
                        className="py-2.5 cursor-pointer focus:bg-slate-50"
                      >
                        <div className="flex items-start gap-2.5">
                          <RoleIcon size={16} className="mt-0.5 text-slate-600" />
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {config.label}
                            </p>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
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

            <div className="space-y-1.5">
              <Label htmlFor="edit-password" className="text-xs font-semibold text-slate-700">
                Redefinir Senha (opcional)
              </Label>
              <Input
                id="edit-password"
                type="password"
                minLength={8}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Deixe em branco para manter a senha atual"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
              />
              <p className="text-[11px] text-slate-500">
                Se informada, a nova senha deve ter no mínimo 8 caracteres com letra e número.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
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
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Exclusão ─────────────────── */}
      <ConfirmDeleteDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
        title="Excluir Usuário"
        description={
          <>
            Tem certeza que deseja remover o usuário{" "}
            <strong className="text-slate-900 font-semibold">
              {deletingUser?.name}
            </strong>{" "}
            ({deletingUser?.email})? Esta ação não pode ser desfeita e revogará imediatamente o acesso ao sistema.
          </>
        }
        confirmLabel="Sim, excluir usuário"
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
      />
        </>
      )}
    </div>
  );
}
