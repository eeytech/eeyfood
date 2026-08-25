"use client";

import {
  CheckIcon,
  FileTextIcon,
  PackageCheckIcon,
  PlusIcon,
  ReceiptIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { confirmarImportacaoNFeAction, criarFornecedorAction, excluirFornecedorAction, parseXmlNFeAction } from "@/app/(dashboard)/actions";
import type { MapeamentoItem } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export function ComprasClient({ slug, inventoryItems, fornecedores, notasCompra }: ComprasClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

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
        toast.success("Fornecedor cadastrado.");
        setFornecedorFormOpen(false);
      } else {
        toast.error(result.error ?? "Erro ao salvar fornecedor.");
      }
    });
  };

  const handleSupplierDelete = (supplier: Supplier) => {
    startSupplierTransition(async () => {
      await excluirFornecedorAction(slug, supplier.id);
      toast.success("Fornecedor removido.");
      setDeletingSupplier(null);
    });
  };

  const mappedCount = mapeamentos.filter((m) => m.inventoryItemId).length;

  return (
    <div className="space-y-4">
      {/* Supplier Form Dialog */}
      <Dialog open={fornecedorFormOpen} onOpenChange={setFornecedorFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
            <DialogDescription>Cadastre um fornecedor para vincular às notas de compra.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSupplierCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Razão Social *</Label>
              <Input id="companyName" name="companyName" placeholder="Nome da empresa" required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="contato@fornecedor.com.br" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" placeholder="Rua, número, bairro, cidade/UF" />
            </div>
            <Button type="submit" className="w-full" disabled={isSupplierPending}>
              {isSupplierPending ? "Salvando..." : "Cadastrar Fornecedor"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Dialog */}
      <Dialog open={deletingSupplier !== null} onOpenChange={(o) => !o && setDeletingSupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Fornecedor</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{deletingSupplier?.companyName}</strong>? As notas vinculadas não serão excluídas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingSupplier(null)} disabled={isSupplierPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isSupplierPending}
              onClick={() => deletingSupplier && handleSupplierDelete(deletingSupplier)}
            >
              {isSupplierPending ? "Removendo..." : "Remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-semibold">Compras e NF-e</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Importe notas fiscais eletrônicas para dar entrada automática no estoque e gerencie fornecedores.
        </p>
      </div>

      <Tabs defaultValue="importar">
        <TabsList>
          <TabsTrigger value="importar" className="gap-1.5">
            <UploadIcon size={14} />
            Importar NF-e
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5">
            <ReceiptIcon size={14} />
            Histórico ({notasCompra.length})
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className="gap-1.5">
            <PackageCheckIcon size={14} />
            Fornecedores ({fornecedores.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Importar NF-e ───────────────────────────────────────── */}
        <TabsContent value="importar" className="mt-4 space-y-4">
          {step === "upload" && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <UploadIcon className="text-primary" size={28} />
                </div>
                <div className="text-center">
                  <p className="font-medium">Faça upload do XML da NF-e</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Arquivo XML modelo 55 (NF-e de entrada de mercadorias)
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
                <Button onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                  {isPending ? "Processando..." : "Selecionar arquivo XML"}
                </Button>
                {importError && (
                  <p className="text-sm text-rose-600">{importError}</p>
                )}
              </CardContent>
            </Card>
          )}

          {step === "mapping" && parsedNFe && (
            <div className="space-y-4">
              {/* NF-e summary */}
              <Card>
                <CardContent className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Fornecedor</p>
                    <p className="mt-0.5 font-medium">{parsedNFe.supplierName || "—"}</p>
                    <p className="text-xs text-muted-foreground">{parsedNFe.supplierCnpj || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nº da Nota</p>
                    <p className="mt-0.5 font-medium">{parsedNFe.invoiceNumber || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="mt-0.5 font-medium">
                      {parsedNFe.totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Itens a mapear</p>
                    <p className="mt-0.5 font-medium">
                      {mappedCount}/{parsedNFe.items.length} mapeados
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Mapping table */}
              <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="border-b bg-slate-50 px-4 py-2">
                  <p className="text-sm font-medium">Mapeie cada item da nota para um insumo local</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código NF-e</TableHead>
                        <TableHead>Descrição na Nota</TableHead>
                        <TableHead className="text-right">Qtd.</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead>Insumo Local</TableHead>
                        <TableHead className="text-right">Fator Conv.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mapeamentos.map((map, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{map.nfeCode}</TableCell>
                          <TableCell>
                            <span className="font-medium">{map.nfeName}</span>
                            <span className="ml-1 text-xs text-muted-foreground">({map.unitOfMeasure})</span>
                          </TableCell>
                          <TableCell className="text-right">{map.quantity}</TableCell>
                          <TableCell className="text-right">
                            {map.unitCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={map.inventoryItemId ?? "none"}
                              onValueChange={(v) => {
                                const updated = [...mapeamentos];
                                updated[idx] = { ...updated[idx], inventoryItemId: v === "none" ? null : v };
                                setMapeamentos(updated);
                              }}
                            >
                              <SelectTrigger className="h-8 w-48 text-xs">
                                <SelectValue placeholder="Selecionar insumo..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Ignorar este item —</SelectItem>
                                {inventoryItems.map((inv) => (
                                  <SelectItem key={inv.id} value={inv.id}>
                                    {inv.name} ({inv.unitOfMeasure})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.001"
                              step="0.001"
                              className="h-8 w-20 text-right text-xs"
                              value={map.conversionFactor}
                              onChange={(e) => {
                                const updated = [...mapeamentos];
                                updated[idx] = { ...updated[idx], conversionFactor: parseFloat(e.target.value) || 1 };
                                setMapeamentos(updated);
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset} disabled={isPending}>
                  <XIcon size={14} className="mr-1" />
                  Cancelar
                </Button>
                <Button onClick={handleConfirmImport} disabled={isPending || mappedCount === 0}>
                  {isPending ? "Importando..." : (
                    <>
                      <CheckIcon size={14} className="mr-1" />
                      Confirmar importação ({mappedCount} itens)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckIcon className="text-green-600" size={28} />
                </div>
                <div className="text-center">
                  <p className="font-medium text-green-700">Nota importada com sucesso!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O estoque foi atualizado e os lotes foram registrados.
                  </p>
                </div>
                <Button onClick={handleReset}>
                  <PlusIcon size={14} className="mr-1" />
                  Importar outra NF-e
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Histórico ──────────────────────────────────────────────── */}
        <TabsContent value="historico" className="mt-4">
          {notasCompra.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FileTextIcon size={32} className="text-slate-200" />
              <p className="text-sm text-muted-foreground">Nenhuma nota de compra importada ainda.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Nota</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Chave de Acesso</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Importado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notasCompra.map((nota) => (
                      <TableRow key={nota.id}>
                        <TableCell className="font-medium">{nota.invoiceNumber ?? "—"}</TableCell>
                        <TableCell>{nota.supplierName ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {nota.accessKey ? `${nota.accessKey.slice(0, 12)}...` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {nota.totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {nota.issuedAt ? new Date(nota.issuedAt).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(nota.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Fornecedores ─────────────────────────────────────────────── */}
        <TabsContent value="fornecedores" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setFornecedorFormOpen(true)}>
              <PlusIcon size={14} />
              Novo Fornecedor
            </Button>
          </div>

          {fornecedores.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <PackageCheckIcon size={32} className="text-slate-200" />
              <p className="text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead className="w-16 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fornecedores.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.companyName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{f.cnpj ?? "—"}</TableCell>
                        <TableCell className="text-sm">{f.phone ?? "—"}</TableCell>
                        <TableCell className="text-sm">{f.email ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeletingSupplier(f)}
                            >
                              <Trash2Icon size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
