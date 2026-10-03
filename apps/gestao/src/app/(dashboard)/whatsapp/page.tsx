import {
  AlertCircleIcon,
  BotIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buscarAiSettingsPorSlug,
  buscarRestauranteParaGestao,
} from "@/lib/admin-queries";
import { WhatsAppConnectionCard } from "../ai/whatsapp-connection-card";

export const dynamic = "force-dynamic";

interface PageProps {
  params?: Promise<{ slug?: string }>;
}

export default async function WhatsAppPage({ params }: PageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    notFound();
  }

  const slug = restaurant.slug;
  const aiSettings = await buscarAiSettingsPorSlug(slug);

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
          <MessageSquareIcon size={22} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            WhatsApp
          </h1>
          <p className="text-sm text-slate-500">
            Conecte o número do seu restaurante via QR Code para habilitar atendente com IA, disparo de campanhas e recuperação de carrinhos.
          </p>
        </div>
      </div>

      {/* ── WhatsApp QR Code & Connection Card ────────────── */}
      <WhatsAppConnectionCard
        slug={slug}
        initialInstanceName={aiSettings?.evolutionInstanceName}
      />

      {/* ── Bottom Grid: Features using WhatsApp & Guidelines ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Recursos Integrados (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
                <ShieldCheckIcon size={18} className="text-primary" />
                Recursos Conectados ao WhatsApp
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Módulos do sistema que utilizam esta conexão para interagir diretamente com seus clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors hover:bg-slate-50">
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  <MegaphoneIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      Campanhas de Marketing e Mensagens
                    </p>
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary">
                      Disparo em Massa
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Envie mensagens promocionais segmentadas por grupo (Novos, VIP, Inativos) ou para contatos individuais com alta taxa de conversão.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors hover:bg-slate-50">
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  <ShoppingCartIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      Recuperação de Carrinho Abandonado
                    </p>
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary">
                      Automático
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Clientes que adicionaram itens e iniciaram o pedido sem finalizar recebem automaticamente um lembrete com incentivo de cupom pelo WhatsApp.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors hover:bg-slate-50">
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  <BotIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      Atendente Virtual com IA
                    </p>
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary">
                      Chatbot Inteligente
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Responde dúvidas do cardápio, registra intenção de pedidos e envia o link do cardápio 24 horas por dia.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Guia de Boas Práticas (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <QrCodeIcon size={14} className="text-primary" />
                Como Conectar seu Aparelho
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600">
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    1
                  </span>
                  <span>Clique em &ldquo;Conectar WhatsApp&rdquo; acima</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    2
                  </span>
                  <span>No celular, acesse Aparelhos Conectados</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    3
                  </span>
                  <span>Aponte a câmera para o QR Code gerado</span>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1 text-slate-500">
                <AlertCircleIcon size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Para garantir a estabilidade do envio de mensagens, certifique-se de que o aparelho celular permaneça ligado e com acesso regular à internet.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
