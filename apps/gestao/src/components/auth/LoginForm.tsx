"use client";

import {
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Image from "next/image";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 selection:bg-primary selection:text-white">
      {/* ── Fundo Formal Corporativo com Iluminação Ambiente ── */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(2,6,23,0))]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
        aria-hidden="true"
      />

      {/* Grid sutil decorativo formal */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* ── Cartão Formal de Autenticação ── */}
        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {/* ── Header Institucional com Logo eeyTech ── */}
          <div className="mb-8 flex flex-col items-center text-center">
            {/* Logo da eeyTech */}
            <div className="relative mb-4 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-inner shadow-black/60 transition-transform duration-300 hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="eeyTech Logo"
                  width={48}
                  height={48}
                  className="h-full w-full object-contain filter drop-shadow-[0_2px_8px_rgba(59,130,246,0.35)]"
                  priority
                />
              </div>
            </div>

            {/* Identificação Corporativa */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <ShieldCheckIcon size={13} className="shrink-0" />
              <span>Plataforma Corporativa</span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              eeyTech <span className="font-light text-slate-300">Gestão</span>
            </h1>
            <p className="mt-1.5 text-xs text-slate-400">
              Autenticação segura de operadores e gestores credenciados
            </p>
          </div>

          {/* ── Formulário de Acesso ── */}
          <form action={formAction} className="flex flex-col gap-4">
            {state?.error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircleIcon size={16} className="mt-0.5 shrink-0 text-red-400" />
                <span className="leading-relaxed">{state.error}</span>
              </div>
            )}

            {/* Campo E-mail */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                E-mail Corporativo
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <MailIcon size={16} />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="operador@eeytech.com"
                  required
                  autoComplete="email"
                  className="h-11 rounded-xl border-slate-700/80 bg-slate-950/60 pl-10 text-sm text-white placeholder:text-slate-500 shadow-inner focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Senha de Acesso
                </Label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <LockIcon size={16} />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-xl border-slate-700/80 bg-slate-950/60 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 shadow-inner focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition-colors hover:text-white"
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            {/* Botão de Submissão Formal */}
            <Button
              type="submit"
              disabled={isPending}
              className="mt-2 h-11 w-full gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/35 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <LoaderCircleIcon size={16} className="animate-spin" />
                  <span>Validando Credenciais...</span>
                </>
              ) : (
                <span>Acessar Painel de Gestão</span>
              )}
            </Button>
          </form>

          {/* ── Rodapé Formal Institucional ── */}
          <div className="mt-8 border-t border-slate-800/80 pt-5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Ambiente Protegido por Criptografia TLS de 256 bits</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              © {new Date().getFullYear()} eeyTech Soluções de Tecnologia • Todos os direitos reservados.
              <br />
              Acesso estritamente restrito a funcionários autorizados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
