"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UnlinkIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
import type { GrupoAdicionalComOpcoes } from "@/lib/admin-queries";
import type { ProductOption, ProductOptionGroup } from "@fsw/db";

interface ProductOptionsManagerProps {
  slug: string;
  productId: string;
}

const formatCurrencyInput = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number") {
    if (isNaN(val) || val < 0) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  }
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  const num = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
};

const parseCurrencyToRawNumber = (val: string): number => {
  const digits = val.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
};

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
  price: "",
  displayOrder: "0",
  imageFile: null,
});

function GroupDialog({
  open,
  onOpenChange,
  initial,
  title,
  description,
  submitLabel,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: GroupFormState;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (data: GroupFormState) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<GroupFormState>(initial);

  useEffect(() => {
    if (open) {
      setForm(initial);
    }
  }, [open, initial]);

  const set =
    (field: keyof GroupFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="prog-group-name" className="text-xs font-semibold text-slate-700">
                Nome do Grupo
              </Label>
              <Input
                id="prog-group-name"
                value={form.name}
                onChange={set("name")}
                placeholder="Ex: Tamanho, Molhos, Ponto da Carne..."
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prog-group-min" className="text-xs font-semibold text-slate-700">
                  Mínimo de opções
                </Label>
                <Input
                  id="prog-group-min"
                  type="number"
                  min="0"
                  value={form.minOptions}
                  onChange={set("minOptions")}
                  required
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-slate-400">
                  Deixe 0 se for opcional.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prog-group-max" className="text-xs font-semibold text-slate-700">
                  Máximo de opções
                </Label>
                <Input
                  id="prog-group-max"
                  type="number"
                  min="1"
                  value={form.maxOptions}
                  onChange={set("maxOptions")}
                  required
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-slate-400">
                  Quantidade máxima permitida.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prog-group-order" className="text-xs font-semibold text-slate-700">
                Ordem de exibição
              </Label>
              <Input
                id="prog-group-order"
                value={form.displayOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: e.target.value.replace(/\D/g, "") }))}
                placeholder="0"
                className="h-9 text-xs font-mono"
              />
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
              disabled={isPending || !form.name.trim()}
              className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25"
            >
              {isPending && <Loader2Icon size={14} className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OptionDialog({
  open,
  onOpenChange,
  initial,
  title,
  description,
  submitLabel,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: OptionFormState;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (data: OptionFormState) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<OptionFormState>(initial);
  const [preview, setPreview] = useState<string>(initial.imageUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initial);
      setPreview(initial.imageUrl || "");
    }
  }, [open, initial]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="prog-opt-name" className="text-xs font-semibold text-slate-700">
                Nome do Adicional
              </Label>
              <Input
                id="prog-opt-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Bacon Extra, Queijo Cheddar, Molho Especial..."
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prog-opt-desc" className="text-xs font-semibold text-slate-700">
                Descrição (opcional)
              </Label>
              <Input
                id="prog-opt-desc"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descrição do ingrediente ou porção..."
                className="h-9 text-xs"
              />
            </div>

            {/* Upload de Imagem */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Foto do Adicional (opcional)
              </Label>
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
                      Carregar imagem
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
                  <p className="text-[10px] text-slate-500">
                    PNG, JPG ou WEBP até 2MB.
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prog-opt-price" className="text-xs font-semibold text-slate-700">
                  Preço Adicional
                </Label>
                <Input
                  id="prog-opt-price"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: formatCurrencyInput(e.target.value) }))}
                  placeholder="R$ 0,00"
                  className="h-9 text-xs font-medium"
                />
                <p className="text-[10px] text-slate-400">
                  Deixe R$ 0,00 se for gratuito.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prog-opt-order" className="text-xs font-semibold text-slate-700">
                  Ordem de Exibição
                </Label>
                <Input
                  id="prog-opt-order"
                  value={form.displayOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: e.target.value.replace(/\D/g, "") }))}
                  placeholder="0"
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Posição na listagem.
                </p>
              </div>
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
              disabled={isPending || !form.name.trim()}
              className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25"
            >
              {isPending && <Loader2Icon size={14} className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  const [confirmDeleteOption, setConfirmDeleteOption] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (data: OptionFormState) => {
    const fd = new FormData();
    fd.set("optionId", option.id);
    fd.set("name", data.name.trim());
    fd.set("description", data.description.trim());
    fd.set("imageUrl", data.imageUrl);
    if (data.imageFile) {
      fd.set("imageFile", data.imageFile);
    }
    fd.set("price", String(parseCurrencyToRawNumber(data.price)));
    fd.set("displayOrder", data.displayOrder ? data.displayOrder.replace(/\D/g, "") : "0");
    startTransition(async () => {
      await updateProductOptionAction(slug, fd);
      setEditing(false);
      onRefresh();
      toast.success("Adicional atualizado com sucesso!");
    });
  };

  const handleDelete = () => {
    const fd = new FormData();
    fd.set("optionId", option.id);
    startTransition(async () => {
      await deleteProductOptionAction(slug, fd);
      setConfirmDeleteOption(false);
      onRefresh();
      toast.success("Adicional removido.");
    });
  };

  return (
    <>
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
        <span className="shrink-0 text-sm text-muted-foreground font-medium">
          {(option.price ?? 0) > 0 ? `+ R$ ${(option.price ?? 0).toFixed(2)}` : "Grátis"}
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
                <span>Editar dados</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmDeleteOption(true)}
                disabled={isPending}
                className="cursor-pointer gap-2 text-xs font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700 hover:bg-rose-50"
              >
                <Trash2Icon size={13} />
                <span>Excluir item</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <OptionDialog
        open={editing}
        onOpenChange={setEditing}
        initial={{
          name: option.name,
          description: option.description ?? "",
          imageUrl: option.imageUrl ?? "",
          price: formatCurrencyInput(option.price),
          displayOrder: String(option.displayOrder),
        }}
        title="Editar Item Adicional"
        description={`Edite as informações, preço e imagem do adicional "${option.name}".`}
        submitLabel="Salvar Alterações"
        onSubmit={handleUpdate}
        isPending={isPending}
      />

      <ConfirmDeleteDialog
        open={confirmDeleteOption}
        onOpenChange={setConfirmDeleteOption}
        title="Excluir Adicional"
        description={
          <>
            Tem certeza que deseja remover o adicional{" "}
            <strong className="text-slate-900 font-semibold">{option.name}</strong>?
            Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Sim, excluir adicional"
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </>
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
    fd.set("name", data.name.trim());
    fd.set("description", data.description.trim());
    fd.set("imageUrl", data.imageUrl);
    if (data.imageFile) {
      fd.set("imageFile", data.imageFile);
    }
    fd.set("price", String(parseCurrencyToRawNumber(data.price)));
    fd.set("displayOrder", data.displayOrder ? data.displayOrder.replace(/\D/g, "") : String(group.options.length));
    startOptionTransition(async () => {
      await createProductOptionAction(slug, fd);
      setAddingOption(false);
      onRefresh();
      toast.success("Adicional criado com sucesso!");
    });
  };

  return (
    <>
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
            className="flex shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
                  disabled={isPendingGroup}
                >
                  <MoreHorizontalIcon size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 bg-white shadow-lg">
                <DropdownMenuItem
                  onClick={() => setEditingGroup(true)}
                  disabled={isPendingGroup}
                  className="cursor-pointer gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                >
                  <PencilIcon size={13} className="text-primary" />
                  <span>Editar dados</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setConfirmUnlink(true)}
                  disabled={isPendingGroup}
                  className="cursor-pointer gap-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 focus:bg-amber-50"
                >
                  <UnlinkIcon size={13} />
                  <span>Desvincular produto</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPendingGroup}
                  className="cursor-pointer gap-2 text-xs font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700 hover:bg-rose-50"
                >
                  <Trash2Icon size={13} />
                  <span>Excluir grupo</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {expanded && (
          <div className="space-y-2 border-t bg-slate-50/50 p-3">
            {group.options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                slug={slug}
                onRefresh={onRefresh}
              />
            ))}

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

            <OptionDialog
              open={addingOption}
              onOpenChange={setAddingOption}
              initial={defaultOptionForm()}
              title="Cadastrar Novo Adicional"
              description={`Adicione um novo item ou complemento ao grupo "${group.name}".`}
              submitLabel="Cadastrar Item"
              onSubmit={handleAddOption}
              isPending={isPendingOption}
            />
          </div>
        )}
      </div>

      <GroupDialog
        open={editingGroup}
        onOpenChange={setEditingGroup}
        initial={{
          name: group.name,
          minOptions: String(group.minOptions),
          maxOptions: String(group.maxOptions),
          displayOrder: String(group.displayOrder),
        }}
        title="Editar Grupo de Adicionais"
        description="Altere as configurações e limites deste grupo de adicionais."
        submitLabel="Salvar Alterações"
        onSubmit={handleUpdateGroup}
        isPending={isPendingGroup}
      />

      <ConfirmDeleteDialog
        open={confirmUnlink}
        onOpenChange={setConfirmUnlink}
        title="Desvincular Grupo"
        description={
          <>
            Tem certeza que deseja desvincular o grupo{" "}
            <strong className="text-slate-900 font-semibold">{group.name}</strong> deste produto?
            O grupo continuará existindo e vinculado aos outros produtos.
          </>
        }
        confirmLabel="Sim, desvincular"
        isPending={isPendingGroup}
        onConfirm={handleUnlink}
      />

      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir Grupo de Adicionais"
        description={
          <>
            Tem certeza que deseja remover o grupo{" "}
            <strong className="text-slate-900 font-semibold">{group.name}</strong>?
            Este grupo será removido de <strong>todos os produtos</strong> do cardápio. Essa ação não pode ser desfeita.
          </>
        }
        confirmLabel="Sim, excluir grupo"
        isPending={isPendingGroup}
        onConfirm={handleDeleteGroup}
      />
    </>
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
    fd.set("name", data.name.trim());
    fd.set("minOptions", data.minOptions);
    fd.set("maxOptions", data.maxOptions);
    fd.set("displayOrder", data.displayOrder || "0");
    startTransition(async () => {
      await createProductOptionGroupAction(slug, fd);
      setAddingGroup(false);
      handleRefresh();
      toast.success("Grupo cadastrado com sucesso!");
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

      <GroupDialog
        open={addingGroup}
        onOpenChange={setAddingGroup}
        initial={defaultGroupForm()}
        title="Cadastrar Novo Grupo de Adicionais"
        description="Cadastre um novo grupo de adicionais para este produto."
        submitLabel="Cadastrar Grupo"
        onSubmit={handleAddGroup}
        isPending={isPending}
      />

      {!linkingGroup && (
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
      )}
    </div>
  );
}
