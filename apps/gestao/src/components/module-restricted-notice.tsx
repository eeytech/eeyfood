import Link from "next/link";
import {
  ArrowLeftIcon,
  HeadphonesIcon,
  LockIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from "lucide-react";
import { getModuleById } from "@fsw/db/modules-constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ModuleRestrictedNoticeProps {
  moduleId: string;
  restaurantName?: string;
  userRole?: string;
}

export function ModuleRestrictedNotice({
  moduleId,
  restaurantName,
  userRole,
}: ModuleRestrictedNoticeProps) {
  const moduleInfo = getModuleById(moduleId);
  const moduleName = moduleInfo?.name || moduleId;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="max-w-xl w-full border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
        {/* Top accent line */}
        <div className="h-1.5 w-full bg-primary" />

        <CardContent className="p-6 sm:p-8 text-center space-y-6">
          {/* Icon Badge */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <LockIcon size={32} strokeWidth={2.2} />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary border border-primary/25">
              <ShieldAlertIcon size={13} />
              Módulo Não Incluso no Plano
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              {moduleName}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              O módulo <strong className="text-slate-800">"{moduleName}"</strong> não está ativo na
              licença contratada para o seu estabelecimento.
            </p>
          </div>

          {/* Upgrade info card */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-left text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <SparklesIcon size={14} className="text-primary" />
              <span>Deseja desbloquear esta funcionalidade?</span>
            </div>
            <p className="leading-relaxed">
              Planos superiores incluem ferramentas avançadas de gestão, inteligência artificial,
              automação de marketing, controle financeiro completo e integrações com canais de venda.
            </p>
            {userRole === "ADMIN" && (
              <p className="text-slate-500 pt-1 border-t border-slate-200/60">
                Como administrador, você pode solicitar a inclusão deste módulo a qualquer momento
                entrando em contato com a equipe comercial ou suporte.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild variant="outline" className="w-full sm:w-auto text-xs">
              <Link href="/pedidos">
                <ArrowLeftIcon size={14} className="mr-1.5" />
                Voltar para Pedidos
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto text-xs bg-primary hover:bg-primary/90 font-semibold shadow-xs">
              <Link href="/suporte">
                <HeadphonesIcon size={14} className="mr-1.5" />
                Falar com Suporte / Comercial
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
