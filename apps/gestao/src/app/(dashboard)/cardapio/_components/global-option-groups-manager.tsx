"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GrupoAdicionalComOpcoes } from "@/lib/admin-queries";
import type { ProductOption } from "@fsw/db";

interface GlobalOptionGroupsManagerProps {
  slug: string;
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
          >
            <PencilIcon size={12} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-rose-500 hover:bg-rose-50"
            onClick={() => setConfirmDelete(true)}
            disabled={isPendingGroup}
          >
            <Trash2Icon size={12} />
          </Button>
        </div>
      </div>

      {confirmDelete && (
        <div className="border-t bg-rose-50 px-4 py-3 text-sm">
          <p className="font-medium text-rose-800">
            Excluir grupo permanentemente?
          </p>
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

      {expanded && !confirmDelete && (
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

export function GlobalOptionGroupsManager({
  slug,
}: GlobalOptionGroupsManagerProps) {
  const [groups, setGroups] = useState<GrupoAdicionalComOpcoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingGroup, setAddingGroup] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [refreshTick, setRefreshTick] = useState(0);

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
      {groups.length === 0 && !addingGroup && (
        <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          <p className="font-medium">Nenhum grupo de adicionais cadastrado.</p>
          <p className="mt-1 text-xs">
            Crie grupos globais para reutilizá-los em vários produtos.
          </p>
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

      {addingGroup ? (
        <GroupForm
          initial={{ ...defaultGroupForm(), displayOrder: String(groups.length) }}
          onSubmit={handleAddGroup}
          onCancel={() => setAddingGroup(false)}
          isPending={isPending}
          submitLabel="Criar grupo"
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-dashed"
          onClick={() => setAddingGroup(true)}
        >
          <PlusIcon size={14} />
          Novo grupo de adicionais global
        </Button>
      )}
    </div>
  );
}
