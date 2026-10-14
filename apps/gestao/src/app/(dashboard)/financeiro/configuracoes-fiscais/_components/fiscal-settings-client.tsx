"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CheckCircleIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  FileCheckIcon,
  FileTextIcon,
  GlobeIcon,
  HelpCircleIcon,
  KeyRoundIcon,
  Loader2Icon,
  RefreshCwIcon,
  SaveIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  consultarCnpjAcbrAction,
  salvarConfiguracoesFiscaisAction,
  testarConexaoAcbrAction,
} from "../actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCnpj, formatIe } from "@/lib/masks";
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
  const [isTesting, setIsTesting] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);

  // Estados locais para preenchimento automático pelo CNPJ
  const [cnpj, setCnpj] = useState(formatCnpj(fiscalSettings?.cnpj ?? restaurant.cnpj ?? ""));
  const [ie, setIe] = useState(formatIe(fiscalSettings?.inscricaoEstadual ?? ""));
  const [im, setIm] = useState(fiscalSettings?.inscricaoMunicipal ?? "");
  const [codigoMun, setCodigoMun] = useState(fiscalSettings?.codigoMunicipio ?? "");

  const [tipoDocState, setTipoDocState] = useState(fiscalSettings?.tipoDocumentoPadrao ?? "NFCE");
  const [ambienteState, setAmbienteState] = useState(fiscalSettings?.ambienteFiscal ?? "homologacao");
  const [regimeState, setRegimeState] = useState(fiscalSettings?.regimeTributario ?? "SIMPLES_NACIONAL");
  const [provedorState, setProvedorState] = useState(fiscalSettings?.provedorNfse ?? "padrao");

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tempoRespostaMs?: number;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await salvarConfiguracoesFiscaisAction(slug, fd);
        setSaved(true);
        toast.success("Configurações fiscais da ACBr API salvas com sucesso!");
        setTimeout(() => setSaved(false), 4000);
      } catch {
        toast.error("Erro ao salvar configurações fiscais.");
      }
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const formEl = document.getElementById("fiscal-settings-form") as HTMLFormElement | null;
      const fd = formEl ? new FormData(formEl) : undefined;
      const res = await testarConexaoAcbrAction(slug, fd);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao testar conexão.";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleConsultarCnpj = async () => {
    if (!cnpj) {
      toast.error("Digite o CNPJ para consultar.");
      return;
    }
    setIsSearchingCnpj(true);
    try {
      const res = await consultarCnpjAcbrAction(slug, cnpj);
      if (res.success) {
        toast.success(`CNPJ localizado: ${res.razaoSocial || res.nomeFantasia}`);
        if (res.municipio && !codigoMun) {
          toast.info(`Cidade: ${res.municipio} - ${res.uf}`);
        }
      } else {
        toast.error(res.errorMessage || "Não foi possível consultar este CNPJ.");
      }
    } catch {
      toast.error("Erro ao consultar CNPJ via ACBr API.");
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const ambiente = fiscalSettings?.ambienteFiscal ?? "homologacao";
  const hasCredentials = !!(fiscalSettings?.acbrClientId && fiscalSettings?.acbrClientSecret);
  const tipoDoc = fiscalSettings?.tipoDocumentoPadrao ?? "NFCE";

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md">
            <FileCheckIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Configurações Fiscais (ACBr API)
              </h1>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300 font-medium text-xs">
                Gratuito / Projeto ACBr
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Emissão oficial de <strong>NFC-e</strong> (consumidor), <strong>NF-e</strong> (mercadorias) e <strong>NFS-e</strong> (serviços DPS) via API aberta do Projeto ACBr.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold shadow-xs",
              hasCredentials
                ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                : "bg-amber-50 text-amber-800 border-amber-200/80",
            )}
          >
            {hasCredentials ? "ACBr API Configurada" : "Credenciais Pendentes"}
          </Badge>
          <Badge
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold shadow-xs",
              ambiente === "producao"
                ? "bg-rose-50 text-rose-800 border-rose-200/80"
                : "bg-sky-50 text-sky-800 border-sky-200/80",
            )}
          >
            {ambiente === "producao" ? "Produção (SEFAZ Real)" : "Homologação (Testes Gratuitos)"}
          </Badge>
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border-slate-200">
            Padrão: {tipoDoc === "NFSE" ? "NFS-e (Serviços)" : tipoDoc === "NFE" ? "NF-e (Mod. 55)" : "NFC-e (Consumidor)"}
          </Badge>
        </div>
      </div>

      {/* Alerta de Produção */}
      {ambiente === "producao" && (
        <Alert className="border-rose-200 bg-rose-50/70 text-slate-900">
          <AlertTriangleIcon className="h-4 w-4 text-rose-600" />
          <AlertTitle className="font-semibold text-rose-900">Atenção: Ambiente de Produção Oficial Ativo</AlertTitle>
          <AlertDescription className="text-xs text-rose-800">
            Documentos emitidos neste modo possuem validade fiscal legal perante a Secretaria da Fazenda (SEFAZ) e Prefeituras. Certifique-se de que o certificado A1 e o código CSC da empresa estão devidamente homologados.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de Sucesso ao Salvar */}
      {saved && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="font-semibold text-emerald-900">Configurações Fiscais Atualizadas!</AlertTitle>
          <AlertDescription className="text-xs text-emerald-800">
            As alterações estão ativas para as próximas emissões de notas fiscais do estabelecimento.
          </AlertDescription>
        </Alert>
      )}

      {/* Banner explicativo ACBr API */}
      <Card className="border-emerald-200/80 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white shadow-xs">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <SparklesIcon size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Integração Nativa com ACBr API (Gratuita &amp; Aberta)
              </h2>
              <p className="text-xs text-slate-600">
                Livre de mensalidades de APIs pagas como FocusNFe e PlugNotas. Crie sua conta gratuita em <strong className="text-slate-800">acbr.api.br</strong> e gere seu Client ID &amp; Secret.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://acbr.api.br/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-50 transition-colors"
            >
              <span>Painel ACBr API</span>
              <ExternalLinkIcon size={13} />
            </a>
            <a
              href="https://www.projetoacbr.com.br/forum/topic/84682-%F0%9F%8E%93primeiros-passos-com-a-nota-fiscal-de-servi%C3%A7os-eletr%C3%B4nica-nfse/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <span>Fórum &amp; Guia NFS-e</span>
              <ExternalLinkIcon size={13} />
            </a>
          </div>
        </CardContent>
      </Card>

      <form id="fiscal-settings-form" onSubmit={handleSubmit} className="space-y-6">
        {/* ── 1. Credenciais ACBr API ────────────────────────────────────────── */}
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
                  <KeyRoundIcon size={18} className="text-emerald-600" />
                  Credenciais da ACBr API (OAuth 2.0)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Insira o Client ID e Client Secret obtidos no painel da ACBr API.
                </CardDescription>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="gap-2 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                {isTesting ? (
                  <Loader2Icon size={14} className="animate-spin text-emerald-600" />
                ) : (
                  <RefreshCwIcon size={14} />
                )}
                <span>{isTesting ? "Testando..." : "Testar Conexão"}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {testResult && (
              <Alert
                className={cn(
                  "py-2.5 text-xs",
                  testResult.success
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                    : "border-rose-200 bg-rose-50/70 text-rose-900",
                )}
              >
                {testResult.success ? (
                  <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangleIcon className="h-4 w-4 text-rose-600" />
                )}
                <AlertTitle className="font-semibold">
                  {testResult.success ? "Conexão Bem-Sucedida!" : "Falha na Comunicação"}
                </AlertTitle>
                <AlertDescription className="mt-0.5">
                  {testResult.message}
                  {testResult.tempoRespostaMs && (
                    <span className="ml-1 opacity-75">
                      ({testResult.tempoRespostaMs}ms)
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="acbrClientId" className="text-xs font-semibold text-slate-700">
                  Client ID da ACBr API <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="acbrClientId"
                  name="acbrClientId"
                  placeholder="Ex: c1d2e3f4-5678-..."
                  defaultValue={fiscalSettings?.acbrClientId ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-sm text-slate-900 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acbrClientSecret" className="text-xs font-semibold text-slate-700">
                  Client Secret da ACBr API <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="acbrClientSecret"
                    name="acbrClientSecret"
                    type={showSecret ? "text" : "password"}
                    placeholder="Chave secreta client_secret"
                    defaultValue={fiscalSettings?.acbrClientSecret ?? ""}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pr-10 font-mono text-sm text-slate-900 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showSecret ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tipoDocumentoPadrao" className="text-xs font-semibold text-slate-700">
                  Tipo de Documento Fiscal Padrão
                </Label>
                <Select
                  name="tipoDocumentoPadrao"
                  value={tipoDocState}
                  onValueChange={setTipoDocState}
                >
                  <SelectTrigger id="tipoDocumentoPadrao" className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="NFCE">NFC-e (Consumidor Final - Restaurantes/Delivery/PDV)</SelectItem>
                    <SelectItem value="NFE">NF-e (Modelo 55 - Mercadorias e Vendas com DANFE Completo)</SelectItem>
                    <SelectItem value="NFSE">NFS-e (Serviços - DPS Padrão Nacional / Municipal)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  Para restaurantes e delivery, a <strong>NFC-e</strong> é a recomendada para emissão no caixa e pedidos.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ambienteFiscal" className="text-xs font-semibold text-slate-700">
                  Ambiente de Emissão
                </Label>
                <Select
                  name="ambienteFiscal"
                  value={ambienteState}
                  onValueChange={setAmbienteState}
                >
                  <SelectTrigger id="ambienteFiscal" className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white">
                    <SelectValue placeholder="Selecione o ambiente" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="homologacao">Homologação (Testes gratuitos sem valor jurídico)</SelectItem>
                    <SelectItem value="producao">Produção (SEFAZ Real - Validade Jurídica)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 2. Dados da Empresa Emissora ───────────────────────────────────── */}
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Dados da Empresa Emissora
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Informações cadastrais para identificação no cabeçalho fiscal da SEFAZ e prefeituras.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cnpj" className="text-xs font-semibold text-slate-700">
                  CNPJ do Restaurante
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cnpj"
                    name="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-sm text-slate-900 focus:bg-white"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleConsultarCnpj}
                    disabled={isSearchingCnpj || !hasCredentials}
                    title="Consultar dados da empresa gratuitamente pela ACBr API"
                    className="h-10 shrink-0 gap-1.5 rounded-xl border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    {isSearchingCnpj ? (
                      <Loader2Icon size={14} className="animate-spin text-emerald-600" />
                    ) : (
                      <SearchIcon size={14} />
                    )}
                    <span>Consultar CNPJ</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inscricaoEstadual" className="text-xs font-semibold text-slate-700">
                  Inscrição Estadual (IE)
                </Label>
                <Input
                  id="inscricaoEstadual"
                  name="inscricaoEstadual"
                  placeholder="000.000.000.000"
                  value={ie}
                  onChange={(e) => setIe(formatIe(e.target.value))}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-sm text-slate-900 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="inscricaoMunicipal" className="text-xs font-semibold text-slate-700">
                  Inscrição Municipal (NFS-e)
                </Label>
                <Input
                  id="inscricaoMunicipal"
                  name="inscricaoMunicipal"
                  placeholder="Ex: 1234567"
                  value={im}
                  onChange={(e) => setIm(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="codigoMunicipio" className="text-xs font-semibold text-slate-700">
                  Código IBGE do Município (7 dígitos)
                </Label>
                <Input
                  id="codigoMunicipio"
                  name="codigoMunicipio"
                  placeholder="Ex: 3550308 (São Paulo)"
                  value={codigoMun}
                  onChange={(e) => setCodigoMun(e.target.value)}
                  maxLength={7}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-sm text-slate-900 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="regimeTributario" className="text-xs font-semibold text-slate-700">
                  Regime Tributário
                </Label>
                <Select
                  name="regimeTributario"
                  value={regimeState}
                  onValueChange={setRegimeState}
                >
                  <SelectTrigger id="regimeTributario" className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white">
                    <SelectValue placeholder="Selecione o regime" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="SIMPLES_NACIONAL">Simples Nacional (ME/EPP)</SelectItem>
                    <SelectItem value="SIMPLES_EXCESSO">Simples Nacional - Excesso Sublimite</SelectItem>
                    <SelectItem value="REGIME_NORMAL">Regime Normal (Lucro Presumido / Real)</SelectItem>
                    <SelectItem value="MEI">MEI - Microempreendedor Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 3. Parâmetros SEFAZ / NFC-e / NFS-e ────────────────────────────── */}
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Parâmetros SEFAZ &amp; Código de Segurança do Contribuinte (CSC)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Obrigatórios para a geração do QR Code de consulta pública da NFC-e perante a SEFAZ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cscId" className="text-xs font-semibold text-slate-700">
                  Id do Token CSC (ex: 1, 000001)
                </Label>
                <Input
                  id="cscId"
                  name="cscId"
                  placeholder="000001"
                  defaultValue={fiscalSettings?.cscId ?? "000001"}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-sm text-slate-900 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cscCodigo" className="text-xs font-semibold text-slate-700">
                  Código CSC (Código alfanumérico fornecido pela SEFAZ)
                </Label>
                <Input
                  id="cscCodigo"
                  name="cscCodigo"
                  placeholder="Ex: 0123456789ABCDEF0123456789ABCDEF"
                  defaultValue={fiscalSettings?.cscCodigo ?? ""}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-sm text-slate-900 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
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

              <div className="space-y-1.5">
                <Label htmlFor="serieNfe" className="text-xs font-semibold text-slate-700">
                  Série da NF-e
                </Label>
                <Input
                  id="serieNfe"
                  name="serieNfe"
                  placeholder="001"
                  maxLength={3}
                  defaultValue={fiscalSettings?.serieNfe ?? "001"}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="provedorNfse" className="text-xs font-semibold text-slate-700">
                  Provedor NFS-e (Serviços)
                </Label>
                <Select
                  name="provedorNfse"
                  value={provedorState}
                  onValueChange={setProvedorState}
                >
                  <SelectTrigger id="provedorNfse" className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white">
                    <SelectValue placeholder="Selecione o provedor" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="padrao">Padrão da Prefeitura Municipal</SelectItem>
                    <SelectItem value="nacional">Padrão Nacional ADN (Gov.br)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="webhookUrl" className="text-xs font-semibold text-slate-700">
                URL de Webhook para Eventos / Retornos (Opcional)
              </Label>
              <Input
                id="webhookUrl"
                name="webhookUrl"
                type="url"
                placeholder="https://seusite.com/api/webhook/fiscal"
                defaultValue={fiscalSettings?.webhookUrl ?? ""}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Botão de Salvar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={isPending}
              className="h-11 gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2Icon size={16} className="animate-spin" />
              ) : (
                <SaveIcon size={16} />
              )}
              <span>{isPending ? "Salvando configurações..." : "Salvar Configurações Fiscais"}</span>
            </Button>
            <p className="text-xs text-slate-500 hidden sm:block">
              As alterações são aplicadas instantaneamente às emissões de notas nos pedidos.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="h-11 gap-2 rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <GlobeIcon size={16} className="text-emerald-600" />
            <span>Testar SEFAZ com ACBr</span>
          </Button>
        </div>
      </form>

      {/* ── Guia Passo a Passo ──────────────────────────────────────────────── */}
      <Card className="border-slate-200/80 bg-slate-50/70 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
            <ShieldCheckIcon size={18} className="text-emerald-600" />
            Como emitir notas fiscais pelo sistema usando a ACBr API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-600">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs space-y-1">
              <span className="font-semibold text-slate-800">1. Cadastro na ACBr API</span>
              <p>
                Acesse <a href="https://acbr.api.br" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-medium">acbr.api.br</a>, crie sua conta e gere suas credenciais (Client ID e Client Secret).
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs space-y-1">
              <span className="font-semibold text-slate-800">2. Produtos com NCM e CFOP</span>
              <p>
                No menu <strong>Cardápio</strong>, certifique-se de que os produtos possuem NCM (ex: 2106.90.90 para alimentos preparados) e CFOP (5102 para saída).
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs space-y-1">
              <span className="font-semibold text-slate-800">3. Emissão em Pedidos &amp; PDV</span>
              <p>
                Ao finalizar ou visualizar pedidos no painel de <strong>Pedidos</strong> ou no <strong>PDV</strong>, clique em <strong>&ldquo;Emitir Nota Fiscal&rdquo;</strong>.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs space-y-1">
              <span className="font-semibold text-slate-800">4. DANFE e QR Code Automáticos</span>
              <p>
                A ACBr API transmite para a SEFAZ estadual e retorna o link oficial do PDF do DANFE e do QR Code para impressão na impressora térmica ou envio ao cliente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
