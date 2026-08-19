"use client";

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
  UserXIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { alternarStatusUsuarioAction, criarUsuarioAction } from "../usuarios-actions";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserItem {
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
}

const roleLabels: Record<string, { label: string; badge: string }> = {
  SUPER_ADMIN: {
    label: "Super Administrador",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  ADMIN: {
    label: "Administrador",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  MANAGER: {
    label: "Gerente",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  WAITER: {
    label: "Garçom",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  KITCHEN: {
    label: "Cozinha",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
};

export function UsuariosClient({ slug, users }: UsuariosClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.append("restaurantSlug", slug);

    startTransition(async () => {
      const result = await criarUsuarioAction(null, formData);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success("Usuário cadastrado com sucesso!");
        setIsOpen(false);
      }
    });
  };

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await alternarStatusUsuarioAction(userId, !currentStatus, slug);
        toast.success(
          `Usuário ${!currentStatus ? "ativado" : "desativado"} com sucesso.`,
        );
      } catch {
        toast.error("Erro ao alterar status do usuário.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UsersIcon size={24} className="text-primary" />
            Gestão de Usuários e Acessos
          </h1>
          <p className="text-sm text-slate-400">
            Cadastre novos colaboradores e gerencie permissões de acesso ao sistema.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <UserPlusIcon size={16} />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/10 bg-slate-900 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <ShieldCheckIcon className="text-primary" size={20} />
                Cadastrar Novo Usuário
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Preencha os dados do novo usuário para conceder acesso ao sistema.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircleIcon size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-300">
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Ex: João da Silva"
                  className="border-white/10 bg-slate-950 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300">
                  E-mail de Acesso
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="joao@restaurante.com"
                  className="border-white/10 bg-slate-950 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300">
                  Senha Inicial
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="border-white/10 bg-slate-950 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-slate-300">
                  Nível de Acesso (Cargo)
                </Label>
                <select
                  id="role"
                  name="role"
                  defaultValue="ADMIN"
                  className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ADMIN">Administrador de Restaurante</option>
                  <option value="MANAGER">Gerente</option>
                  <option value="WAITER">Garçom</option>
                  <option value="KITCHEN">Operador de Cozinha / KDS</option>
                  <option value="SUPER_ADMIN">Super Administrador (Global)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isPending && <LoaderCircleIcon size={14} className="animate-spin" />}
                  {isPending ? "Cadastrando..." : "Cadastrar Usuário"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-white/10 bg-slate-900 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Usuários Cadastrados ({users.length})
          </CardTitle>
          <CardDescription className="text-slate-400">
            Lista de contas autorizadas a acessar este ambiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-white/10 rounded-md border border-white/10 bg-slate-950">
            {users.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Nenhum usuário cadastrado até o momento.
              </div>
            ) : (
              users.map((u) => {
                const roleInfo = roleLabels[u.role] ?? {
                  label: u.role,
                  badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
                };

                return (
                  <div
                    key={u.id}
                    className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{u.name}</span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleInfo.badge}`}
                        >
                          {roleInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          u.isActive ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {u.isActive ? (
                          <>
                            <CheckCircle2Icon size={13} /> Ativo
                          </>
                        ) : (
                          <>
                            <UserXIcon size={13} /> Inativo
                          </>
                        )}
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleToggleStatus(u.id, u.isActive)}
                        className={`gap-1 text-xs border-white/10 ${
                          u.isActive
                            ? "hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                            : "hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                        }`}
                      >
                        {u.isActive ? (
                          <>
                            <UserXIcon size={13} /> Desativar
                          </>
                        ) : (
                          <>
                            <UserCheckIcon size={13} /> Ativar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
