"use client";

import type { ClientePausadoInfo } from "@fsw/db";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  HeadphonesIcon,
  MessageSquareIcon,
  PhoneIcon,
  PlayIcon,
  RotateCwIcon,
  UserCheckIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { reativarBotAction } from "@/app/(dashboard)/ai-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AiHandoffCardProps {
  slug: string;
  clientesPausados: ClientePausadoInfo[];
}

export function AiHandoffCard({ slug, clientesPausados }: AiHandoffCardProps) {
  const router = useRouter();
  const [isPendingAll, startTransitionAll] = useTransition();
  const [isRefreshing, startRefresh] = useTransition();

  const totalPausados = clientesPausados?.length ?? 0;
  const hasPausados = totalPausados > 0;

  const formatPhone = (rawPhone: string) => {
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length === 13) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return rawPhone;
  };

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh();
      toast.info("Fila de atendimento atualizada.");
    });
  };

  const handleReativarTodos = () => {
    startTransitionAll(async () => {
      try {
        await reativarBotAction(slug);
        toast.success("Robô reativado para todos os clientes da fila!");
        router.refresh();
      } catch {
        toast.error("Erro ao reativar robô para todos os clientes.");
      }
    });
  };

  return (
    <Card
      className={
        hasPausados
          ? "border-amber-300 bg-amber-50/60 shadow-sm overflow-hidden transition-colors"
          : "border-slate-200/80 bg-white shadow-sm overflow-hidden"
      }
    >
      <CardHeader
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border-b ${
          hasPausados ? "border-amber-200/70" : "border-slate-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              hasPausados
                ? "bg-amber-100 text-amber-800"
                : "bg-primary/10 text-primary"
            }`}
          >
            {hasPausados ? (
              <AlertTriangleIcon size={20} className="animate-pulse" />
            ) : (
              <HeadphonesIcon size={20} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle
                className={`font-display text-base font-semibold ${
                  hasPausados ? "text-amber-900" : "text-slate-900"
                }`}
              >
                Fila de Atendimento Humano
              </CardTitle>
              <Badge
                className={
                  hasPausados
                    ? "bg-amber-200/90 text-amber-900 hover:bg-amber-200 border-0 text-xs font-semibold px-2 py-0.5"
                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 text-xs font-medium px-2 py-0.5"
                }
              >
                <span
                  className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                    hasPausados ? "bg-amber-600 animate-ping" : "bg-primary"
                  }`}
                />
                {hasPausados
                  ? `${totalPausados} ${
                      totalPausados === 1 ? "cliente aguardando" : "clientes aguardando"
                    }`
                  : "Fila Vazia"}
              </Badge>
            </div>
            <CardDescription
              className={`text-xs mt-0.5 ${
                hasPausados ? "text-amber-800/90" : "text-slate-500"
              }`}
            >
              {hasPausados
                ? "O robô está silenciado individualmente para os clientes abaixo. Os demais clientes continuam sendo atendidos normalmente pela IA."
                : "Clientes que solicitam um atendente no WhatsApp são listados aqui com o robô silenciado apenas para a conversa deles."}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            title="Atualizar lista de clientes"
          >
            <RotateCwIcon
              size={13}
              className={isRefreshing ? "animate-spin text-slate-500" : "text-slate-500"}
            />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {hasPausados && (
            <Button
              type="button"
              size="sm"
              onClick={handleReativarTodos}
              disabled={isPendingAll}
              className="h-8 gap-1.5 rounded-lg bg-amber-800 px-3 text-xs font-semibold text-white shadow-sm hover:bg-amber-900"
            >
              <CheckCircle2Icon size={14} />
              {isPendingAll ? "Reativando..." : `Reativar Todos (${totalPausados})`}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {hasPausados ? (
          <div className="space-y-3">
            <div className="divide-y divide-amber-200/60 rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
              {clientesPausados.map((cliente) => (
                <ClientePausadoItem
                  key={cliente.customerPhone}
                  slug={slug}
                  cliente={cliente}
                  formatPhone={formatPhone}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-amber-100/60 px-3.5 py-2.5 text-[11px] text-amber-900">
              <UserIcon size={13} className="shrink-0 text-amber-700" />
              <span>
                Converse com o cliente pelo WhatsApp e, assim que o atendimento manual for finalizado, clique em <strong>&ldquo;Reativar Robô&rdquo;</strong> para que a Inteligência Artificial volte a atender automaticamente as próximas mensagens dele.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-7 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-inner">
              <UserCheckIcon size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              Nenhum cliente aguardando atendimento humano
            </h3>
            <p className="mt-1 max-w-lg text-xs text-slate-500 leading-relaxed">
              O robô com Inteligência Artificial está atendendo 100% das conversas automaticamente no WhatsApp. Quando um cliente pedir para falar com uma pessoa (&ldquo;atendente&rdquo;, &ldquo;falar com humano&rdquo;) ou expressar insatisfação, ele entrará nesta fila imediatamente.
            </p>
            <div className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-[11px] font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Pausa inteligente individual: um cliente em atendimento humano não bloqueia o atendimento dos outros.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClientePausadoItem({
  slug,
  cliente,
  formatPhone,
}: {
  slug: string;
  cliente: ClientePausadoInfo;
  formatPhone: (phone: string) => string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleReativarIndividual = () => {
    startTransition(async () => {
      try {
        await reativarBotAction(slug, cliente.customerPhone);
        toast.success(`Robô reativado para ${formatPhone(cliente.customerPhone)}!`);
        router.refresh();
      } catch {
        toast.error("Erro ao reativar robô para este cliente.");
      }
    });
  };

  const dataFormatada = new Date(cliente.pausedAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const phoneDigits = cliente.customerPhone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${phoneDigits}`;

  return (
    <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-amber-50/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800 shrink-0 font-semibold text-xs">
          <PhoneIcon size={14} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {cliente.customerName || "Cliente WhatsApp"}
            </span>
            <span className="text-xs font-medium text-slate-600 font-mono">
              {formatPhone(cliente.customerPhone)}
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
            <ClockIcon size={11} className="text-amber-600 shrink-0" />
            <span>Pausado em {dataFormatada}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-primary transition-colors"
          title="Abrir conversa no WhatsApp Web"
        >
          <MessageSquareIcon size={13} className="text-primary" />
          Conversar
        </a>

        <Button
          type="button"
          size="sm"
          onClick={handleReativarIndividual}
          disabled={isPending}
          className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
        >
          <PlayIcon size={12} />
          {isPending ? "Reativando..." : "Reativar IA"}
        </Button>
      </div>
    </div>
  );
}
