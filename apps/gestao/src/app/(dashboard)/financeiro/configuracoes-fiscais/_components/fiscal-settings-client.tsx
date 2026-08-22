"use client";

import { AlertTriangleIcon, CheckCircleIcon, FileTextIcon, SaveIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { salvarConfiguracoesFiscaisAction } from "../actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      await salvarConfiguracoesFiscaisAction(slug, fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const ambiente = fiscalSettings?.ambienteFiscal ?? "homologacao";
  const hasToken = !!fiscalSettings?.focusNfeToken;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Configurações Fiscais</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Configure as credenciais para emissão de NFC-e e NF-e via FocusNFe.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={hasToken ? "success" : "secondary"}>
          {hasToken ? "API Configurada" : "API não configurada"}
        </Badge>
        <Badge variant={ambiente === "producao" ? "danger" : "secondary"}>
          {ambiente === "producao" ? "Produção" : "Homologação (Teste)"}
        </Badge>
      </div>

      {ambiente === "producao" && (
        <Alert>
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertTitle>Ambiente de Produção</AlertTitle>
          <AlertDescription>
            Notas emitidas neste modo são válidas perante a SEFAZ. Certifique-se de que os dados
            estão corretos antes de emitir.
          </AlertDescription>
        </Alert>
      )}

      {saved && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-900">Configurações salvas!</AlertTitle>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  name="cnpj"
                  placeholder="00.000.000/0000-00"
                  defaultValue={fiscalSettings?.cnpj ?? restaurant.cnpj ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                <Input
                  id="inscricaoEstadual"
                  name="inscricaoEstadual"
                  placeholder="000.000.000.000"
                  defaultValue={fiscalSettings?.inscricaoEstadual ?? ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integração FocusNFe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="focusNfeToken">Token da API FocusNFe</Label>
              <Input
                id="focusNfeToken"
                name="focusNfeToken"
                type="password"
                placeholder="Seu token de homologação ou produção"
                defaultValue={fiscalSettings?.focusNfeToken ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Obtenha seu token em{" "}
                <span className="font-medium text-foreground">app.focusnfe.com.br</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ambienteFiscal">Ambiente</Label>
              <select
                id="ambienteFiscal"
                name="ambienteFiscal"
                defaultValue={fiscalSettings?.ambienteFiscal ?? "homologacao"}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="homologacao">Homologação (Testes)</option>
                <option value="producao">Produção (SEFAZ Real)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="webhookUrl">Webhook URL (opcional)</Label>
              <Input
                id="webhookUrl"
                name="webhookUrl"
                type="url"
                placeholder="https://seusite.com/webhook/nfe"
                defaultValue={fiscalSettings?.webhookUrl ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Numeração NFC-e</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="serieNfce">Série NFC-e</Label>
              <Input
                id="serieNfce"
                name="serieNfce"
                placeholder="001"
                maxLength={3}
                defaultValue={fiscalSettings?.serieNfce ?? "001"}
                className="max-w-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" className="gap-1.5" disabled={isPending}>
            <SaveIcon size={14} />
            {isPending ? "Salvando..." : "Salvar configurações"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Campos salvos são aplicados imediatamente às próximas emissões.
          </p>
        </div>
      </form>

      <Card className="border-slate-100 bg-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileTextIcon size={16} />
            Como emitir NFC-e em um pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>1. Configure o token FocusNFe e selecione o ambiente.</p>
          <p>2. Certifique-se de que os produtos possuem NCM e CFOP cadastrados.</p>
          <p>3. Acesse o pedido em <strong>Pedidos</strong> e clique em <strong>&ldquo;Emitir NFC-e&rdquo;</strong>.</p>
          <p>4. O sistema enviará a nota automaticamente e disponibilizará o link do DANFE.</p>
        </CardContent>
      </Card>
    </div>
  );
}
