"use client";

import { Loader2Icon, UploadIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CategoriaComProdutos } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";

interface CategoryFormProps {
  slug: string;
  defaultValues?: CategoriaComProdutos;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CategoryForm({
  slug,
  defaultValues,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [displayOrder, setDisplayOrder] = useState(
    String(defaultValues?.displayOrder ?? 0),
  );
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);
  const [isPizzaCategory, setIsPizzaCategory] = useState(
    defaultValues?.isPizzaCategory ?? false,
  );
  const [preview, setPreview] = useState<string>(defaultValues?.imageUrl ?? "");
  const [hasImageFile, setHasImageFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setHasImageFile(true);
  };

  const handleRemoveImage = () => {
    setPreview("");
    setHasImageFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      newErrors.name = "Informe o nome da categoria.";
    }

    if (displayOrder === "" || isNaN(Number(displayOrder)) || Number(displayOrder) < 0) {
      newErrors.displayOrder = "Informe uma ordem de exibição válida (número maior ou igual a 0).";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError || "Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setErrors({});
    const formData = new FormData();
    formData.set("name", trimmedName);
    formData.set("displayOrder", String(Number(displayOrder)));
    formData.set("isActive", isActive ? "true" : "false");
    formData.set("isPizzaCategory", isPizzaCategory ? "true" : "false");

    if (fileInputRef.current?.files?.[0]) {
      formData.set("imageFile", fileInputRef.current.files[0]);
    } else if (preview) {
      formData.set("imageUrl", preview);
    } else {
      formData.set("imageUrl", "");
    }

    startTransition(async () => {
      try {
        if (defaultValues) {
          formData.set("categoryId", defaultValues.id);
          await updateCategoryAction(slug, formData);
          toast.success("Categoria atualizada com sucesso!");
        } else {
          await createCategoryAction(slug, formData);
          toast.success("Categoria cadastrada com sucesso!");
        }
        onSuccess?.();
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Erro ao salvar categoria.";
        toast.error(errorMsg);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className="text-lg font-bold text-slate-900">
          {defaultValues ? "Editar Categoria" : "Cadastrar Nova Categoria"}
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500">
          {defaultValues
            ? "Atualize as informações e preferências desta categoria de produtos."
            : "Cadastre uma nova categoria para organizar e exibir seus produtos no cardápio."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="cat-name" className="text-xs font-semibold text-slate-700">
            Nome da Categoria
          </Label>
          <Input
            id="cat-name"
            name="name"
            placeholder="Ex.: Lanches Especiais, Bebidas, Sobremesas..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            className={cn(
              "h-9 text-xs transition-colors",
              errors.name && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
            )}
          />
          {errors.name && (
            <p className="text-[11px] font-medium text-rose-500">{errors.name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-order" className="text-xs font-semibold text-slate-700">
            Ordem de Exibição
          </Label>
          <Input
            id="cat-order"
            name="displayOrder"
            type="number"
            min="0"
            value={displayOrder}
            onChange={(e) => {
              setDisplayOrder(e.target.value);
              if (errors.displayOrder) setErrors((prev) => ({ ...prev, displayOrder: "" }));
            }}
            className={cn(
              "h-9 text-xs transition-colors",
              errors.displayOrder && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/20",
            )}
          />
          {errors.displayOrder && (
            <p className="text-[11px] font-medium text-rose-500">{errors.displayOrder}</p>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label htmlFor="cat-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Categoria ativa
              </Label>
              <p className="text-[11px] text-slate-500">
                Visível para os clientes no cardápio digital
              </p>
            </div>
            <Switch
              id="cat-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-3">
            <div>
              <Label htmlFor="cat-pizza" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Categoria de pizzas (meio a meio)
              </Label>
              <p className="text-[11px] text-slate-500">
                Permite combinar sabores e regras de fatias
              </p>
            </div>
            <Switch
              id="cat-pizza"
              checked={isPizzaCategory}
              onCheckedChange={setIsPizzaCategory}
            />
          </div>
        </div>

        {/* Upload de Imagem */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">
            Foto da Categoria (opcional)
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
                  alt="Preview da categoria"
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
              id="cat-image-file"
              name="imageFile"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
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
          {defaultValues ? "Salvar Alterações" : "Cadastrar Categoria"}
        </Button>
      </DialogFooter>
    </form>
  );
}
