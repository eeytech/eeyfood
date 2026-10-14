"use client";

import type { PrinterConnectionType, PrinterRole, RestaurantPrinter } from "@fsw/db";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChefHatIcon,
  ExternalLinkIcon,
  HelpCircleIcon,
  LaptopIcon,
  Loader2Icon,
  NetworkIcon,
  PlayIcon,
  PlusIcon,
  PowerIcon,
  PrinterIcon,
  ReceiptIcon,
  RefreshCwIcon,
  Trash2Icon,
  UsbIcon,
  WineIcon,
  WrenchIcon,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  checkLocalAgentStatus,
  fetchInstalledPrintersFromAgent,
  type InstalledPrinterInfo,
  type LocalAgentStatus,
} from "@/lib/printer/client-print-dispatcher";
import { cn } from "@/lib/utils";

import {
  alternarStatusImpressoraAction,
  excluirImpressoraAction,
  salvarImpressoraAction,
  type SalvarImpressoraInput,
  testarImpressoraAction,
} from "./impressoras-actions";

interface RestaurantPrintersManagerProps {
  slug: string;
  initialPrinters: RestaurantPrinter[];
}

export function RestaurantPrintersManager({
  slug,
  initialPrinters,
}: RestaurantPrintersManagerProps) {
  const { currentThemeConfig } = useTheme();
  const [printers, setPrinters] = useState<RestaurantPrinter[]>(initialPrinters);
  const [agentStatus, setAgentStatus] = useState<LocalAgentStatus>({ isOnline: false });
  const [isCheckingAgent, setIsCheckingAgent] = useState(false);
  const [windowsPrinters, setWindowsPrinters] = useState<InstalledPrinterInfo[]>([]);

  // Dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<RestaurantPrinter | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTestingId, setIsTestingId] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState<SalvarImpressoraInput>({
    name: "",
    role: "KITCHEN",
    connectionType: "NETWORK_TCP",
    ipAddress: "192.168.1.200",
    port: 9100,
    spoolerName: "",
    paperWidth: 80,
    cutPaper: true,
    openDrawer: false,
    copies: 1,
    isActive: true,
    autoPrintOnNewOrder: true,
    printPrices: false,
    printCustomerDetails: true,
    printObservations: true,
  });

  const checkAgent = useCallback(async () => {
    setIsCheckingAgent(true);
    try {
      const status = await checkLocalAgentStatus();
      setAgentStatus(status);
      if (status.isOnline) {
        const detected = await fetchInstalledPrintersFromAgent();
        setWindowsPrinters(detected);
      }
    } finally {
      setIsCheckingAgent(false);
    }
  }, []);

  useEffect(() => {
    checkAgent();
  }, [checkAgent]);

  const handleOpenAddModal = () => {
    setEditingPrinter(null);
    setFormData({
      name: "",
      role: "KITCHEN",
      connectionType: "NETWORK_TCP",
      ipAddress: "192.168.1.200",
      port: 9100,
      spoolerName: windowsPrinters.length > 0 ? windowsPrinters[0].name : "",
      paperWidth: 80,
      cutPaper: true,
      openDrawer: false,
      copies: 1,
      isActive: true,
      autoPrintOnNewOrder: true,
      printPrices: false,
      printCustomerDetails: true,
      printObservations: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (printer: RestaurantPrinter) => {
    setEditingPrinter(printer);
    setFormData({
      id: printer.id,
      name: printer.name,
      role: printer.role,
      connectionType: printer.connectionType,
      ipAddress: printer.ipAddress || "",
      port: printer.port || 9100,
      spoolerName: printer.spoolerName || "",
      paperWidth: printer.paperWidth || 80,
      cutPaper: printer.cutPaper,
      openDrawer: printer.openDrawer,
      copies: printer.copies || 1,
      isActive: printer.isActive,
      autoPrintOnNewOrder: printer.autoPrintOnNewOrder,
      printPrices: printer.printPrices,
      printCustomerDetails: printer.printCustomerDetails,
      printObservations: printer.printObservations,
    });
    setIsModalOpen(true);
  };

  // Quando o usuário muda a função da impressora, sugere configurações ideais automaticamente
  const handleRoleChange = (role: PrinterRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      printPrices: role === "CASHIER" || role === "BOTH",
      openDrawer: role === "CASHIER",
      connectionType: role === "KITCHEN" ? "NETWORK_TCP" : prev.connectionType,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Informe o nome identificador da impressora.");
      return;
    }

    startTransition(async () => {
      const res = await salvarImpressoraAction(slug, formData);
      if (res.success && res.printer) {
        toast.success(res.message);
        setPrinters((prev) => {
          if (formData.id) {
            return prev.map((p) => (p.id === formData.id ? res.printer! : p));
          }
          return [...prev, res.printer!];
        });
        setIsModalOpen(false);
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleToggleStatus = (printer: RestaurantPrinter) => {
    const nextStatus = !printer.isActive;
    startTransition(async () => {
      const res = await alternarStatusImpressoraAction(slug, printer.id, nextStatus);
      if (res.success) {
        toast.success(res.message);
        setPrinters((prev) =>
          prev.map((p) => (p.id === printer.id ? { ...p, isActive: nextStatus } : p)),
        );
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDelete = (printer: RestaurantPrinter) => {
    if (!confirm(`Deseja realmente remover a impressora "${printer.name}"?`)) return;

    startTransition(async () => {
      const res = await excluirImpressoraAction(slug, printer.id);
      if (res.success) {
        toast.success(res.message);
        setPrinters((prev) => prev.filter((p) => p.id !== printer.id));
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleTestPrint = async (printer: RestaurantPrinter) => {
    setIsTestingId(printer.id);
    try {
      const res = await testarImpressoraAction(slug, printer.id);
      if (res.success) {
        toast.success(`Teste disparado com sucesso para ${printer.name}!`);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsTestingId(null);
    }
  };

  const kitchenPrintersCount = printers.filter((p) => p.role === "KITCHEN" && p.isActive).length;
  const cashierPrintersCount = printers.filter((p) => p.role === "CASHIER" && p.isActive).length;

  return (
    <div className="space-y-6">
      {/* ── Header & Banner Arquitetural ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
            Impressoras & Roteamento de Vias
          </h2>
          <p className="text-sm text-slate-500">
            Configure múltiplas impressoras (Cozinha via Cabo de Rede e Caixa via Cabo USB) com
            separação automática de vias de produção e conferência.
          </p>
        </div>

        <Button
          onClick={handleOpenAddModal}
          className="h-10 gap-2 font-semibold shadow-sm"
          style={{ backgroundColor: currentThemeConfig.hex }}
        >
          <PlusIcon size={16} />
          <span>Nova Impressora</span>
        </Button>
      </div>

      {/* ── Status do Agente Local ────────────────────────────────────────── */}
      <Card
        className={cn(
          "border transition-all shadow-xs",
          agentStatus.isOnline
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-amber-200 bg-amber-50/40",
        )}
      >
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                agentStatus.isOnline
                  ? "bg-emerald-500 text-white shadow-xs shadow-emerald-500/20"
                  : "bg-amber-500 text-white shadow-xs shadow-amber-500/20",
              )}
            >
              <LaptopIcon size={20} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900">
                  Agente de Impressão Local (Windows / Spooler / Rede)
                </span>
                {agentStatus.isOnline ? (
                  <Badge className="bg-emerald-600 text-white border-none text-[10px] uppercase font-bold tracking-wider">
                    Online (Porta 4050)
                  </Badge>
                ) : (
                  <Badge className="bg-amber-600 text-white border-none text-[10px] uppercase font-bold tracking-wider">
                    Desconectado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600">
                {agentStatus.isOnline ? (
                  <>
                    Detectado no host <b>{agentStatus.hostname || "localhost"}</b> ({agentStatus.platform}).
                    Pronto para disparar comandos RAW para USB e soquetes de rede sem abrir diálogos no navegador!
                  </>
                ) : (
                  <>
                    Para impressão 100% silenciosa e envio direto ao Windows Spooler (USB) e Rede sem caixas de diálogo,
                    execute no computador do caixa: <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">npm run print-agent</code>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={checkAgent}
              disabled={isCheckingAgent}
              className="h-8 gap-1.5 text-xs font-semibold border-slate-200 bg-white"
            >
              <RefreshCwIcon size={13} className={isCheckingAgent ? "animate-spin" : ""} />
              <span>Verificar Conexão</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Métricas Resumo ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cozinha (Produção)
              </p>
              <p className="text-2xl font-bold font-display text-slate-900 mt-1">
                {kitchenPrintersCount} <span className="text-xs font-normal text-slate-500">ativas</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Vias sem valores, foco em itens e observações
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ChefHatIcon size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Caixa (Balcão)
              </p>
              <p className="text-2xl font-bold font-display text-slate-900 mt-1">
                {cashierPrintersCount} <span className="text-xs font-normal text-slate-500">ativas</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Via completa com valores, taxa e pagamento
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ReceiptIcon size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total de Impressoras
              </p>
              <p className="text-2xl font-bold font-display text-slate-900 mt-1">
                {printers.length} <span className="text-xs font-normal text-slate-500">cadastradas</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Roteamento automatizado por função
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <PrinterIcon size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Lista de Impressoras ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Dispositivos Cadastrados
          </h3>
          <span className="text-xs text-slate-500">
            {printers.length} impressora(s) configurada(s)
          </span>
        </div>

        {printers.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <PrinterIcon size={24} />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800">
              Nenhuma impressora configurada
            </h4>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Cadastre a impressora da Cozinha (conectada no cabo de rede) e a do Caixa (cabo USB) para que o sistema direcione automaticamente os pedidos ao serem recebidos.
            </p>
            <Button
              onClick={handleOpenAddModal}
              size="sm"
              className="mt-4 gap-1.5 font-semibold"
              style={{ backgroundColor: currentThemeConfig.hex }}
            >
              <PlusIcon size={14} />
              <span>Cadastrar Primeira Impressora</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {printers.map((printer) => {
              const isKitchen = printer.role === "KITCHEN";
              const isCashier = printer.role === "CASHIER";
              const isBar = printer.role === "BAR";
              const isNetwork = printer.connectionType === "NETWORK_TCP";
              const isSpooler = printer.connectionType === "WINDOWS_SPOOLER";

              return (
                <Card
                  key={printer.id}
                  className={cn(
                    "border transition-all shadow-xs overflow-hidden",
                    printer.isActive ? "bg-white border-slate-200/90" : "bg-slate-50/70 border-slate-200/50 opacity-75",
                  )}
                >
                  <CardHeader className="p-4 pb-3 flex flex-row items-start justify-between space-y-0 gap-2 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {printer.name}
                        </span>
                        {/* Badge de Função */}
                        <Badge
                          className={cn(
                            "border-none text-[10px] font-bold uppercase tracking-wider px-2 py-0.5",
                            isKitchen && "bg-emerald-100 text-emerald-800",
                            isCashier && "bg-blue-100 text-blue-800",
                            isBar && "bg-purple-100 text-purple-800",
                            !isKitchen && !isCashier && !isBar && "bg-amber-100 text-amber-800",
                          )}
                        >
                          {isKitchen ? "Cozinha (Produção)" : isCashier ? "Caixa (Balcão)" : isBar ? "Bar (Bebidas)" : "Todas as Vias"}
                        </Badge>
                      </div>

                      {/* Tipo de Conexão */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        {isNetwork ? (
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                            <NetworkIcon size={13} className="text-emerald-600" />
                            <span>Rede TCP: <b>{printer.ipAddress}</b>:{printer.port}</span>
                          </span>
                        ) : isSpooler ? (
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                            <UsbIcon size={13} className="text-blue-600" />
                            <span>USB Windows: <b>{printer.spoolerName}</b></span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <LaptopIcon size={13} />
                            <span>Navegador Web Padrão</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={printer.isActive}
                        onCheckedChange={() => handleToggleStatus(printer)}
                        title={printer.isActive ? "Desativar impressora" : "Ativar impressora"}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 text-xs text-slate-600">
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-medium">Largura da Bobina:</span>
                        <span className="font-semibold text-slate-800">{printer.paperWidth} mm</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Exibir Preços:</span>
                        <span className="font-semibold text-slate-800">
                          {printer.printPrices ? "Sim (Com valores)" : "Não (Ocultar preços)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Cortar Papel:</span>
                        <span className="font-semibold text-slate-800">
                          {printer.cutPaper ? "Automático" : "Manual"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Auto-Imprimir:</span>
                        <span className="font-semibold text-slate-800">
                          {printer.autoPrintOnNewOrder ? "Ao receber pedido" : "Apenas manual"}
                        </span>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestPrint(printer)}
                        disabled={isTestingId === printer.id || !printer.isActive}
                        className="h-8 gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-200"
                      >
                        <PlayIcon size={12} className={isTestingId === printer.id ? "animate-pulse" : ""} />
                        <span>{isTestingId === printer.id ? "Testando..." : "Testar Impressão"}</span>
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(printer)}
                          className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                          <WrenchIcon size={13} className="mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(printer)}
                          className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2Icon size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal de Cadastro / Edição ────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">
              {editingPrinter ? "Editar Impressora" : "Configurar Nova Impressora"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina a função da impressora, o tipo de conexão (Cabo de Rede ou USB) e o layout dos cupons.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Nome da Impressora */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Nome da Impressora *
              </Label>
              <Input
                placeholder="Ex: Cozinha (Epson TM-T20X) ou Caixa Balcão"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Função / Destino */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Função da Impressora (O que vai ser impresso nela) *
              </Label>
              <Select
                value={formData.role}
                onValueChange={(val: PrinterRole) => handleRoleChange(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KITCHEN">
                    🍳 Cozinha / Produção (Apenas itens, adicionais e obs — Sem preços)
                  </SelectItem>
                  <SelectItem value="CASHIER">
                    🧾 Caixa / Balcão (Cupom completo com valores, taxas, total e forma de pagamento)
                  </SelectItem>
                  <SelectItem value="BAR">
                    🍹 Bar / Bebidas (Itens de bebidas e copa)
                  </SelectItem>
                  <SelectItem value="BOTH">
                    📄 Geral (Ambas as vias juntas)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Conexão */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Tipo de Conexão Física *
              </Label>
              <Select
                value={formData.connectionType}
                onValueChange={(val: PrinterConnectionType) =>
                  setFormData({ ...formData, connectionType: val })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NETWORK_TCP">
                    🌐 Cabo de Rede / Ethernet (TCP/IP porta 9100 — Ideal para a Cozinha)
                  </SelectItem>
                  <SelectItem value="WINDOWS_SPOOLER">
                    🔌 Cabo USB / Spooler do Windows (Driver local — Ideal para o Caixa)
                  </SelectItem>
                  <SelectItem value="BROWSER">
                    🖥️ Navegador (Diálogo de impressão padrão)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos Condicionais: Se Rede TCP */}
            {formData.connectionType === "NETWORK_TCP" && (
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">
                    Endereço IP na Rede Local *
                  </Label>
                  <Input
                    placeholder="Ex: 192.168.1.200"
                    value={formData.ipAddress || ""}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    required
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-500">
                    O IP fixo atribuído à impressora no roteador da lanchonete.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">
                    Porta RAW *
                  </Label>
                  <Input
                    type="number"
                    value={formData.port || 9100}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Padrão: 9100</p>
                </div>
              </div>
            )}

            {/* Campos Condicionais: Se Windows Spooler (USB) */}
            {formData.connectionType === "WINDOWS_SPOOLER" && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-slate-700">
                    Nome da Impressora no Windows *
                  </Label>
                  {windowsPrinters.length > 0 && (
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      {windowsPrinters.length} detectadas via Agente
                    </span>
                  )}
                </div>

                {windowsPrinters.length > 0 ? (
                  <Select
                    value={formData.spoolerName || ""}
                    onValueChange={(val) => setFormData({ ...formData, spoolerName: val })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white font-mono">
                      <SelectValue placeholder="Selecione a impressora do Windows..." />
                    </SelectTrigger>
                    <SelectContent>
                      {windowsPrinters.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? "(Padrão)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Ex: EPSON TM-T20X Receipt ou MP-4200 TH"
                    value={formData.spoolerName || ""}
                    onChange={(e) => setFormData({ ...formData, spoolerName: e.target.value })}
                    required
                    className="h-8 text-xs font-mono bg-white"
                  />
                )}
                <p className="text-[10px] text-slate-500">
                  Deve coincidir exatamente com o nome da impressora listada em "Impressoras e Scanners" do Windows.
                </p>
              </div>
            )}

            {/* Largura da Bobina & Opções de Formatação */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Largura da Bobina</Label>
                <Select
                  value={String(formData.paperWidth || 80)}
                  onValueChange={(val) => setFormData({ ...formData, paperWidth: Number(val) })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80 mm (Bobina Padrão - 48 Colunas)</SelectItem>
                    <SelectItem value="58">58 mm (Bobina Estreita - 32 Colunas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Número de Cópias</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.copies || 1}
                  onChange={(e) => setFormData({ ...formData, copies: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Switches de Comportamento */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800">
                    Imprimir Valores Financeiros
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Desmarque para a Cozinha para mostrar apenas os itens a preparar.
                  </p>
                </div>
                <Switch
                  checked={formData.printPrices}
                  onCheckedChange={(val) => setFormData({ ...formData, printPrices: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800">
                    Cortar Papel Automaticamente (Guilhotina)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Envia comando de corte ESC/POS ao finalizar cada cupom.
                  </p>
                </div>
                <Switch
                  checked={formData.cutPaper}
                  onCheckedChange={(val) => setFormData({ ...formData, cutPaper: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800">
                    Abrir Gaveta de Dinheiro
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Aciona o pulso elétrico da gaveta acoplada à impressora (Caixa).
                  </p>
                </div>
                <Switch
                  checked={formData.openDrawer}
                  onCheckedChange={(val) => setFormData({ ...formData, openDrawer: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800">
                    Auto-imprimir em Novos Pedidos
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Dispara a impressão imediatamente quando um novo pedido entra no painel.
                  </p>
                </div>
                <Switch
                  checked={formData.autoPrintOnNewOrder}
                  onCheckedChange={(val) => setFormData({ ...formData, autoPrintOnNewOrder: val })}
                />
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-9 font-semibold text-xs gap-1.5"
                style={{ backgroundColor: currentThemeConfig.hex }}
              >
                {isPending && <Loader2Icon size={14} className="animate-spin" />}
                <span>{editingPrinter ? "Salvar Alterações" : "Cadastrar Impressora"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
