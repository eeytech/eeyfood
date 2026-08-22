"use client";

import { Loader2Icon, SendIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Segment {
  value: string;
  label: string;
}

interface CampanhaFormProps {
  segments: Segment[];
  counts: Record<string, number>;
  dispatchAction: (formData: FormData) => Promise<{ sent: number; total: number }>;
}

export function CampanhaForm({ segments, counts, dispatchAction }: CampanhaFormProps) {
  const [segment, setSegment] = useState("ALL");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as HTMLFormElement;
    const total = counts[segment] ?? 0;

    if (total === 0) {
      toast.error("Nenhum cliente neste segmento.");
      return;
    }

    const confirmed = window.confirm(
      `Confirmar envio para ${total} cliente(s) no segmento "${segments.find((s) => s.value === segment)?.label}"?`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        const fd = new FormData(target);
        const result = await dispatchAction(fd);
        toast.success(`Campanha enviada para ${result.sent} de ${result.total} clientes.`);
        setMessage("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao disparar campanha.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="segment">Segmento</Label>
        <Select
          name="segment"
          value={segment}
          onValueChange={setSegment}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {segments.map((seg) => (
              <SelectItem key={seg.value} value={seg.value}>
                {seg.label}{" "}
                <span className="text-muted-foreground">({counts[seg.value] ?? 0})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Mensagem</Label>
        <Textarea
          id="message"
          name="message"
          rows={6}
          placeholder={`Oi {nome}! Sentimos sua falta. Que tal pedir hoje e ganhar um desconto especial?`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={5}
        />
        <p className="text-xs text-muted-foreground">
          {message.length} caracteres · {counts[segment] ?? 0} destinatários
        </p>
      </div>

      <Button type="submit" disabled={isPending || !message.trim()} className="w-full">
        {isPending ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <SendIcon className="mr-2 h-4 w-4" />
            Disparar Campanha
          </>
        )}
      </Button>
    </form>
  );
}
