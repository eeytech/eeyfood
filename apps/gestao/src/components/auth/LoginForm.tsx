"use client";

import { AlertCircleIcon, LoaderCircleIcon, StoreIcon } from "lucide-react";
import { useActionState } from "react";

import { loginAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <StoreIcon size={22} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-white">Sistema de Gestão</h1>
            <p className="mt-1 text-sm text-slate-400">Entre com suas credenciais para acessar</p>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          {state?.error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
              <AlertCircleIcon size={15} className="shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-slate-300">
              E-mail
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="voce@exemplo.com"
              required
              autoComplete="email"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-white/20 focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-slate-300">
              Senha
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-white/20 focus-visible:ring-0"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full gap-2"
          >
            {isPending && <LoaderCircleIcon size={15} className="animate-spin" />}
            {isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Acesso restrito a colaboradores autorizados
        </p>
      </div>
    </div>
  );
}
