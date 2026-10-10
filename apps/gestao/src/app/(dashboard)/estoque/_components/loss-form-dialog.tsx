"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon, ChevronsUpDown, SearchIcon, XIcon } from "lucide-react";

import {
  atualizarPerdaAction,
  registrarPerdaAction,
} from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PerdaComInsumo } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@fsw/db";

interface LossFormDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loss: PerdaComInsumo | null;
  inventoryItems: InventoryItem[];
  onSuccess?: () => Promise<void> | void;
}

const formatCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
};

interface LossFormProps {
  slug: string;
  loss: PerdaComInsumo | null;
  inventoryItems: InventoryItem[];
  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
}

function LossForm({
  slug,
  loss,
  inventoryItems,
  onClose,
  onSuccess,
}: LossFormProps) {
  const [isPending, startTransition] = useTransition();

  // Insumo Combobox state
  const [selectedItemId, setSelectedItemId] = useState<string>(
    loss?.inventoryItemId ?? ""
  );
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Custo Total do Prejuízo com máscara monetária (R$ 0,00)
  const [costDisplay, setCostDisplay] = useState<string>(() =>
    formatCurrency(loss?.financialLoss)
  );

  const selectedItem = useMemo(
    () => inventoryItems.find((i) => i.id === selectedItemId),
    [inventoryItems, selectedItemId]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return inventoryItems;
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.unitOfMeasure.toLowerCase().includes(q)
    );
  }, [inventoryItems, searchQuery]);

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    if (!rawDigits) {
      setCostDisplay("");
      return;
    }
    const val = Number(rawDigits) / 100;
    setCostDisplay(
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(val)
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedItemId) {
      toast.error("Por favor, selecione um insumo.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("inventoryItemId", selectedItemId);

    if (costDisplay) {
      const rawDigits = costDisplay.replace(/\D/g, "");
      const numericVal = Number(rawDigits) / 100;
      formData.set("unitCost", String(numericVal));
    } else {
      formData.delete("unitCost");
    }

    startTransition(async () => {
      if (loss) {
        const result = await atualizarPerdaAction(slug, loss.id, formData);
        if (result.success) {
          toast.success("Registro de perda atualizado com sucesso.");
          onClose();
          await onSuccess?.();
        } else {
          toast.error(result.error ?? "Erro ao atualizar perda.");
        }
      } else {
        const result = await registrarPerdaAction(slug, formData);
        if (result.success) {
          toast.success("Desperdício registrado com sucesso.");
          onClose();
          await onSuccess?.();
        } else {
          toast.error(result.error ?? "Erro ao registrar perda.");
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── Campo Insumo (Searchable Select / Combobox) ── */}
      <div className="space-y-1.5">
        <Label htmlFor="loss-item-trigger" className="text-xs font-semibold text-slate-700">
          Insumo
        </Label>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              id="loss-item-trigger"
              type="button"
              role="combobox"
              aria-expanded={popoverOpen}
              aria-controls="loss-item-list"
              className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 transition-all hover:bg-slate-50/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <span className={cn("truncate", !selectedItem && "text-slate-400 font-normal")}>
                {selectedItem ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-900">{selectedItem.name}</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[11px] font-mono text-slate-600">
                      ({selectedItem.unitOfMeasure})
                    </span>
                  </span>
                ) : (
                  "Selecione ou digite para buscar o insumo..."
                )}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] min-w-[280px] p-2 bg-white rounded-2xl border-slate-200 shadow-2xl"
            align="start"
          >
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
              <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Digite para filtrar insumos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredItems.length > 0) {
                      setSelectedItemId(filteredItems[0].id);
                      setPopoverOpen(false);
                      setSearchQuery("");
                    }
                  }
                }}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div id="loss-item-list" className="mt-2 max-h-56 overflow-y-auto space-y-0.5 pr-1">
              {filteredItems.length === 0 ? (
                <p className="py-5 text-center text-xs text-slate-400">
                  Nenhum insumo encontrado.
                </p>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setPopoverOpen(false);
                        setSearchQuery("");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-all",
                        isSelected
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={cn(
                              "truncate font-medium",
                              isSelected ? "text-primary font-semibold" : "text-slate-900"
                            )}
                          >
                            {item.name}
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                            {item.unitOfMeasure}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Saldo atual: {item.currentQuantity} {item.unitOfMeasure}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckIcon className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="loss-reason" className="text-xs font-semibold text-slate-700">
            Motivo
          </Label>
          <select
            id="loss-reason"
            name="reason"
            defaultValue={loss?.reason ?? "VENCIDO"}
            required
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="VENCIDO">Vencido</option>
            <option value="DANIFICADO">Danificado</option>
            <option value="ESTRAGADO">Estragado</option>
            <option value="OUTROS">Outros</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loss-qty" className="text-xs font-semibold text-slate-700">
            Qtd. Perdida
          </Label>
          <Input
            id="loss-qty"
            name="quantity"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={loss?.quantity ?? ""}
            required
            placeholder="Ex.: 2.5"
            className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* ── Custo Total do Prejuízo com Máscara de Moeda (R$) ── */}
        <div className="space-y-1.5">
          <Label htmlFor="loss-cost" className="text-xs font-semibold text-slate-700">
            Custo Total do Prejuízo (R$)
          </Label>
          <Input
            id="loss-cost"
            type="text"
            inputMode="numeric"
            value={costDisplay}
            onChange={handleCostChange}
            placeholder="R$ 0,00"
            className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loss-date" className="text-xs font-semibold text-slate-700">
            Data da Ocorrência
          </Label>
          <DatePicker
            id="loss-date"
            name="occurredAt"
            defaultValue={loss?.occurredAt ?? undefined}
            placeholder="Selecione data"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="loss-notes" className="text-xs font-semibold text-slate-700">
          Observações
        </Label>
        <Input
          id="loss-notes"
          name="notes"
          defaultValue={loss?.notes ?? ""}
          placeholder="Ex.: Embalagem rasgada no descarregamento..."
          className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
        >
          {isPending
            ? "Salvando..."
            : loss
              ? "Salvar Alterações"
              : "Cadastrar Registro de Perda"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function LossFormDialog({
  slug,
  open,
  onOpenChange,
  loss,
  inventoryItems,
  onSuccess,
}: LossFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-200 bg-white shadow-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-slate-900">
            {loss ? "Editar Registro de Perda" : "Cadastrar Registro de Perda"}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {loss
              ? `Editando perda do insumo ${loss.inventoryItemName}`
              : "O saldo do item será reduzido e o impacto financeiro registrado no relatório."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <LossForm
            key={loss ? loss.id : "new-loss"}
            slug={slug}
            loss={loss}
            inventoryItems={inventoryItems}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
