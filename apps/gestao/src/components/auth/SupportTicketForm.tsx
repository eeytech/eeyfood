"use client";

import { AlertCircleIcon, CheckCircle2Icon, HeadphonesIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = "idle" | "loading" | "success" | "error";

export function SupportTicketForm({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title")?.toString() ?? "";
    const message = formData.get("message")?.toString() ?? "";

    try {
      const response = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Erro ao enviar chamado.");
      }

      setState("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao enviar chamado.");
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2Icon size={32} className="text-green-500" />
        <div>
          <p className="font-medium text-white">Chamado enviado!</p>
          <p className="mt-1 text-sm text-slate-400">
            Nossa equipe entrará em contato em breve.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onClose} className="mt-2 border-white/10 text-white hover:bg-white/5 hover:text-white">
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeadphonesIcon size={16} className="text-slate-400" />
          <h3 className="text-sm font-medium text-white">Abrir Chamado de Suporte</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white"
        >
          <XIcon size={14} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {state === "error" && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <AlertCircleIcon size={13} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-title" className="text-xs text-slate-400">
            Título
          </Label>
          <Input
            id="ticket-title"
            name="title"
            placeholder="Resumo do problema"
            required
            maxLength={120}
            className="h-8 border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-600 focus-visible:border-white/20 focus-visible:ring-0"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-message" className="text-xs text-slate-400">
            Mensagem
          </Label>
          <Textarea
            id="ticket-message"
            name="message"
            placeholder="Descreva o problema em detalhes..."
            required
            rows={4}
            maxLength={1000}
            className="resize-none border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-600 focus-visible:border-white/20 focus-visible:ring-0"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="flex-1 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={state === "loading"} className="flex-1 gap-1.5">
            {state === "loading" && <LoaderCircleIcon size={13} className="animate-spin" />}
            {state === "loading" ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
