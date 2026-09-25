"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CheckCircleIcon,
  FileTextIcon,
  SaveIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { salvarConfiguracoesFiscaisAction } from "../actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FiscalSettings, Restaurant } from "@fsw/db";

interface FiscalSettingsClientProps {
  slug: string;
  restaurant: Restaurant;
  fiscalSettings: FiscalSettings | null;
}

export function FiscalSettingsClient({
  slug,
  restaurant,
  fiscalSettings,
}: FiscalSettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await salvarConfiguracoesFiscaisAction(slug, fd);
        setSaved(true);
        toast.success("Configurações fiscais salvas com sucesso!");
        setTimeout(() => setSaved(false), 3000);
      } catch {
        toast.error("Erro ao salvar configurações fiscais.");
      }
    });
  };

  const ambiente = fiscalSettings?.ambienteFiscal ?? "homologacao";
  const hasToken = !!fiscalSettings?.focusNfeToken;

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <FileTextIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Configurações Fiscais (NFC-e)
            </h1>
            <p className="text-sm text-slate-500">
              Configure as credenciais e parâmetros para emissão automática de notas fiscais via FocusNFe.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              hasToken
                ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                : "bg-slate-100 text-slate-600 border-slate-200",
            )}
          >
            {hasToken ? "API Conectada" : "API Pendente"}
          </Badge>
          <Badge
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              ambiente === "producao"
                ? "bg-rose-50 text-rose-800 border-rose-200/80"
                : "bg-amber-50 text-amber-800 border-amber-200/80",
            )}
          >
            {ambiente === "producao" ? "Produção (SEFAZ Real)" : "Homologação (Testes)"}
          </Badge>
        </div>
      </div>

      {ambiente === "producao" && (
        <Alert className="border-rose-200 bg-rose-50/60 text-rose-900">
          <AlertTriangleIcon className="h-4 w-4 text-rose-600" />
          <AlertTitle className="font-semibold text-rose-900">Atenção: Ambiente de Produção Ativo</AlertTitle>
          <AlertDescription className="text-xs text-rose-700">
            Notas emitidas neste modo possuem valor fiscal legal perante a SEFAZ. Certifique-se de que os produtos possuem NCM e tributação corretos.
          </AlertDescription>
        </Alert>
      )}

      {saved && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="font-semibold text-emerald-900">Configurações Atualizadas com Sucesso!</AlertTitle>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da Empresa */}
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Dados da Empresa Emissora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cnpj" className="text-xs font-semibold text-slate-700">
                  CNPJ
                </Label>
                <Input
                  id="cnpj"
                  name="cnpj"
                  placeholder="00.000.000/0000-00"
                  defaultValue={fiscalSettings?.cnpj ?? restaurant.cnpj ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inscricaoEstadual" className="text-xs font-semibold text-slate-700">
                  Inscrição Estadual (IE)
                </Label>
                <Input
                  id="inscricaoEstadual"
                  name="inscricaoEstadual"
                  placeholder="000.000.000.000"
                  defaultValue={fiscalSettings?.inscricaoEstadual ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integração FocusNFe */}
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Integração FocusNFe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="focusNfeToken" className="text-xs font-semibold text-slate-700">
                Token de Acesso da API
              </Label>
              <Input
                id="focusNfeToken"
                name="focusNfeToken"
                type="password"
                placeholder="Insira sua chave de API FocusNFe"
                defaultValue={fiscalSettings?.focusNfeToken ?? ""}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
              />
              <p className="text-xs text-slate-500">
                Obtenha o token no painel oficial em{" "}
                <span className="font-semibold text-slate-700">app.focusnfe.com.br</span>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ambienteFiscal" className="text-xs font-semibold text-slate-700">
                  Ambiente de Emissão
                </Label>
                <select
                  id="ambienteFiscal"
                  name="ambienteFiscal"
                  defaultValue={fiscalSettings?.ambienteFiscal ?? "homologacao"}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:bg-white"
                >
                  <option value="homologacao">Homologação (Testes sem valor fiscal)</option>
                  <option value="producao">Produção (SEFAZ Real)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="serieNfce" className="text-xs font-semibold text-slate-700">
                  Série da NFC-e
                </Label>
                <Input
                  id="serieNfce"
                  name="serieNfce"
                  placeholder="001"
                  maxLength={3}
                  defaultValue={fiscalSettings?.serieNfce ?? "001"}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="webhookUrl" className="text-xs font-semibold text-slate-700">
                URL de Webhook (Opcional)
              </Label>
              <Input
                id="webhookUrl"
                name="webhookUrl"
                type="url"
                placeholder="https://meusite.com/api/webhook/nfe"
                defaultValue={fiscalSettings?.webhookUrl ?? ""}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            <SaveIcon size={15} />
            <span>{isPending ? "Salvando..." : "Salvar Configurações Fiscais"}</span>
          </Button>
          <p className="text-xs text-slate-500">
            As alterações são aplicadas instantaneamente às próximas emissões.
          </p>
        </div>
      </form>

      {/* Dica / Passo a passo */}
      <Card className="border-slate-200/80 bg-slate-50/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
            <ShieldCheckIcon size={16} className="text-emerald-600" />
            Como funciona a emissão de NFC-e nos pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs text-slate-600">
          <p>1. Insira o token FocusNFe e selecione o ambiente desejado acima.</p>
          <p>2. Certifique-se de que os produtos possuem NCM e CFOP válidos cadastrados no Cardápio.</p>
          <p>3. Ao finalizar um pedido em <strong>Pedidos</strong>, clique no botão <strong>&ldquo;Emitir NFC-e&rdquo;</strong>.</p>
          <p>4. O sistema transmite a nota diretamente para a SEFAZ e gera o link do DANFE e QR Code para impressão.</p>
        </CardContent>
      </Card>
    </div>
  );
}
