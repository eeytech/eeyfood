"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UnlinkIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createProductOptionAction,
  createProductOptionGroupAction,
  deleteProductOptionAction,
  deleteProductOptionGroupAction,
  fetchProductOptionsAction,
  fetchRestaurantOptionGroupsAction,
  linkOptionGroupToProductAction,
  unlinkOptionGroupFromProductAction,
  updateProductOptionAction,
  updateProductOptionGroupAction,
} from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GrupoAdicionalComOpcoes } from "@/lib/admin-queries";
import type { ProductOption, ProductOptionGroup } from "@fsw/db";

interface ProductOptionsManagerProps {
  slug: string;
  productId: string;
}

type GroupWithOptions = ProductOptionGroup & { options: ProductOption[] };

interface GroupFormState {
  name: string;
  minOptions: string;
  maxOptions: string;
  displayOrder: string;
}

interface OptionFormState {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  displayOrder: string;
}

const defaultGroupForm = (): GroupFormState => ({
  name: "",
  minOptions: "0",
  maxOptions: "1",
  displayOrder: "0",
});

const defaultOptionForm = (): OptionFormState => ({
  name: "",
  description: "",
  imageUrl: "",
  price: "0",
  displayOrder: "0",
});

function GroupForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  initial: GroupFormState;
  onSubmit: (data: GroupFormState) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<GroupFormState>(initial);
  const set =
    (field: keyof GroupFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Nome do grupo</Label>
          <Input
            value={form.name}
            onChange={set("name")}
            placeholder="Ex: Tamanho, Molho, Extras..."
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mínimo de opções</Label>
          <Input
            type="number"
            min="0"
            value={form.minOptions}
            onChange={set("minOptions")}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Máximo de opções</Label>
          <Input
            type="number"
            min="1"
            value={form.maxOptions}
            onChange={set("maxOptions")}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ordem de exibição</Label>
          <Input
            type="number"
            min="0"
            value={form.displayOrder}
            onChange={set("displayOrder")}
            className="h-9"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          <XIcon size={14} className="mr-1" />
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onSubmit(form)}
          disabled={isPending || !form.name.trim()}
        >
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function OptionForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  initial: OptionFormState;
  onSubmit: (data: OptionFormState) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<OptionFormState>(initial);
  const set =
    (field: keyof OptionFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-3 rounded-xl border bg-white p-3 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Nome</Label>
          <Input
            value={form.name}
            onChange={set("name")}
            placeholder="Ex: Grande, Barbecue, Bacon extra..."
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Descrição (opcional)</Label>
          <Input
            value={form.description}
            onChange={set("description")}
            placeholder="Descrição curta"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">URL da imagem (opcional)</Label>
          <Input
            value={form.imageUrl}
            onChange={set("imageUrl")}
            placeholder="https://..."
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Preço adicional (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={set("price")}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ordem</Label>
          <Input
            type="number"
            min="0"
            value={form.displayOrder}
            onChange={set("displayOrder")}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          <XIcon size={12} className="mr-1" />
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onSubmit(form)}
          disabled={isPending || !form.name.trim()}
        >
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function OptionRow({
  option,
  slug,
  onRefresh,
}: {
  option: ProductOption;
  slug: string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (data: OptionFormState) => {
    const fd = new FormData();
    fd.set("optionId", option.id);
    fd.set("name", data.name);
    fd.set("description", data.description);
    fd.set("imageUrl", data.imageUrl);
    fd.set("price", data.price);
    fd.set("displayOrder", data.displayOrder);
    startTransition(async () => {
      await updateProductOptionAction(slug, fd);
      setEditing(false);
      onRefresh();
      toast.success("Adicional atualizado.");
    });
  };

  const handleDelete = () => {
    const fd = new FormData();
    fd.set("optionId", option.id);
    startTransition(async () => {
      await deleteProductOptionAction(slug, fd);
      onRefresh();
      toast.success("Adicional removido.");
    });
  };

  if (editing) {
    return (
      <OptionForm
        initial={{
          name: option.name,
          description: option.description ?? "",
          imageUrl: option.imageUrl ?? "",
          price: String(option.price),
          displayOrder: String(option.displayOrder),
        }}
        onSubmit={handleUpdate}
        onCancel={() => setEditing(false)}
        isPending={isPending}
        submitLabel="Salvar"
      />
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
      {option.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={option.imageUrl}
          alt={option.name}
          className="h-8 w-8 shrink-0 rounded-md border object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{option.name}</p>
        {option.description && (
          <p className="truncate text-xs text-muted-foreground">
            {option.description}
          </p>
        )}
      </div>
      <span className="shrink-0 text-sm text-muted-foreground">
        {(option.price ?? 0) > 0 ? `+ R$ ${(option.price ?? 0).toFixed(2)}` : "Grátis"}
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
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2Icon size={12} />
        </Button>
      </div>
    </div>
  );
}

function GroupCard({
  group,
  slug,
  productId,
  onRefresh,
}: {
  group: GroupWithOptions;
  slug: string;
  productId: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingGroup, setEditingGroup] = useState(false);
  const [addingOption, setAddingOption] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPendingGroup, startGroupTransition] = useTransition();
  const [isPendingOption, startOptionTransition] = useTransition();

  const handleUpdateGroup = (data: GroupFormState) => {
    const fd = new FormData();
    fd.set("groupId", group.id);
    fd.set("productId", productId);
    fd.set("name", data.name);
    fd.set("minOptions", data.minOptions);
    fd.set("maxOptions", data.maxOptions);
    fd.set("displayOrder", data.displayOrder);
    startGroupTransition(async () => {
      await updateProductOptionGroupAction(slug, fd);
      setEditingGroup(false);
      onRefresh();
      toast.success("Grupo atualizado.");
    });
  };

  const handleUnlink = () => {
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("groupId", group.id);
    startGroupTransition(async () => {
      await unlinkOptionGroupFromProductAction(slug, fd);
      onRefresh();
      toast.success("Grupo desvinculado deste produto.");
    });
  };

  const handleDeleteGroup = () => {
    const fd = new FormData();
    fd.set("groupId", group.id);
    startGroupTransition(async () => {
      await deleteProductOptionGroupAction(slug, fd);
      onRefresh();
      toast.success("Grupo excluído permanentemente.");
    });
  };

  const handleAddOption = (data: OptionFormState) => {
    const fd = new FormData();
    fd.set("groupId", group.id);
    fd.set("name", data.name);
    fd.set("description", data.description);
    fd.set("imageUrl", data.imageUrl);
    fd.set("price", data.price);
    fd.set("displayOrder", String(group.options.length));
    startOptionTransition(async () => {
      await createProductOptionAction(slug, fd);
      setAddingOption(false);
      onRefresh();
      toast.success("Adicional criado.");
    });
  };

  if (editingGroup) {
    return (
      <GroupForm
        initial={{
          name: group.name,
          minOptions: String(group.minOptions),
          maxOptions: String(group.maxOptions),
          displayOrder: String(group.displayOrder),
        }}
        onSubmit={handleUpdateGroup}
        onCancel={() => setEditingGroup(false)}
        isPending={isPendingGroup}
        submitLabel="Salvar grupo"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-slate-50">
      <div
        className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-100"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronUpIcon size={15} />
          ) : (
            <ChevronDownIcon size={15} />
          )}
          <span className="truncate text-sm font-semibold">{group.name}</span>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {group.options.length} itens
          </Badge>
          {group.minOptions > 0 && (
            <Badge variant="danger" className="shrink-0 text-xs">
              Obrigatório
            </Badge>
          )}
        </div>
        <div
          className="flex shrink-0 gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditingGroup(true)}
            disabled={isPendingGroup}
            title="Editar grupo"
          >
            <PencilIcon size={12} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-amber-600 hover:bg-amber-50"
            onClick={() => { setConfirmUnlink(true); setConfirmDelete(false); }}
            disabled={isPendingGroup}
            title="Desvincular deste produto"
          >
            <UnlinkIcon size={12} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-rose-500 hover:bg-rose-50"
            onClick={() => { setConfirmDelete(true); setConfirmUnlink(false); }}
            disabled={isPendingGroup}
            title="Excluir permanentemente"
          >
            <Trash2Icon size={12} />
          </Button>
        </div>
      </div>

      {confirmUnlink && (
        <div className="border-t bg-amber-50 px-4 py-3 text-sm">
          <p className="font-medium text-amber-800">Desvincular grupo deste produto?</p>
          <p className="mt-0.5 text-amber-700">
            O grupo e seus itens continuarão existindo e vinculados a outros produtos.
            Apenas este produto deixará de exibi-lo.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmUnlink(false)}
              disabled={isPendingGroup}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleUnlink}
              disabled={isPendingGroup}
            >
              {isPendingGroup ? "Desvinculando..." : "Desvincular"}
            </Button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="border-t bg-rose-50 px-4 py-3 text-sm">
          <p className="font-medium text-rose-800">Excluir grupo permanentemente?</p>
          <p className="mt-0.5 text-rose-700">
            Este grupo será removido de <strong>todos os produtos</strong> que o
            utilizam. Essa ação não pode ser desfeita.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              disabled={isPendingGroup}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleDeleteGroup}
              disabled={isPendingGroup}
            >
              {isPendingGroup ? "Excluindo..." : "Excluir permanentemente"}
            </Button>
          </div>
        </div>
      )}

      {expanded && !confirmUnlink && !confirmDelete && (
        <div className="space-y-2 border-t bg-slate-50/50 p-3">
          {group.options.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              slug={slug}
              onRefresh={onRefresh}
            />
          ))}

          {addingOption ? (
            <OptionForm
              initial={defaultOptionForm()}
              onSubmit={handleAddOption}
              onCancel={() => setAddingOption(false)}
              isPending={isPendingOption}
              submitLabel="Adicionar"
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-dashed"
              onClick={() => setAddingOption(true)}
            >
              <PlusIcon size={13} />
              Adicionar item
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function LinkGroupSelector({
  slug,
  productId,
  linkedGroupIds: linkedGroupIds,
  onLink,
  onCancel,
}: {
  slug: string;
  productId: string;
  linkedGroupIds: Set<string>;
  onLink: () => void;
  onCancel: () => void;
}) {
  const [allGroups, setAllGroups] = useState<GrupoAdicionalComOpcoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchRestaurantOptionGroupsAction(slug)
      .then((groups) => {
        setAllGroups(groups);
      })
      .catch((err) => {
        console.error("Erro ao carregar grupos do restaurante:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  const available = allGroups.filter((g) => !linkedGroupIds.has(g.id));

  const handleLink = () => {
    if (!selectedId) return;
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("groupId", selectedId);
    startTransition(async () => {
      await linkOptionGroupToProductAction(slug, fd);
      onLink();
      toast.success("Grupo vinculado ao produto.");
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-slate-50 p-4 text-center text-sm text-muted-foreground">
        Carregando grupos...
      </div>
    );
  }

  if (available.length === 0) {
    return (
      <div className="space-y-2 rounded-xl border bg-slate-50 p-4">
        <p className="text-sm text-muted-foreground">
          Todos os grupos globais já estão vinculados a este produto.
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
      <p className="text-sm font-medium">Vincular grupo existente</p>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Selecione um grupo...</option>
        {available.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name} ({g.options.length} itens)
          </option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleLink}
          disabled={isPending || !selectedId}
        >
          {isPending ? "Vinculando..." : "Vincular"}
        </Button>
      </div>
    </div>
  );
}

export function ProductOptionsManager({
  slug,
  productId,
}: ProductOptionsManagerProps) {
  const [groups, setGroups] = useState<GroupWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingGroup, setAddingGroup] = useState(false);
  const [linkingGroup, setLinkingGroup] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [refreshTick, setRefreshTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchProductOptionsAction(slug, productId);
      setGroups(result?.optionGroups ?? []);
    } catch (err) {
      console.error("Erro ao carregar adicionais do produto:", err);
      toast.error("Não foi possível carregar os adicionais do produto.");
    } finally {
      setLoading(false);
    }
  }, [slug, productId]);

  useEffect(() => {
    load();
  }, [load, refreshTick]);

  const handleRefresh = () => setRefreshTick((t) => t + 1);

  const handleAddGroup = (data: GroupFormState) => {
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("name", data.name);
    fd.set("minOptions", data.minOptions);
    fd.set("maxOptions", data.maxOptions);
    fd.set("displayOrder", String(groups.length));
    startTransition(async () => {
      await createProductOptionGroupAction(slug, fd);
      setAddingGroup(false);
      handleRefresh();
      toast.success("Grupo criado.");
    });
  };

  const linkedGroupIds = new Set(groups.map((g) => g.id));

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.length === 0 && !addingGroup && !linkingGroup && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum grupo de adicionais vinculado.
        </p>
      )}

      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          slug={slug}
          productId={productId}
          onRefresh={handleRefresh}
        />
      ))}

      {linkingGroup && (
        <LinkGroupSelector
          slug={slug}
          productId={productId}
          linkedGroupIds={linkedGroupIds}
          onLink={() => { setLinkingGroup(false); handleRefresh(); }}
          onCancel={() => setLinkingGroup(false)}
        />
      )}

      {addingGroup ? (
        <GroupForm
          initial={{ ...defaultGroupForm(), displayOrder: String(groups.length) }}
          onSubmit={handleAddGroup}
          onCancel={() => setAddingGroup(false)}
          isPending={isPending}
          submitLabel="Criar grupo"
        />
      ) : (
        !linkingGroup && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 border-dashed"
              onClick={() => setAddingGroup(true)}
            >
              <PlusIcon size={14} />
              Novo grupo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 border-dashed"
              onClick={() => setLinkingGroup(true)}
            >
              <LinkIcon size={14} />
              Vincular grupo existente
            </Button>
          </div>
        )
      )}
    </div>
  );
}
