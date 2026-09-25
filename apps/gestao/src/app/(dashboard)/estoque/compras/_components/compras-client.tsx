"use client";

import {
  Building2Icon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DollarSignIcon,
  FileTextIcon,
  FilterXIcon,
  PackageCheckIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  confirmarImportacaoNFeAction,
  criarFornecedorAction,
  excluirFornecedorAction,
  parseXmlNFeAction,
} from "@/app/(dashboard)/actions";
import type { MapeamentoItem } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NotaCompraComFornecedor } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";
import type { InventoryItem, Supplier } from "@fsw/db";

interface ComprasClientProps {
  slug: string;
  inventoryItems: InventoryItem[];
  fornecedores: Supplier[];
  notasCompra: NotaCompraComFornecedor[];
}

interface NFeItem {
  nfeCode: string;
  nfeName: string;
  quantity: number;
  unitCost: number;
  unitOfMeasure: string;
}

interface NFeParsed {
  supplierCnpj: string;
  supplierName: string;
  invoiceNumber: string;
  accessKey: string;
  totalAmount: number;
  issuedAt: Date | null;
  items: NFeItem[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ComprasClient({
  slug,
  inventoryItems,
  fornecedores,
  notasCompra,
}: ComprasClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState("importar");

  // ── XML import state ────────────────────────────────────────────────────────
  const [step, setStep] = useState<"upload" | "mapping" | "done">("upload");
  const [parsedNFe, setParsedNFe] = useState<NFeParsed | null>(null);
  const [xmlContent, setXmlContent] = useState("");
  const [mapeamentos, setMapeamentos] = useState<MapeamentoItem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Supplier form state ─────────────────────────────────────────────────────
  const [fornecedorFormOpen, setFornecedorFormOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [isSupplierPending, startSupplierTransition] = useTransition();

  // ── Histórico filters & pagination ──────────────────────────────────────────
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;

  // ── Fornecedores filters & pagination ───────────────────────────────────────
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierPage, setSupplierPage] = useState(1);
  const supplierPageSize = 10;

  // ── Metrics Calculation ────────────────────────────────────────────────────
  const totalInvoices = notasCompra.length;
  const totalAmountSpent = notasCompra.reduce((acc, n) => acc + n.totalAmount, 0);
  const totalSuppliers = fornecedores.length;
  const avgInvoiceAmount = totalInvoices > 0 ? totalAmountSpent / totalInvoices : 0;

  // ── Histórico Filtered & Paginated ──────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    return notasCompra.filter((nota) => {
      const q = historySearch.toLowerCase().trim();
      if (!q) return true;
      return (
        (nota.invoiceNumber?.toLowerCase().includes(q) ?? false) ||
        (nota.supplierName?.toLowerCase().includes(q) ?? false) ||
        (nota.accessKey?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [notasCompra, historySearch]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const validHistoryPage = Math.min(historyPage, totalHistoryPages);
  const paginatedHistory = useMemo(() => {
    const start = (validHistoryPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, validHistoryPage, historyPageSize]);

  // ── Fornecedores Filtered & Paginated ───────────────────────────────────────
  const filteredSuppliers = useMemo(() => {
    return fornecedores.filter((f) => {
      const q = supplierSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        f.companyName.toLowerCase().includes(q) ||
        (f.cnpj?.toLowerCase().includes(q) ?? false) ||
        (f.email?.toLowerCase().includes(q) ?? false) ||
        (f.phone?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [fornecedores, supplierSearch]);

  const totalSupplierPages = Math.max(1, Math.ceil(filteredSuppliers.length / supplierPageSize));
  const validSupplierPage = Math.min(supplierPage, totalSupplierPages);
  const paginatedSuppliers = useMemo(() => {
    const start = (validSupplierPage - 1) * supplierPageSize;
    return filteredSuppliers.slice(start, start + supplierPageSize);
  }, [filteredSuppliers, validSupplierPage, supplierPageSize]);

  // ── XML Handlers ────────────────────────────────────────────────────────────
  const handleXmlUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setXmlContent(content);
      setImportError(null);

      startTransition(async () => {
        const result = await parseXmlNFeAction(slug, content);
        if (!result.success || !result.parsed) {
          setImportError(result.error ?? "Erro ao processar XML.");
          return;
        }
        setParsedNFe(result.parsed as NFeParsed);
        setMapeamentos(
          (result.parsed.items as NFeItem[]).map((item) => ({
            nfeCode: item.nfeCode,
            nfeName: item.nfeName,
            quantity: item.quantity,
            unitCost: item.unitCost,
            unitOfMeasure: item.unitOfMeasure,
            inventoryItemId: null,
            conversionFactor: 1,
          })),
        );
        setStep("mapping");
      });
    };
    reader.readAsText(file, "ISO-8859-1");
  };

  const handleConfirmImport = () => {
    startTransition(async () => {
      const result = await confirmarImportacaoNFeAction(slug, xmlContent, mapeamentos);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao importar nota.");
        return;
      }
      toast.success("NF-e importada com sucesso! Estoque atualizado.");
      setStep("done");
    });
  };

  const handleReset = () => {
    setStep("upload");
    setParsedNFe(null);
    setXmlContent("");
    setMapeamentos([]);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSupplierCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSupplierTransition(async () => {
      const result = await criarFornecedorAction(slug, formData);
      if (result.success) {
        toast.success("Fornecedor cadastrado com sucesso.");
        setFornecedorFormOpen(false);
      } else {
        toast.error(result.error ?? "Erro ao salvar fornecedor.");
      }
    });
  };

  const handleSupplierDelete = (supplier: Supplier) => {
    startSupplierTransition(async () => {
      await excluirFornecedorAction(slug, supplier.id);
      toast.success("Fornecedor removido com sucesso.");
      setDeletingSupplier(null);
    });
  };

  const mappedCount = mapeamentos.filter((m) => m.inventoryItemId).length;

  return (
    <div className="space-y-6">
      {/* ── Dialog: Criar Fornecedor ───────────────────────── */}
      <Dialog open={fornecedorFormOpen} onOpenChange={setFornecedorFormOpen}>
        <DialogContent className="border-slate-200 bg-white shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Novo Fornecedor
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Cadastre um fornecedor para vincular às notas de compra e insumos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSupplierCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-xs font-semibold text-slate-700">
                Razão Social / Nome Fantasia
              </Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="Ex.: Distribuidora de Alimentos Silva"
                required
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cnpj" className="text-xs font-semibold text-slate-700">
                  CNPJ
                </Label>
                <Input
                  id="cnpj"
                  name="cnpj"
                  placeholder="00.000.000/0001-00"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 font-mono text-sm focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="(00) 00000-0000"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                E-mail de Contato
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="contato@fornecedor.com.br"
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-semibold text-slate-700">
                Endereço
              </Label>
              <Input
                id="address"
                name="address"
                placeholder="Rua, número, bairro, cidade/UF"
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFornecedorFormOpen(false)}
                className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSupplierPending}
                className="h-10 rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                {isSupplierPending ? "Salvando..." : "Cadastrar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Exclusão de Fornecedor ──────── */}
      <Dialog open={deletingSupplier !== null} onOpenChange={(o) => !o && setDeletingSupplier(null)}>
        <DialogContent className="border-slate-200 bg-white shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Remover Fornecedor
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Tem certeza que deseja remover <strong>{deletingSupplier?.companyName}</strong>?
              As notas fiscais já vinculadas continuarão no histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeletingSupplier(null)}
              disabled={isSupplierPending}
              className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isSupplierPending}
              onClick={() => deletingSupplier && handleSupplierDelete(deletingSupplier)}
              className="h-10 rounded-full px-5 text-xs font-semibold"
            >
              {isSupplierPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <ReceiptIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Compras & Entrada NF-e
            </h1>
            <p className="text-sm text-slate-500">
              Importe notas fiscais eletrônicas (XML) para dar entrada automática no estoque e gerencie fornecedores.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setFornecedorFormOpen(true)}
            className="h-10 gap-2 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <PlusIcon size={14} />
            <span>Novo Fornecedor</span>
          </Button>

          <Button
            onClick={() => {
              setActiveTab("importar");
              fileInputRef.current?.click();
            }}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <UploadIcon size={16} />
            <span>Importar XML da NF-e</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Total Notas */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Notas Importadas
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <FileTextIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalInvoices}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalInvoices === 1 ? "1 documento registrado" : `${totalInvoices} documentos registrados`}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Investido */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total em Compras
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <DollarSignIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {formatCurrency(totalAmountSpent)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Entrada em estoque registrada
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Fornecedores */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Fornecedores
              </span>
              <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                <Building2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-indigo-700">
              {totalSuppliers}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Empresas parceiras ativas
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Ticket Médio */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Média por Nota
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <ReceiptIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {formatCurrency(avgInvoiceAmount)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Média por pedido de compra
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Pill Tabs ───────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
          <TabsTrigger
            value="importar"
            className="gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <UploadIcon size={14} />
            <span>Importar NF-e</span>
          </TabsTrigger>

          <TabsTrigger
            value="historico"
            className="gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <ReceiptIcon size={14} />
            <span>Histórico de Compras</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              {notasCompra.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="fornecedores"
            className="gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <PackageCheckIcon size={14} />
            <span>Fornecedores</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              {fornecedores.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Importar NF-e ────────────────────────── */}
        <TabsContent value="importar" className="space-y-4">
          {step === "upload" && (
            <Card className="border-2 border-dashed border-slate-300 bg-white transition-colors hover:border-slate-400">
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <UploadIcon size={28} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Faça upload do arquivo XML da NF-e
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-md">
                    Selecione o arquivo XML modelo 55 emitido pelo seu fornecedor para dar entrada automática em insumos e gerar lotes com validade.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleXmlUpload(file);
                  }}
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                  className="h-10 gap-2 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  <UploadIcon size={16} />
                  <span>{isPending ? "Processando XML..." : "Selecionar Arquivo XML"}</span>
                </Button>

                {importError && (
                  <p className="text-sm font-medium text-rose-600 bg-rose-50 px-4 py-2 rounded-xl border border-rose-200">
                    {importError}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {step === "mapping" && parsedNFe && (
            <div className="space-y-4">
              {/* NF-e Summary Card */}
              <Card className="border-slate-200/80 bg-white shadow-sm">
                <CardContent className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase font-medium tracking-wide text-slate-400">
                      Fornecedor
                    </p>
                    <p className="mt-1 font-semibold text-slate-900 truncate">
                      {parsedNFe.supplierName || "—"}
                    </p>
                    <p className="font-mono text-xs text-slate-500">
                      {parsedNFe.supplierCnpj || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-medium tracking-wide text-slate-400">
                      Nº da Nota
                    </p>
                    <p className="mt-1 font-display font-bold text-slate-900">
                      #{parsedNFe.invoiceNumber || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-medium tracking-wide text-slate-400">
                      Valor Total
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-emerald-700">
                      {formatCurrency(parsedNFe.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-medium tracking-wide text-slate-400">
                      Progresso do Mapeamento
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {mappedCount} de {parsedNFe.items.length} itens vinculados
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Mapping Table */}
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Vincule os itens da nota aos seus insumos cadastrados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Itens configurados como &quot;Ignorar&quot; não alterarão o saldo de estoque.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-200/80">
                        <TableHead className="pl-4 font-semibold text-slate-700">Código NF-e</TableHead>
                        <TableHead className="font-semibold text-slate-700">Descrição na Nota</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Qtd.</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Valor Unit.</TableHead>
                        <TableHead className="font-semibold text-slate-700">Insumo Local</TableHead>
                        <TableHead className="w-28 pr-4 text-right font-semibold text-slate-700">Fator Conv.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mapeamentos.map((map, idx) => (
                        <TableRow key={idx} className="border-slate-100">
                          <TableCell className="pl-4 py-3 font-mono text-xs text-slate-500">
                            {map.nfeCode}
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="font-semibold text-slate-900">{map.nfeName}</span>
                            <span className="ml-1.5 font-mono text-xs text-slate-400">
                              ({map.unitOfMeasure})
                            </span>
                          </TableCell>

                          <TableCell className="py-3 text-right font-semibold text-slate-900">
                            {map.quantity}
                          </TableCell>

                          <TableCell className="py-3 text-right font-display text-sm font-semibold text-slate-900">
                            {formatCurrency(map.unitCost)}
                          </TableCell>

                          <TableCell className="py-3">
                            <Select
                              value={map.inventoryItemId ?? "none"}
                              onValueChange={(v) => {
                                const updated = [...mapeamentos];
                                updated[idx] = {
                                  ...updated[idx],
                                  inventoryItemId: v === "none" ? null : v,
                                };
                                setMapeamentos(updated);
                              }}
                            >
                              <SelectTrigger className="h-9 w-60 rounded-xl border-slate-200 bg-slate-50/70 text-xs">
                                <SelectValue placeholder="Selecionar insumo..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200 bg-white">
                                <SelectItem value="none">— Ignorar este item —</SelectItem>
                                {inventoryItems.map((inv) => (
                                  <SelectItem key={inv.id} value={inv.id}>
                                    {inv.name} ({inv.unitOfMeasure})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="pr-4 py-3 text-right">
                            <Input
                              type="number"
                              min="0.001"
                              step="0.001"
                              className="h-9 w-24 rounded-xl border-slate-200 bg-slate-50/70 text-right text-xs"
                              value={map.conversionFactor}
                              onChange={(e) => {
                                const updated = [...mapeamentos];
                                updated[idx] = {
                                  ...updated[idx],
                                  conversionFactor: parseFloat(e.target.value) || 1,
                                };
                                setMapeamentos(updated);
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isPending}
                  className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <XIcon size={14} className="mr-1.5" />
                  <span>Cancelar</span>
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isPending || mappedCount === 0}
                  className="h-10 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? (
                    "Importando..."
                  ) : (
                    <>
                      <CheckIcon size={16} className="mr-1.5" />
                      <span>Confirmar Entrada ({mappedCount} itens)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && (
            <Card className="border-slate-200/80 bg-white shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
                  <CheckCircle2Icon size={32} />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    NF-e Importada com Sucesso!
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-md">
                    O saldo de estoque dos insumos foi atualizado e os novos lotes com datas de validade foram registrados no sistema.
                  </p>
                </div>
                <Button
                  onClick={handleReset}
                  className="h-10 gap-2 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  <PlusIcon size={16} />
                  <span>Importar Outra NF-e</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 2: Histórico de Compras ─────────────────── */}
        <TabsContent value="historico" className="space-y-4">
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                  <SearchIcon
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    placeholder="Buscar por nº da nota ou fornecedor..."
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 text-xs transition-colors focus:bg-white sm:text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {historySearch.trim() && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setHistorySearch("");
                        setHistoryPage(1);
                      }}
                      className="h-10 gap-1.5 rounded-xl px-3 text-xs text-slate-500 hover:text-slate-900"
                    >
                      <FilterXIcon size={14} />
                      <span>Limpar</span>
                    </Button>
                  )}

                  <span className="text-xs font-medium text-slate-500">
                    {filteredHistory.length}{" "}
                    {filteredHistory.length === 1 ? "nota encontrada" : "notas encontradas"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200/80 hover:bg-transparent">
                    <TableHead className="pl-4 font-semibold text-slate-700">Nº da Nota</TableHead>
                    <TableHead className="font-semibold text-slate-700">Fornecedor</TableHead>
                    <TableHead className="font-semibold text-slate-700">Chave de Acesso</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Valor Total</TableHead>
                    <TableHead className="font-semibold text-slate-700">Data de Emissão</TableHead>
                    <TableHead className="w-36 pr-4 font-semibold text-slate-700">Importado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <ReceiptIcon size={32} className="text-slate-400" />
                          <p className="text-sm font-medium">Nenhuma nota encontrada</p>
                          <p className="text-xs text-slate-400">
                            Faça o upload do seu primeiro arquivo XML para registrar compras.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedHistory.map((nota) => (
                      <TableRow
                        key={nota.id}
                        className="border-slate-100 transition-colors hover:bg-slate-50/70"
                      >
                        <TableCell className="pl-4 py-3 font-semibold text-slate-900">
                          #{nota.invoiceNumber ?? "—"}
                        </TableCell>

                        <TableCell className="py-3 font-medium text-slate-800">
                          {nota.supplierName ?? "—"}
                        </TableCell>

                        <TableCell className="py-3 font-mono text-xs text-slate-400">
                          {nota.accessKey ? `${nota.accessKey.slice(0, 16)}...` : "—"}
                        </TableCell>

                        <TableCell className="py-3 text-right font-display text-sm font-bold text-slate-900">
                          {formatCurrency(nota.totalAmount)}
                        </TableCell>

                        <TableCell className="py-3 text-xs text-slate-500">
                          {nota.issuedAt ? new Date(nota.issuedAt).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>

                        <TableCell className="pr-4 py-3 text-xs text-slate-500">
                          {new Date(nota.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedHistory.map((nota) => (
                <div key={nota.id} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Nota #{nota.invoiceNumber ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">{nota.supplierName ?? "—"}</p>
                    </div>
                    <span className="font-display font-bold text-slate-900">
                      {formatCurrency(nota.totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>
                      Emissão: {nota.issuedAt ? new Date(nota.issuedAt).toLocaleDateString("pt-BR") : "—"}
                    </span>
                    <span>Importado em: {new Date(nota.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalHistoryPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-6">
                <span className="text-xs text-slate-500">
                  Página <strong>{validHistoryPage}</strong> de{" "}
                  <strong>{totalHistoryPages}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={validHistoryPage <= 1}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <ChevronLeftIcon size={14} />
                    <span>Anterior</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    disabled={validHistoryPage >= totalHistoryPages}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <span>Próxima</span>
                    <ChevronRightIcon size={14} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 3: Fornecedores ─────────────────────────── */}
        <TabsContent value="fornecedores" className="space-y-4">
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                  <SearchIcon
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    placeholder="Buscar por razão social, CNPJ ou telefone..."
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setSupplierPage(1);
                    }}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 text-xs transition-colors focus:bg-white sm:text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {supplierSearch.trim() && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSupplierSearch("");
                        setSupplierPage(1);
                      }}
                      className="h-10 gap-1.5 rounded-xl px-3 text-xs text-slate-500 hover:text-slate-900"
                    >
                      <FilterXIcon size={14} />
                      <span>Limpar</span>
                    </Button>
                  )}

                  <span className="text-xs font-medium text-slate-500">
                    {filteredSuppliers.length}{" "}
                    {filteredSuppliers.length === 1 ? "fornecedor" : "fornecedores"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-200/80 hover:bg-transparent">
                    <TableHead className="pl-4 font-semibold text-slate-700">Razão Social</TableHead>
                    <TableHead className="font-semibold text-slate-700">CNPJ</TableHead>
                    <TableHead className="font-semibold text-slate-700">Telefone</TableHead>
                    <TableHead className="font-semibold text-slate-700">E-mail</TableHead>
                    <TableHead className="w-16 pr-4 text-right font-semibold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <PackageCheckIcon size={32} className="text-slate-400" />
                          <p className="text-sm font-medium">Nenhum fornecedor encontrado</p>
                          <p className="text-xs text-slate-400">
                            Cadastre fornecedores parceiros para registrar entradas de notas fiscais.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSuppliers.map((f) => (
                      <TableRow
                        key={f.id}
                        className="border-slate-100 transition-colors hover:bg-slate-50/70"
                      >
                        <TableCell className="pl-4 py-3 font-semibold text-slate-900">
                          {f.companyName}
                        </TableCell>

                        <TableCell className="py-3 font-mono text-xs text-slate-500">
                          {f.cnpj ?? "—"}
                        </TableCell>

                        <TableCell className="py-3 text-xs text-slate-600">
                          {f.phone ?? "—"}
                        </TableCell>

                        <TableCell className="py-3 text-xs text-slate-600">
                          {f.email ?? "—"}
                        </TableCell>

                        <TableCell className="pr-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => setDeletingSupplier(f)}
                          >
                            <Trash2Icon size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedSuppliers.map((f) => (
                <div key={f.id} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{f.companyName}</p>
                      <p className="font-mono text-xs text-slate-400">{f.cnpj ?? "—"}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => setDeletingSupplier(f)}
                    >
                      Remover
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>{f.phone ?? "Sem telefone"}</span>
                    <span>{f.email ?? "Sem e-mail"}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalSupplierPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-6">
                <span className="text-xs text-slate-500">
                  Página <strong>{validSupplierPage}</strong> de{" "}
                  <strong>{totalSupplierPages}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSupplierPage((p) => Math.max(1, p - 1))}
                    disabled={validSupplierPage <= 1}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <ChevronLeftIcon size={14} />
                    <span>Anterior</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSupplierPage((p) => Math.min(totalSupplierPages, p + 1))}
                    disabled={validSupplierPage >= totalSupplierPages}
                    className="h-8 gap-1 rounded-lg border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <span>Próxima</span>
                    <ChevronRightIcon size={14} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
