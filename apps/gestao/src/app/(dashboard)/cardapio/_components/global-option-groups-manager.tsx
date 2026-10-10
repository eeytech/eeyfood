"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  ListPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createProductOptionGroupAction,
  createProductOptionAction,
  deleteProductOptionGroupAction,
  deleteProductOptionAction,
  fetchRestaurantOptionGroupsAction,
  updateProductOptionGroupAction,
  updateProductOptionAction,
} from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GrupoAdicionalComOpcoes } from "@/lib/admin-queries";
import type { ProductOption } from "@fsw/db";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface GlobalOptionGroupsManagerProps {
  slug: string;
  isAddingGroup?: boolean;
  onAddingGroupChange?: (open: boolean) => void;
}

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
  imageFile?: File | null;
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
  imageFile: null,
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
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
          className="h-9 rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
        >
          <XIcon size={14} className="mr-1" />
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onSubmit(form)}
          disabled={isPending || !form.name.trim()}
          className="h-9 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
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
  const [preview, setPreview] = useState<string>(initial.imageUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set =
    (field: keyof OptionFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setForm((prev) => ({ ...prev, imageFile: file, imageUrl: objectUrl }));
  };

  const handleRemoveImage = () => {
    setPreview("");
    setForm((prev) => ({ ...prev, imageUrl: "", imageFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

        {/* Upload de Imagem do Adicional (Salva direto no servidor) */}
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Foto do adicional (opcional)</Label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-100"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UploadIcon size={18} className="text-slate-400" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
                <UploadIcon size={16} className="text-white" />
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon size={12} className="mr-1" />
                  Carregar do dispositivo
                </Button>
                {preview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={handleRemoveImage}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Upload direto salvo no servidor (máx. 2MB).
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
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
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
          className="h-8 rounded-full border-slate-200 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
        >
          <XIcon size={12} className="mr-1" />
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onSubmit(form)}
          disabled={isPending || !form.name.trim()}
          className="h-8 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
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
    if (data.imageFile) {
      fd.set("imageFile", data.imageFile);
    }
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
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs transition-colors hover:bg-slate-50/60">
      {option.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={option.imageUrl}
          alt={option.name}
          className="h-9 w-9 shrink-0 rounded-lg border border-slate-200/80 object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-100 text-slate-400">
          <ListPlusIcon size={16} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-900">{option.name}</p>
        {option.description && (
          <p className="truncate text-[11px] text-slate-500">
            {option.description}
          </p>
        )}
      </div>
      <span className="shrink-0 font-display text-xs font-bold text-slate-900">
        {(option.price ?? 0) > 0 ? `+ ${formatCurrency(option.price ?? 0)}` : "Grátis"}
      </span>
      <div className="flex shrink-0 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <MoreHorizontalIcon size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-xl border-slate-200 bg-white shadow-lg">
            <DropdownMenuItem
              onClick={() => setEditing(true)}
              disabled={isPending}
              className="cursor-pointer gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
            >
              <PencilIcon size={13} className="text-primary" />
              <span>Editar Item</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isPending}
              className="cursor-pointer gap-2 text-xs font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700 hover:bg-rose-50"
            >
              <Trash2Icon size={13} />
              <span>Excluir</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function GlobalGroupCard({
  group,
  slug,
  onRefresh,
}: {
  group: GrupoAdicionalComOpcoes;
  slug: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [addingOption, setAddingOption] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPendingGroup, startGroupTransition] = useTransition();
  const [isPendingOption, startOptionTransition] = useTransition();

  const handleUpdateGroup = (data: GroupFormState) => {
    const fd = new FormData();
    fd.set("groupId", group.id);
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

  const handleDeleteGroup = () => {
    const fd = new FormData();
    fd.set("groupId", group.id);
    startGroupTransition(async () => {
      await deleteProductOptionGroupAction(slug, fd);
      onRefresh();
      toast.success("Grupo excluído.");
    });
  };

  const handleAddOption = (data: OptionFormState) => {
    const fd = new FormData();
    fd.set("groupId", group.id);
    fd.set("name", data.name);
    fd.set("description", data.description);
    fd.set("imageUrl", data.imageUrl);
    if (data.imageFile) {
      fd.set("imageFile", data.imageFile);
    }
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
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
      <div
        className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 bg-slate-50/60 transition-colors hover:bg-slate-100/70"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="text-slate-400">
            {expanded ? (
              <ChevronUpIcon size={16} />
            ) : (
              <ChevronDownIcon size={16} />
            )}
          </div>
          <span className="truncate text-sm font-semibold text-slate-900">{group.name}</span>
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            {group.options.length} {group.options.length === 1 ? "item" : "itens"}
          </span>
          {group.minOptions > 0 ? (
            <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
              Obrigatório (mín: {group.minOptions})
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
              Opcional (máx: {group.maxOptions})
            </span>
          )}
        </div>
        <div
          className="flex shrink-0 items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
                disabled={isPendingGroup}
              >
                <MoreHorizontalIcon size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl border-slate-200 bg-white shadow-lg">
              <DropdownMenuItem
                onClick={() => setEditingGroup(true)}
                disabled={isPendingGroup}
                className="cursor-pointer gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
              >
                <PencilIcon size={14} className="text-primary" />
                <span>Editar Grupo</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmDelete(true)}
                disabled={isPendingGroup}
                className="cursor-pointer gap-2 text-xs font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700 hover:bg-rose-50"
              >
                <Trash2Icon size={14} />
                <span>Excluir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {confirmDelete && (
        <div className="border-t border-rose-100 bg-rose-50/70 px-4 py-3 text-sm">
          <p className="font-semibold text-rose-900">
            Excluir grupo permanentemente?
          </p>
          <p className="mt-0.5 text-xs text-rose-700">
            Este grupo será removido de <strong>todos os produtos</strong> que o
            utilizam no cardápio. Essa ação não pode ser desfeita.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              disabled={isPendingGroup}
              className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-full bg-rose-600 hover:bg-rose-700 px-4 text-xs font-semibold text-white shadow-sm"
              onClick={handleDeleteGroup}
              disabled={isPendingGroup}
            >
              {isPendingGroup ? "Excluindo..." : "Excluir permanentemente"}
            </Button>
          </div>
        </div>
      )}

      {expanded && !confirmDelete && (
        <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/40 p-4">
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
              className="h-9 w-full gap-2 rounded-xl border-dashed border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs"
              onClick={() => setAddingOption(true)}
            >
              <PlusIcon size={14} />
              Adicionar item a este grupo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function GlobalOptionGroupsManager({
  slug,
  isAddingGroup: controlledAddingGroup,
  onAddingGroupChange,
}: GlobalOptionGroupsManagerProps) {
  const [groups, setGroups] = useState<GrupoAdicionalComOpcoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalAddingGroup, setInternalAddingGroup] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [refreshTick, setRefreshTick] = useState(0);

  const addingGroup =
    controlledAddingGroup !== undefined ? controlledAddingGroup : internalAddingGroup;
  const setAddingGroup = (value: boolean) => {
    setInternalAddingGroup(value);
    onAddingGroupChange?.(value);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRestaurantOptionGroupsAction(slug);
      setGroups(result);
    } catch (err) {
      console.error("Erro ao carregar grupos de adicionais:", err);
      toast.error("Não foi possível carregar os grupos de adicionais.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load, refreshTick]);

  const handleRefresh = () => setRefreshTick((t) => t + 1);

  const handleAddGroup = (data: GroupFormState) => {
    const fd = new FormData();
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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addingGroup && (
        <GroupForm
          initial={{ ...defaultGroupForm(), displayOrder: String(groups.length) }}
          onSubmit={handleAddGroup}
          onCancel={() => setAddingGroup(false)}
          isPending={isPending}
          submitLabel="Criar grupo"
        />
      )}

      {groups.length === 0 && !addingGroup && (
        <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40">
          <div className="rounded-2xl bg-primary/10 p-3.5 text-primary border border-primary/20">
            <ListPlusIcon size={28} />
          </div>
          <h4 className="mt-3 font-display text-sm font-semibold text-slate-900">
            Nenhum grupo de adicionais cadastrado
          </h4>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Crie grupos de complementos reutilizáveis para vinculá-los aos produtos do seu cardápio.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setAddingGroup(true)}
            className="mt-4 gap-1.5 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            <PlusIcon size={14} />
            Criar primeiro grupo
          </Button>
        </div>
      )}

      {groups.map((group) => (
        <GlobalGroupCard
          key={group.id}
          group={group}
          slug={slug}
          onRefresh={handleRefresh}
        />
      ))}
    </div>
  );
}
