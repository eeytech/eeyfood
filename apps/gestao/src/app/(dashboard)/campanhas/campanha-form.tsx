"use client";

import {
  AlertCircleIcon,
  CheckCheckIcon,
  InfoIcon,
  Loader2Icon,
  MessageSquareIcon,
  SendIcon,
  SmartphoneIcon,
  SparklesIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const TEMPLATES = [
  {
    title: "🎉 Desconto de Volta",
    segment: "INACTIVE",
    text: "Oi {nome}! Sentimos sua falta por aqui. Preparamos um presente: 10% de desconto no seu próximo pedido com o cupom VOLTA10. Peça hoje e aproveite!",
  },
  {
    title: "⭐ Benefício VIP",
    segment: "VIP",
    text: "Olá {nome}! Você é um dos nossos clientes mais especiais. Como agradecimento, liberamos frete grátis no seu próximo pedido válido para hoje!",
  },
  {
    title: "🔥 Novidade no Cardápio",
    segment: "ALL",
    text: "Oi {nome}! Tem novidade quentinha no nosso cardápio hoje. Acesse nosso cardápio digital e venha experimentar!",
  },
];

export function CampanhaForm({ segments, counts, dispatchAction }: CampanhaFormProps) {
  const [segment, setSegment] = useState("ALL");
  const [message, setMessage] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalRecipients = counts[segment] ?? 0;
  const currentSegmentLabel =
    segments.find((s) => s.value === segment)?.label ?? segment;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalRecipients === 0) {
      toast.error("Nenhum cliente disponível neste segmento para envio.");
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      toast.error("Por favor, digite uma mensagem válida de pelo menos 5 caracteres.");
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleExecuteDispatch = () => {
    setIsConfirmOpen(false);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("segment", segment);
        fd.append("message", message);
        const result = await dispatchAction(fd);
        toast.success(`Campanha enviada com sucesso para ${result.sent} de ${result.total} clientes!`);
        setMessage("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao disparar campanha.");
      }
    });
  };

  // Preview text with {nome} substituted by "Maria"
  const previewText = message
    ? message.replace(/{nome}/gi, "Maria")
    : "Olá Maria! Sua mensagem personalizada de WhatsApp aparecerá aqui em tempo real.";

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Dispatch Form (7 cols on desktop) */}
        <div className="lg:col-span-7">
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-slate-900 p-1.5 text-white">
                  <SendIcon size={16} />
                </div>
                <div>
                  <CardTitle className="font-display text-base font-semibold text-slate-900">
                    Novo Disparo de Mensagem
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Configure o público-alvo e componha o texto que será enviado aos clientes via WhatsApp.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <form onSubmit={handleOpenConfirm} className="space-y-4">
                {/* Segment Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="segment" className="text-xs font-semibold text-slate-700">
                    Público-Alvo / Segmento
                  </Label>
                  <Select
                    name="segment"
                    value={segment}
                    onValueChange={setSegment}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-700 focus:bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      {segments.map((seg) => (
                        <SelectItem
                          key={seg.value}
                          value={seg.value}
                          className="text-xs"
                        >
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span>{seg.label}</span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              ({counts[seg.value] ?? 0} clientes)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template quick pills */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <SparklesIcon size={13} className="text-amber-500" />
                      Modelos Rápidos de Mensagem
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Clique para preencher
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMessage(tmpl.text);
                          if (counts[tmpl.segment] !== undefined) {
                            setSegment(tmpl.segment);
                          }
                        }}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      >
                        {tmpl.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message" className="text-xs font-semibold text-slate-700">
                      Conteúdo da Mensagem
                    </Label>
                    <span className="text-[11px] text-slate-400">
                      Variável disponível: <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-700">{"{nome}"}</code>
                    </span>
                  </div>
                  <Textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Oi {nome}! Sentimos sua falta. Que tal pedir hoje e ganhar um desconto especial?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    minLength={5}
                    className="rounded-xl border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white resize-none"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                    <span>{message.length} caracteres digitados</span>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600">
                      {totalRecipients} cliente{totalRecipients !== 1 ? "s" : ""} selecionado{totalRecipients !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isPending || !message.trim() || totalRecipients === 0}
                  className="h-10 w-full gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                  {isPending ? (
                    <>
                      <Loader2Icon size={16} className="animate-spin" />
                      <span>Enviando mensagens via WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <SendIcon size={16} />
                      <span>Disparar Campanha para {totalRecipients} Clientes</span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live WhatsApp Preview & Best Practices (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Live Mobile WhatsApp Mockup */}
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <SmartphoneIcon size={14} className="text-slate-500" />
                  Prévia no WhatsApp
                </CardTitle>
                <span className="text-[11px] text-slate-400">Simulação cliente</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 bg-slate-100/70">
              {/* WhatsApp Chat Bubble Mockup */}
              <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-slate-200/60 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[11px] font-bold">
                    EEY
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Seu Restaurante</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Conta Comercial Verificada</p>
                  </div>
                </div>

                <div className="text-xs whitespace-pre-wrap leading-relaxed text-slate-800">
                  {previewText}
                </div>

                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                  <span>14:30</span>
                  <CheckCheckIcon size={13} className="text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices Guide Card */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <InfoIcon size={14} className="text-blue-500" />
                Diretrizes de Envio & Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <div className="rounded bg-blue-50 p-1 text-blue-600 shrink-0 mt-0.5">
                  <MessageSquareIcon size={12} />
                </div>
                <p>
                  <strong className="text-slate-900">Segmentação Focada:</strong> Envie mensagens voltadas para o estágio exato do cliente (Novos, VIP, Inativos) para maximizar o retorno.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded bg-emerald-50 p-1 text-emerald-600 shrink-0 mt-0.5">
                  <SparklesIcon size={12} />
                </div>
                <p>
                  <strong className="text-slate-900">Personalização:</strong> Incluir a tag <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-800">{"{nome}"}</code> aumenta a taxa de leitura em mais de 40%.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded bg-amber-50 p-1 text-amber-600 shrink-0 mt-0.5">
                  <AlertCircleIcon size={12} />
                </div>
                <p>
                  <strong className="text-slate-900">Intervalo Anti-Bloqueio:</strong> O sistema adiciona automaticamente um atraso entre cada disparo para manter a saúde do seu chip WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 bg-white p-6 shadow-xl">
          <DialogHeader>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm mb-2">
              <SendIcon size={20} />
            </div>
            <DialogTitle className="font-display text-lg font-bold text-center text-slate-900">
              Confirmar Disparo de Campanha
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-slate-500">
              Você está prestes a disparar esta mensagem via WhatsApp para{" "}
              <strong className="text-slate-900 font-semibold">{totalRecipients}</strong> cliente{totalRecipients !== 1 ? "s" : ""} no segmento{" "}
              <strong className="text-slate-900 font-semibold">&ldquo;{currentSegmentLabel}&rdquo;</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto">
            {previewText}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              className="h-10 rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleExecuteDispatch}
              className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <SendIcon size={14} />
              Confirmar e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
