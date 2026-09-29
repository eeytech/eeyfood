"use client";

import type { ClientePausadoInfo } from "@fsw/db";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  PhoneIcon,
  PlayIcon,
  UserIcon,
} from "lucide-react";
import { useTransition } from "react";
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
  const [isPendingAll, startTransitionAll] = useTransition();

  if (!clientesPausados || clientesPausados.length === 0) {
    return null;
  }

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

  const handleReativarTodos = () => {
    startTransitionAll(async () => {
      await reativarBotAction(slug);
      toast.success("Robô reativado para todos os clientes!");
    });
  };

  return (
    <Card className="border-amber-300 bg-amber-50/80 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-amber-200/70">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
            <AlertTriangleIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-amber-900">
                Fila de Atendimento Humano Ativa
              </CardTitle>
              <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200 border-0 text-xs font-semibold px-2 py-0.5">
                {clientesPausados.length}{" "}
                {clientesPausados.length === 1 ? "cliente" : "clientes"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-amber-800/90 mt-0.5">
              O robô está silenciado individualmente para os clientes abaixo. Os demais clientes continuam sendo atendidos normalmente.
            </CardDescription>
          </div>
        </div>

        {clientesPausados.length > 1 && (
          <Button
            size="sm"
            onClick={handleReativarTodos}
            disabled={isPendingAll}
            className="gap-1.5 bg-amber-800 text-white hover:bg-amber-900 text-xs font-semibold rounded-lg shrink-0"
          >
            <CheckCircle2Icon size={14} />
            {isPendingAll ? "Reativando..." : "Reativar Todos"}
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-2.5">
        <div className="divide-y divide-amber-200/60 rounded-xl border border-amber-200 bg-white/70">
          {clientesPausados.map((cliente) => (
            <ClientePausadoItem
              key={cliente.customerPhone}
              slug={slug}
              cliente={cliente}
              formatPhone={formatPhone}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-800">
          <UserIcon size={12} className="shrink-0" />
          <span>
            Após concluir a conversa no WhatsApp, clique em &ldquo;Reativar Robô&rdquo; no cliente atendido para que o bot volte a responder mensagens dele.
          </span>
        </div>
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
  const [isPending, startTransition] = useTransition();

  const handleReativarIndividual = () => {
    startTransition(async () => {
      await reativarBotAction(slug, cliente.customerPhone);
      toast.success(`Robô reativado para ${formatPhone(cliente.customerPhone)}!`);
    });
  };

  const dataFormatada = new Date(cliente.pausedAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-amber-50/40 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-800 shrink-0">
          <PhoneIcon size={14} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {cliente.customerName || "Cliente"}
            </span>
            <span className="text-xs font-medium text-slate-600">
              {formatPhone(cliente.customerPhone)}
            </span>
          </div>
          <p className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
            <ClockIcon size={11} className="text-amber-600" />
            Solicitado em {dataFormatada}
          </p>
        </div>
      </div>

      <Button
        size="sm"
        onClick={handleReativarIndividual}
        disabled={isPending}
        className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold h-8 rounded-lg self-end sm:self-center"
      >
        <PlayIcon size={12} />
        {isPending ? "Reativando..." : "Reativar Robô"}
      </Button>
    </div>
  );
}
