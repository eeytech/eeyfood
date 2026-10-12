"use client";

import {
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addRecipeItemAction,
  fetchInventoryItemsForRecipeAction,
  fetchRecipeItemsAction,
  removeRecipeItemAction,
  updateRecipeItemAction,
} from "@/app/(dashboard)/actions";
import type { RecipeItemComInsumo } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
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
  DropdownMenuSeparator,
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
import type { InventoryItem } from "@fsw/db";

interface RecipeManagerProps {
  slug: string;
  productId: string;
}

type InsumoBasico = Pick<InventoryItem, "id" | "name" | "unitOfMeasure" | "currentQuantity">;

function EditRecipeItemDialog({
  open,
  onOpenChange,
  item,
  slug,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RecipeItemComInsumo;
  slug: string;
  onSuccess: () => void;
}) {
  const [qty, setQty] = useState(String(item.quantityNeeded));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setQty(String(item.quantityNeeded));
    }
  }, [open, item.quantityNeeded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(qty);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    startTransition(async () => {
      const result = await updateRecipeItemAction(slug, item.id, parsed);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
        toast.success("Quantidade atualizada com sucesso.");
      } else {
        toast.error(result.error ?? "Erro ao atualizar quantidade.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Editar Quantidade do Ingrediente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Altere a porção consumida de &quot;{item.inventoryItem.name}&quot; por cada unidade vendida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-recipe-qty" className="text-xs font-semibold text-slate-700">
                Quantidade consumida ({item.inventoryItem.unitOfMeasure})
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-recipe-qty"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
                <span className="shrink-0 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-2 rounded-lg border border-slate-200">
                  {item.inventoryItem.unitOfMeasure}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Essa quantidade será debitada do estoque a cada venda realizada.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25"
            >
              {isPending && <Loader2Icon size={14} className="animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecipeItemRow({
  item,
  slug,
  onRefresh,
}: {
  item: RecipeItemComInsumo;
  slug: string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeRecipeItemAction(slug, item.id);
      if (result.success) {
        setConfirmDelete(false);
        onRefresh();
        toast.success("Ingrediente removido da ficha técnica.");
      } else {
        toast.error(result.error ?? "Erro ao remover.");
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 shadow-2xs hover:border-slate-300/80 transition-colors">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{item.inventoryItem.name}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/60 rounded-md px-2 py-0.5">
          {item.quantityNeeded} {item.inventoryItem.unitOfMeasure}
        </span>
        <div className="flex shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                disabled={isPending}
              >
                <MoreHorizontalIcon size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-200 bg-white shadow-lg">
              <DropdownMenuItem
                onClick={() => setEditing(true)}
                disabled={isPending}
                className="cursor-pointer gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
              >
                <PencilIcon size={13} className="text-primary" />
                <span>Editar quantidade</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
                className="cursor-pointer gap-2 text-xs font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700 hover:bg-rose-50"
              >
                <Trash2Icon size={13} />
                <span>Remover item</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditRecipeItemDialog
        open={editing}
        onOpenChange={setEditing}
        item={item}
        slug={slug}
        onSuccess={onRefresh}
      />

      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={handleRemove}
        title="Remover ingrediente?"
        description={`Deseja remover "${item.inventoryItem.name}" da ficha técnica deste produto?`}
        isPending={isPending}
      />
    </>
  );
}

function AddRecipeItemDialog({
  slug,
  productId,
  existingIds,
  open,
  onOpenChange,
  onAdd,
}: {
  slug: string;
  productId: string;
  existingIds: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
}) {
  const [insumos, setInsumos] = useState<InsumoBasico[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [qty, setQty] = useState("1");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchInventoryItemsForRecipeAction(slug)
        .then((res) => {
          setInsumos(res);
          const firstAvailable = res.find((i) => !existingIds.has(i.id));
          if (firstAvailable) {
            setSelectedId(firstAvailable.id);
          } else {
            setSelectedId("");
          }
        })
        .catch(() => toast.error("Erro ao carregar insumos."))
        .finally(() => setLoading(false));
      setQty("1");
    }
  }, [open, slug, existingIds]);

  const available = insumos.filter((i) => !existingIds.has(i.id));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      toast.warning("Selecione um insumo.");
      return;
    }
    const parsed = parseFloat(qty);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    startTransition(async () => {
      const result = await addRecipeItemAction(slug, productId, selectedId, parsed);
      if (result.success) {
        onAdd();
        onOpenChange(false);
        toast.success("Ingrediente adicionado à ficha técnica.");
      } else {
        toast.error(result.error ?? "Erro ao adicionar.");
      }
    });
  };

  const selectedInsumo = insumos.find((i) => i.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleAdd}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Adicionar Ingrediente à Ficha Técnica
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Vincule um insumo do estoque para dar baixa automática na venda deste produto.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Loader2Icon size={18} className="mx-auto mb-2 animate-spin text-primary" />
              Carregando insumos do estoque...
            </div>
          ) : available.length === 0 ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-xs text-slate-600">
                {insumos.length === 0
                  ? "Nenhum insumo cadastrado no estoque. Cadastre insumos primeiro no menu Estoque."
                  : "Todos os insumos cadastrados já foram adicionados a esta ficha técnica."}
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-xs"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="recipe-insumo-select" className="text-xs font-semibold text-slate-700">
                    Insumo do Estoque
                  </Label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger id="recipe-insumo-select" className="h-9 text-xs">
                      <SelectValue placeholder="Selecione um insumo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((i) => (
                        <SelectItem key={i.id} value={i.id} className="text-xs">
                          {i.name} (estoque: {i.currentQuantity} {i.unitOfMeasure})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recipe-qty-input" className="text-xs font-semibold text-slate-700">
                    Quantidade consumida por unidade vendida
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="recipe-qty-input"
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      required
                      placeholder="Ex: 0.150"
                      className="h-9 text-xs"
                    />
                    {selectedInsumo && (
                      <span className="shrink-0 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-2 rounded-lg border border-slate-200">
                        {selectedInsumo.unitOfMeasure}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    A cada produto vendido, essa quantidade será debitada do estoque.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  className="h-9 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !selectedId}
                  className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25"
                >
                  {isPending && <Loader2Icon size={14} className="animate-spin" />}
                  Adicionar Ingrediente
                </Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RecipeManager({ slug, productId }: RecipeManagerProps) {
  const [items, setItems] = useState<RecipeItemComInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRecipeItemsAction(slug, productId);
      setItems(result);
    } catch {
      toast.error("Não foi possível carregar a ficha técnica.");
    } finally {
      setLoading(false);
    }
  }, [slug, productId]);

  useEffect(() => {
    load();
  }, [load, refreshTick]);

  const handleRefresh = () => setRefreshTick((t) => t + 1);

  const existingIds = new Set(items.map((i) => i.inventoryItemId));

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
          <p className="text-xs font-medium text-slate-500">
            Nenhum ingrediente cadastrado nesta ficha técnica.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Ao adicionar insumos, a venda deste produto dará baixa automática no estoque correspondente.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <RecipeItemRow
              key={item.id}
              item={item}
              slug={slug}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-dashed h-9 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700"
        onClick={() => setAdding(true)}
      >
        <PlusIcon size={14} />
        Adicionar ingrediente
      </Button>

      <AddRecipeItemDialog
        slug={slug}
        productId={productId}
        existingIds={existingIds}
        open={adding}
        onOpenChange={setAdding}
        onAdd={handleRefresh}
      />
    </div>
  );
}
