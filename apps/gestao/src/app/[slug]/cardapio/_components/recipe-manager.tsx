"use client";

import { PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addRecipeItemAction,
  fetchInventoryItemsForRecipeAction,
  fetchRecipeItemsAction,
  removeRecipeItemAction,
  updateRecipeItemAction,
  type RecipeItemComInsumo,
} from "@/app/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InventoryItem } from "@fsw/db";

interface RecipeManagerProps {
  slug: string;
  productId: string;
}

type InsumoBasico = Pick<InventoryItem, "id" | "name" | "unitOfMeasure" | "currentQuantity">;

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
  const [qty, setQty] = useState(String(item.quantityNeeded));
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const parsed = parseFloat(qty);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    startTransition(async () => {
      const result = await updateRecipeItemAction(slug, item.id, parsed);
      if (result.success) {
        setEditing(false);
        onRefresh();
        toast.success("Quantidade atualizada.");
      } else {
        toast.error(result.error ?? "Erro ao atualizar.");
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeRecipeItemAction(slug, item.id);
      if (result.success) {
        onRefresh();
        toast.success("Ingrediente removido da ficha técnica.");
      } else {
        toast.error(result.error ?? "Erro ao remover.");
      }
    });
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2">
        <span className="min-w-0 flex-1 text-sm font-medium">{item.inventoryItem.name}</span>
        <Input
          type="number"
          step="0.001"
          min="0.001"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="h-8 w-28 text-sm"
        />
        <span className="text-xs text-muted-foreground">{item.inventoryItem.unitOfMeasure}</span>
        <Button type="button" size="sm" onClick={handleSave} disabled={isPending} className="h-7 px-2 text-xs">
          {isPending ? "..." : "Salvar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => { setQty(String(item.quantityNeeded)); setEditing(false); }}
          disabled={isPending}
        >
          <XIcon size={12} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.inventoryItem.name}</p>
      </div>
      <span className="shrink-0 text-sm text-muted-foreground">
        {item.quantityNeeded} {item.inventoryItem.unitOfMeasure}
      </span>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setEditing(true)}
          disabled={isPending}
        >
          <PencilIcon size={12} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-rose-500 hover:bg-rose-50"
          onClick={handleRemove}
          disabled={isPending}
        >
          <Trash2Icon size={12} />
        </Button>
      </div>
    </div>
  );
}

function AddRecipeItemForm({
  slug,
  productId,
  existingIds,
  onAdd,
  onCancel,
}: {
  slug: string;
  productId: string;
  existingIds: Set<string>;
  onAdd: () => void;
  onCancel: () => void;
}) {
  const [insumos, setInsumos] = useState<InsumoBasico[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [qty, setQty] = useState("1");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchInventoryItemsForRecipeAction(slug)
      .then(setInsumos)
      .catch(() => toast.error("Erro ao carregar insumos."))
      .finally(() => setLoading(false));
  }, [slug]);

  const available = insumos.filter((i) => !existingIds.has(i.id));

  const handleAdd = () => {
    if (!selectedId) return;
    const parsed = parseFloat(qty);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    startTransition(async () => {
      const result = await addRecipeItemAction(slug, productId, selectedId, parsed);
      if (result.success) {
        onAdd();
        toast.success("Ingrediente adicionado à ficha técnica.");
      } else {
        toast.error(result.error ?? "Erro ao adicionar.");
      }
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-slate-50 p-4 text-center text-sm text-muted-foreground">
        Carregando insumos...
      </div>
    );
  }

  if (available.length === 0) {
    return (
      <div className="space-y-2 rounded-xl border bg-slate-50 p-4">
        <p className="text-sm text-muted-foreground">
          {insumos.length === 0
            ? "Nenhum insumo cadastrado no estoque. Cadastre insumos primeiro na aba Estoque."
            : "Todos os insumos disponíveis já foram adicionados à ficha técnica."}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
      <p className="text-sm font-medium">Adicionar ingrediente</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Insumo</Label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione um insumo...</option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} (estoque: {i.currentQuantity} {i.unitOfMeasure})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Quantidade por unidade vendida</Label>
          <Input
            type="number"
            step="0.001"
            min="0.001"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        {selectedId && (
          <div className="flex items-end pb-1">
            <span className="text-xs text-muted-foreground">
              unidade: {insumos.find((i) => i.id === selectedId)?.unitOfMeasure ?? ""}
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={isPending || !selectedId}
        >
          {isPending ? "Adicionando..." : "Adicionar"}
        </Button>
      </div>
    </div>
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
      {items.length === 0 && !adding && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum ingrediente cadastrado. Ao adicionar insumos aqui, a venda deste
          produto descontará automaticamente o estoque correspondente.
        </p>
      )}

      {items.map((item) => (
        <RecipeItemRow
          key={item.id}
          item={item}
          slug={slug}
          onRefresh={handleRefresh}
        />
      ))}

      {adding ? (
        <AddRecipeItemForm
          slug={slug}
          productId={productId}
          existingIds={existingIds}
          onAdd={() => { setAdding(false); handleRefresh(); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-dashed"
          onClick={() => setAdding(true)}
        >
          <PlusIcon size={14} />
          Adicionar ingrediente
        </Button>
      )}
    </div>
  );
}
