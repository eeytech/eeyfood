"use client";

import {
  Building2Icon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DollarSignIcon,
  FileTextIcon,
  FilterXIcon,
  Loader2Icon,
  MapPinIcon,
  MoreHorizontalIcon,
  PackageCheckIcon,
  PencilIcon,
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
  atualizarFornecedorAction,
  confirmarImportacaoNFeAction,
  criarFornecedorAction,
  excluirFornecedorAction,
  parseXmlNFeAction,
} from "@/app/(dashboard)/actions";
import type { MapeamentoItem } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { BRAZIL_UFS, buildFullAddress, formatCep, parseAddress } from "@/lib/address-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return d.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return d.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

const formatCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return d.replace(/^(\d{2})(\d+)/, "$1.$2");
  if (d.length <= 8) return d.replace(/^(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
  if (d.length <= 12) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5");
};

// ── Shared Table Pagination ──────────────────────────────────────────────────
function TablePagination({
  filteredCount,
  totalCount,
  isFiltering,
  currentPage,
  totalPages,
  pageSize,
  onPageSizeChange,
  onPageChange,
  itemLabelSingular,
  itemLabelPlural,
}: {
  filteredCount: number;
  totalCount: number;
  isFiltering: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
  itemLabelSingular: string;
  itemLabelPlural: string;
}) {
  const startIndex = filteredCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, filteredCount);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          Exibindo <strong className="font-semibold text-slate-900">{startIndex}</strong> a{" "}
          <strong className="font-semibold text-slate-900">{endIndex}</strong> de{" "}
          <strong className="font-semibold text-slate-900">{filteredCount}</strong>{" "}
          {filteredCount === 1 ? itemLabelSingular : itemLabelPlural}
          {filteredCount !== totalCount && (
            <span className="ml-1 text-slate-400">
              (total: {totalCount})
            </span>
          )}
        </span>
        {isFiltering && (
          <span className="text-[11px] font-medium text-amber-600">
            (Filtros aplicados)
          </span>
        )}
        <span className="hidden sm:inline text-slate-300">|</span>
        <div className="flex items-center gap-1.5">
          <span>Exibir</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="h-8 w-16 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span>por página</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="text-xs text-slate-500 mr-1">
          Página <strong className="font-semibold text-primary">{currentPage}</strong> de{" "}
          <strong className="font-semibold text-slate-900">{totalPages}</strong>
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/30 disabled:opacity-40 transition-all"
            title="Primeira página"
          >
            <ChevronsLeftIcon size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/30 disabled:opacity-40 transition-all"
            title="Página anterior"
          >
            <ChevronLeftIcon size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/30 disabled:opacity-40 transition-all"
            title="Próxima página"
          >
            <ChevronRightIcon size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-primary/10 hover:text-primary hover:border-primary/30 disabled:opacity-40 transition-all"
            title="Última página"
          >
            <ChevronsRightIcon size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [isSupplierPending, startSupplierTransition] = useTransition();

  // Campos do formulário de fornecedor
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // ── Histórico filters & pagination ──────────────────────────────────────────
  const [historySearch, setHistorySearch] = useState("");
  const [historySupplier, setHistorySupplier] = useState("all");
  const [historyDate, setHistoryDate] = useState<string>("");
  const [historySort, setHistorySort] = useState("DATE_DESC");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  // ── Fornecedores filters & pagination ───────────────────────────────────────
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierSort, setSupplierSort] = useState("NAME_ASC");
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierPageSize, setSupplierPageSize] = useState(10);

  // ── Metrics Calculation ────────────────────────────────────────────────────
  const totalInvoices = notasCompra.length;
  const totalAmountSpent = notasCompra.reduce((acc, n) => acc + n.totalAmount, 0);
  const totalSuppliers = fornecedores.length;
  const avgInvoiceAmount = totalInvoices > 0 ? totalAmountSpent / totalInvoices : 0;

  // ── Histórico Filtered & Paginated ──────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    return notasCompra
      .filter((nota) => {
        const q = historySearch.toLowerCase().trim();
        if (q) {
          const matchesQuery =
            (nota.invoiceNumber?.toLowerCase().includes(q) ?? false) ||
            (nota.supplierName?.toLowerCase().includes(q) ?? false) ||
            (nota.accessKey?.toLowerCase().includes(q) ?? false);
          if (!matchesQuery) return false;
        }

        if (historySupplier !== "all") {
          const matchesSupplier =
            nota.supplierId === historySupplier ||
            fornecedores.find((f) => f.id === historySupplier)?.companyName.toLowerCase() ===
              nota.supplierName?.toLowerCase();
          if (!matchesSupplier) return false;
        }

        if (historyDate) {
          const formatToBr = (d: Date | string | null | undefined): string => {
            if (!d) return "";
            try {
              const dateObj = typeof d === "string" ? new Date(d) : d;
              if (isNaN(dateObj.getTime())) return "";
              return dateObj.toLocaleDateString("pt-BR");
            } catch {
              return "";
            }
          };

          const selectedBrDate = (() => {
            try {
              const d = new Date(historyDate + "T12:00:00");
              return d.toLocaleDateString("pt-BR");
            } catch {
              return "";
            }
          })();

          if (selectedBrDate) {
            const issuedBr = formatToBr(nota.issuedAt);
            const createdBr = formatToBr(nota.createdAt);
            if (issuedBr !== selectedBrDate && createdBr !== selectedBrDate) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (historySort === "DATE_DESC") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (historySort === "AMOUNT_DESC") {
          return b.totalAmount - a.totalAmount;
        }
        return 0;
      });
  }, [notasCompra, historySearch, historySupplier, historyDate, historySort, fornecedores]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const validHistoryPage = Math.min(historyPage, totalHistoryPages);
  const paginatedHistory = useMemo(() => {
    const start = (validHistoryPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, validHistoryPage, historyPageSize]);

  const isFilteringHistory =
    historySearch.trim() !== "" ||
    historySupplier !== "all" ||
    historyDate !== "" ||
    historySort !== "DATE_DESC";

  const handleClearHistoryFilters = () => {
    setHistorySearch("");
    setHistorySupplier("all");
    setHistoryDate("");
    setHistorySort("DATE_DESC");
    setHistoryPage(1);
  };

  // ── Fornecedores Filtered & Paginated ───────────────────────────────────────
  const filteredSuppliers = useMemo(() => {
    return fornecedores
      .filter((f) => {
        const q = supplierSearch.toLowerCase().trim();
        if (!q) return true;
        return (
          f.companyName.toLowerCase().includes(q) ||
          (f.cnpj?.toLowerCase().includes(q) ?? false) ||
          (f.email?.toLowerCase().includes(q) ?? false) ||
          (f.phone?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        if (supplierSort === "NAME_ASC") {
          return a.companyName.localeCompare(b.companyName);
        }
        if (supplierSort === "DATE_DESC") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
  }, [fornecedores, supplierSearch, supplierSort]);

  const totalSupplierPages = Math.max(1, Math.ceil(filteredSuppliers.length / supplierPageSize));
  const validSupplierPage = Math.min(supplierPage, totalSupplierPages);
  const paginatedSuppliers = useMemo(() => {
    const start = (validSupplierPage - 1) * supplierPageSize;
    return filteredSuppliers.slice(start, start + supplierPageSize);
  }, [filteredSuppliers, validSupplierPage, supplierPageSize]);

  const isFilteringSuppliers = supplierSearch.trim() !== "" || supplierSort !== "NAME_ASC";

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
          setImportError(result.error ?? "Erro ao processar o arquivo XML.");
          return;
        }

        const data = result.parsed;
        setParsedNFe({
          ...data,
          issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
        });

        const initialMappings: MapeamentoItem[] = data.items.map((item: NFeItem) => {
          const matchedItem = inventoryItems.find(
            (inv) =>
              inv.name.toLowerCase().includes(item.nfeName.toLowerCase()) ||
              item.nfeName.toLowerCase().includes(inv.name.toLowerCase()),
          );
          return {
            nfeCode: item.nfeCode,
            nfeName: item.nfeName,
            quantity: item.quantity,
            unitCost: item.unitCost,
            unitOfMeasure: item.unitOfMeasure,
            inventoryItemId: matchedItem?.id ?? null,
            conversionFactor: 1,
          };
        });

        setMapeamentos(initialMappings);
        setStep("mapping");
      });
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!parsedNFe) return;

    startTransition(async () => {
      const result = await confirmarImportacaoNFeAction(
        slug,
        xmlContent,
        mapeamentos,
      );

      if (result.success) {
        toast.success("NF-e importada e estoque atualizado com sucesso!");
        setStep("done");
      } else {
        toast.error(result.error ?? "Erro ao confirmar importação.");
      }
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

  const handleOpenNewSupplier = () => {
    setEditingSupplier(null);
    setCompanyName("");
    setCnpj("");
    setPhone("");
    setEmail("");
    setCep("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setEstado("");
    setFornecedorFormOpen(true);
  };

  const handleOpenEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setCompanyName(supplier.companyName || "");
    setCnpj(formatCnpj(supplier.cnpj ?? ""));
    setPhone(formatPhone(supplier.phone ?? ""));
    setEmail(supplier.email ?? "");

    const parsed = parseAddress(supplier.address);
    setCep(parsed.cep || "");
    setLogradouro(parsed.logradouro || "");
    setNumero(parsed.numero || "");
    setComplemento(parsed.complemento || "");
    setBairro(parsed.bairro || "");
    setCidade(parsed.cidade || "");
    setEstado(parsed.estado || "");

    setFornecedorFormOpen(true);
  };

  const fetchViaCep = async (cepValue: string) => {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setLogradouro(data.logradouro);
        if (data.bairro) setBairro(data.bairro);
        if (data.localidade) setCidade(data.localidade);
        if (data.uf) setEstado(data.uf);
        toast.success("Endereço preenchido via CEP!");
      } else {
        toast.error("CEP não localizado.");
      }
    } catch {
      // Falha silenciosa
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      fetchViaCep(digits);
    }
  };

  const handleCepBlur = () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length === 8) {
      fetchViaCep(digits);
    }
  };

  const handleSupplierSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const compiledAddress = buildFullAddress({
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
    });

    formData.set("companyName", companyName);
    formData.set("cnpj", cnpj);
    formData.set("phone", phone);
    formData.set("email", email);
    formData.set("address", compiledAddress);

    startSupplierTransition(async () => {
      if (editingSupplier) {
        const result = await atualizarFornecedorAction(slug, editingSupplier.id, formData);
        if (result.success) {
          toast.success("Fornecedor atualizado com sucesso!");
          setFornecedorFormOpen(false);
          setEditingSupplier(null);
        } else {
          toast.error(result.error ?? "Erro ao atualizar fornecedor.");
        }
      } else {
        const result = await criarFornecedorAction(slug, formData);
        if (result.success) {
          toast.success("Fornecedor cadastrado com sucesso!");
          setFornecedorFormOpen(false);
        } else {
          toast.error(result.error ?? "Erro ao cadastrar fornecedor.");
        }
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
      {/* ── Dialog: Criar / Editar Fornecedor ───────────────────────── */}
      <Dialog
        open={fornecedorFormOpen}
        onOpenChange={(open) => {
          setFornecedorFormOpen(open);
          if (!open) setEditingSupplier(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white shadow-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editingSupplier
                ? "Atualize as informações cadastrais e o endereço deste fornecedor parceiro."
                : "Cadastre um fornecedor parceiro para vincular às notas de compra e insumos."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSupplierSave} className="space-y-4 pt-1">
            {/* ── Dados Gerais ── */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-xs font-semibold text-slate-700">
                  Razão Social / Nome Fantasia
                </Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex.: Distribuidora de Alimentos Silva"
                  required
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
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
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0001-00"
                    maxLength={18}
                    className="h-10 rounded-xl border-slate-200 bg-white font-mono text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@fornecedor.com.br"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* ── Endereço Desmembrado ── */}
            <div className="border-t border-slate-100 pt-3">
              <div className="mb-3 flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Endereço do Fornecedor
                </h4>
              </div>

              <div className="space-y-3">
                {/* CEP com busca automática */}
                <div className="space-y-1.5">
                  <Label htmlFor="cep" className="text-xs font-semibold text-slate-700">
                    CEP
                  </Label>
                  <div className="relative">
                    <Input
                      id="cep"
                      name="cep"
                      value={cep}
                      onChange={handleCepChange}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      maxLength={9}
                      className="h-10 rounded-xl border-slate-200 bg-white font-mono text-sm pr-9 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    />
                    {isSearchingCep && (
                      <Loader2Icon
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary"
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {/* Logradouro / Rua */}
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="logradouro" className="text-xs font-semibold text-slate-700">
                      Rua / Avenida
                    </Label>
                    <Input
                      id="logradouro"
                      name="logradouro"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      placeholder="Ex.: Rua das Flores"
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Número */}
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="numero" className="text-xs font-semibold text-slate-700">
                      Número
                    </Label>
                    <Input
                      id="numero"
                      name="numero"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="123"
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Complemento */}
                  <div className="space-y-1.5">
                    <Label htmlFor="complemento" className="text-xs font-semibold text-slate-700">
                      Complemento (opcional)
                    </Label>
                    <Input
                      id="complemento"
                      name="complemento"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      placeholder="Ex.: Galpão 2, Sala 10"
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Bairro */}
                  <div className="space-y-1.5">
                    <Label htmlFor="bairro" className="text-xs font-semibold text-slate-700">
                      Bairro
                    </Label>
                    <Input
                      id="bairro"
                      name="bairro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Ex.: Distrito Industrial"
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Cidade */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="cidade" className="text-xs font-semibold text-slate-700">
                      Cidade
                    </Label>
                    <Input
                      id="cidade"
                      name="cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Ex.: São Paulo"
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Estado / UF */}
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="estado" className="text-xs font-semibold text-slate-700">
                      UF
                    </Label>
                    <Select
                      value={estado || undefined}
                      onValueChange={(val) => setEstado(val)}
                    >
                      <SelectTrigger
                        id="estado"
                        className="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      >
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl border-slate-200 bg-white shadow-xl">
                        {BRAZIL_UFS.map((uf) => (
                          <SelectItem key={uf.value} value={uf.value} className="text-xs font-medium">
                            <span className="font-semibold text-slate-900">{uf.value}</span>
                            <span className="ml-1.5 text-slate-500">- {uf.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFornecedorFormOpen(false);
                  setEditingSupplier(null);
                }}
                className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSupplierPending}
                className="h-10 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
              >
                {isSupplierPending
                  ? "Salvando..."
                  : editingSupplier
                  ? "Salvar Alterações"
                  : "Cadastrar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Exclusão de Fornecedor ──────── */}
      <ConfirmDeleteDialog
        open={deletingSupplier !== null}
        onOpenChange={(o) => !o && setDeletingSupplier(null)}
        title="Remover fornecedor"
        description={
          <>
            Tem certeza que deseja remover{" "}
            <strong className="text-slate-900 font-semibold">
              {deletingSupplier?.companyName}
            </strong>
            ? As notas fiscais já vinculadas continuarão no histórico.
          </>
        }
        confirmLabel="Sim, remover fornecedor"
        loadingLabel="Removendo..."
        isPending={isSupplierPending}
        onConfirm={() => {
          if (deletingSupplier) handleSupplierDelete(deletingSupplier);
        }}
      />

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <ReceiptIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Compras e Entrada NF-e
            </h1>
            <p className="text-sm text-slate-500">
              Importe notas fiscais eletrônicas (XML) para dar entrada automática no estoque e gerencie fornecedores.
            </p>
          </div>
        </div>

        {activeTab === "importar" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <UploadIcon size={16} />
              <span>Importar XML da NF-e</span>
            </Button>
          </div>
        )}

        {activeTab === "fornecedores" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleOpenNewSupplier}
              className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <PlusIcon size={16} />
              <span>Novo Fornecedor</span>
            </Button>
          </div>
        )}
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Total Notas */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Notas Importadas
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <FileTextIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {totalInvoices}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalInvoices === 1 ? "1 documento registrado" : `${totalInvoices} documentos registrados`}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Investido */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total em Compras
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <DollarSignIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {formatCurrency(totalAmountSpent)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Entrada em estoque registrada
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Fornecedores */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Fornecedores
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <Building2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {totalSuppliers}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Empresas parceiras ativas
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Ticket Médio */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Média por Nota
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <ReceiptIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
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
            className="group gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <UploadIcon size={14} />
            <span>Importar NF-e</span>
          </TabsTrigger>

          <TabsTrigger
            value="historico"
            className="group gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <ReceiptIcon size={14} />
            <span>Histórico de Compras</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 transition-colors group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
              {notasCompra.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="fornecedores"
            className="group gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <PackageCheckIcon size={14} />
            <span>Fornecedores</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 transition-colors group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
              {fornecedores.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Importar NF-e ────────────────────────── */}
        <TabsContent value="importar" className="space-y-4">
          {step === "upload" && (
            <Card className="border-2 border-dashed border-slate-200 bg-white transition-all hover:border-primary/50 hover:bg-primary/[0.01]">
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
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
                  className="h-10 gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
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
                    <p className="mt-1 font-display text-lg font-bold text-primary">
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
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="pl-4 text-xs font-semibold text-slate-700">Código NF-e</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Descrição na Nota</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Qtd.</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Valor Unit.</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Insumo Local</TableHead>
                        <TableHead className="w-28 pr-4 text-right text-xs font-semibold text-slate-700">Fator Conv.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {mapeamentos.map((map, idx) => (
                        <TableRow key={idx} className="transition-colors hover:bg-slate-50/70">
                          <TableCell className="pl-4 py-3.5 font-mono text-xs text-slate-500">
                            {map.nfeCode}
                          </TableCell>

                          <TableCell className="py-3.5">
                            <span className="font-semibold text-slate-900">{map.nfeName}</span>
                            <span className="ml-1.5 font-mono text-xs text-slate-400">
                              ({map.unitOfMeasure})
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 text-right font-semibold text-slate-900">
                            {map.quantity}
                          </TableCell>

                          <TableCell className="py-3.5 text-right font-display text-sm font-semibold text-slate-900">
                            {formatCurrency(map.unitCost)}
                          </TableCell>

                          <TableCell className="py-3.5">
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
                              <SelectTrigger className="h-9 w-60 rounded-xl border-slate-200 bg-white text-xs">
                                <SelectValue placeholder="Selecionar insumo..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                                <SelectItem value="none">— Ignorar este item —</SelectItem>
                                {inventoryItems.map((inv) => (
                                  <SelectItem key={inv.id} value={inv.id}>
                                    {inv.name} ({inv.unitOfMeasure})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="pr-4 py-3.5 text-right">
                            <Input
                              type="number"
                              min="0.001"
                              step="0.001"
                              className="h-9 w-24 rounded-xl border-slate-200 bg-white text-right text-xs focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
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
                  className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <XIcon size={14} className="mr-1.5" />
                  <span>Cancelar</span>
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isPending || mappedCount === 0}
                  className="h-10 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-all"
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
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200">
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
                  className="h-10 gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
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
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Filtros de Histórico */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Busca */}
                  <div className="relative">
                    <SearchIcon
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar por nº da nota ou chave..."
                      value={historySearch}
                      onChange={(e) => {
                        setHistorySearch(e.target.value);
                        setHistoryPage(1);
                      }}
                      className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:text-sm"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistorySearch("");
                          setHistoryPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XIcon size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filtro por Fornecedor */}
                  <Select
                    value={historySupplier}
                    onValueChange={(val) => {
                      setHistorySupplier(val);
                      setHistoryPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Todos os fornecedores" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="all">Todos os fornecedores</SelectItem>
                      {fornecedores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filtro por Data */}
                  <DatePicker
                    value={historyDate ? new Date(historyDate + "T12:00:00") : null}
                    onChange={(_date, dateStr) => {
                      setHistoryDate(dateStr ? dateStr.slice(0, 10) : "");
                      setHistoryPage(1);
                    }}
                    placeholder="Filtrar por data..."
                    clearable
                    buttonClassName="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700"
                  />

                  {/* Ordenação */}
                  <Select
                    value={historySort}
                    onValueChange={(val) => {
                      setHistorySort(val);
                      setHistoryPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Ordenar..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="DATE_DESC">Mais recentes</SelectItem>
                      <SelectItem value="AMOUNT_DESC">Maior valor total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isFilteringHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearHistoryFilters}
                    className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <FilterXIcon size={14} />
                    <span>Limpar</span>
                  </Button>
                )}
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-2xl bg-primary/10 p-4 text-primary border border-primary/20">
                  <ReceiptIcon size={32} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhuma nota fiscal encontrada
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {isFilteringHistory
                    ? "Tente ajustar os termos da busca e filtros aplicados para localizar a nota desejada."
                    : "Faça o upload do seu primeiro arquivo XML para registrar compras."}
                </p>
                {isFilteringHistory ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearHistoryFilters}
                    className="mt-4 gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                  >
                    <FilterXIcon size={14} />
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveTab("importar");
                      fileInputRef.current?.click();
                    }}
                    className="mt-4 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                  >
                    <UploadIcon size={14} />
                    Importar primeiro XML
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="pl-4 text-xs font-semibold text-slate-700">Nº da Nota</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Fornecedor</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Chave de Acesso</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">Valor Total</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Data de Emissão</TableHead>
                        <TableHead className="w-36 pr-4 text-right text-xs font-semibold text-slate-700">Importado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {paginatedHistory.map((nota) => (
                        <TableRow
                          key={nota.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <TableCell className="pl-4 py-3.5 font-semibold text-slate-900">
                            <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
                              #{nota.invoiceNumber ?? "—"}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 font-medium text-slate-800">
                            {nota.supplierName ?? "—"}
                          </TableCell>

                          <TableCell className="py-3.5 font-mono text-xs text-slate-400">
                            {nota.accessKey ? `${nota.accessKey.slice(0, 16)}...` : "—"}
                          </TableCell>

                          <TableCell className="py-3.5 text-right font-display text-sm font-bold text-slate-900">
                            {formatCurrency(nota.totalAmount)}
                          </TableCell>

                          <TableCell className="py-3.5 text-xs text-slate-500">
                            {nota.issuedAt ? new Date(nota.issuedAt).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>

                          <TableCell className="pr-4 py-3.5 text-right text-xs text-slate-500">
                            {new Date(nota.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {paginatedHistory.map((nota) => (
                    <div key={nota.id} className="p-4 space-y-2">
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
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                        <span>
                          Emissão: {nota.issuedAt ? new Date(nota.issuedAt).toLocaleDateString("pt-BR") : "—"}
                        </span>
                        <span>Importado: {new Date(nota.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <TablePagination
                  filteredCount={filteredHistory.length}
                  totalCount={notasCompra.length}
                  isFiltering={isFilteringHistory}
                  currentPage={validHistoryPage}
                  totalPages={totalHistoryPages}
                  pageSize={historyPageSize}
                  onPageSizeChange={(sz) => {
                    setHistoryPageSize(sz);
                    setHistoryPage(1);
                  }}
                  onPageChange={setHistoryPage}
                  itemLabelSingular="nota"
                  itemLabelPlural="notas"
                />
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab 3: Fornecedores ─────────────────────────── */}
        <TabsContent value="fornecedores" className="space-y-4">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {/* Filtros de Fornecedores */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {/* Busca */}
                  <div className="relative">
                    <SearchIcon
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      placeholder="Buscar por razão social, CNPJ ou telefone..."
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setSupplierPage(1);
                      }}
                      className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:text-sm"
                    />
                    {supplierSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierSearch("");
                          setSupplierPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XIcon size={14} />
                      </button>
                    )}
                  </div>

                  {/* Ordenação */}
                  <Select
                    value={supplierSort}
                    onValueChange={(val) => {
                      setSupplierSort(val);
                      setSupplierPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                      <SelectValue placeholder="Ordenar..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                      <SelectItem value="NAME_ASC">Razão Social (A-Z)</SelectItem>
                      <SelectItem value="DATE_DESC">Mais recentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isFilteringSuppliers && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSupplierSearch("");
                      setSupplierSort("NAME_ASC");
                      setSupplierPage(1);
                    }}
                    className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <FilterXIcon size={14} />
                    <span>Limpar</span>
                  </Button>
                )}
              </div>
            </div>

            {filteredSuppliers.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-2xl bg-primary/10 p-4 text-primary border border-primary/20">
                  <PackageCheckIcon size={32} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhum fornecedor encontrado
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {isFilteringSuppliers
                    ? "Tente ajustar os filtros de busca para encontrar o fornecedor."
                    : "Cadastre fornecedores parceiros para registrar entradas de notas fiscais."}
                </p>
                {isFilteringSuppliers ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSupplierSearch("");
                      setSupplierSort("NAME_ASC");
                      setSupplierPage(1);
                    }}
                    className="mt-4 gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                  >
                    <FilterXIcon size={14} />
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleOpenNewSupplier}
                    className="mt-4 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                  >
                    <PlusIcon size={14} />
                    Cadastrar primeiro fornecedor
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="pl-4 text-xs font-semibold text-slate-700">Razão Social</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">CNPJ</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">Telefone</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">E-mail</TableHead>
                        <TableHead className="w-20 pr-4 text-right text-xs font-semibold text-slate-700">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {paginatedSuppliers.map((f) => (
                        <TableRow
                          key={f.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <TableCell className="pl-4 py-3.5 font-semibold text-slate-900">
                            {f.companyName}
                          </TableCell>

                          <TableCell className="py-3.5 font-mono text-xs text-slate-500">
                            {f.cnpj ? (
                              <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
                                {f.cnpj}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 text-xs text-slate-600">
                            {f.phone ?? "—"}
                          </TableCell>

                          <TableCell className="py-3.5 text-xs text-slate-600">
                            {f.email ?? "—"}
                          </TableCell>

                          <TableCell className="pr-4 py-3.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <MoreHorizontalIcon size={16} />
                                  <span className="sr-only">Opções</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-44 rounded-xl border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditSupplier(f)}
                                  className="gap-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-900"
                                >
                                  <PencilIcon size={14} className="text-primary" />
                                  Editar dados
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeletingSupplier(f)}
                                  className="gap-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-700"
                                >
                                  <Trash2Icon size={14} />
                                  Excluir fornecedor
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {paginatedSuppliers.map((f) => (
                    <div key={f.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{f.companyName}</p>
                          <p className="font-mono text-xs text-slate-400">{f.cnpj ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => handleOpenEditSupplier(f)}
                          >
                            <PencilIcon size={13} className="mr-1 text-primary" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                            onClick={() => setDeletingSupplier(f)}
                          >
                            <Trash2Icon size={13} className="mr-1" />
                            Remover
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <span>{f.phone ?? "Sem telefone"}</span>
                        <span>{f.email ?? "Sem e-mail"}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <TablePagination
                  filteredCount={filteredSuppliers.length}
                  totalCount={fornecedores.length}
                  isFiltering={isFilteringSuppliers}
                  currentPage={validSupplierPage}
                  totalPages={totalSupplierPages}
                  pageSize={supplierPageSize}
                  onPageSizeChange={(sz) => {
                    setSupplierPageSize(sz);
                    setSupplierPage(1);
                  }}
                  onPageChange={setSupplierPage}
                  itemLabelSingular="fornecedor"
                  itemLabelPlural="fornecedores"
                />
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
