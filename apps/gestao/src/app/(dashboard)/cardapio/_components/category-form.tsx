"use client";

import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
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
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);
  const [isPizzaCategory, setIsPizzaCategory] = useState(
    defaultValues?.isPizzaCategory ?? false,
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("isActive", isActive ? "true" : "false");
    formData.set("isPizzaCategory", isPizzaCategory ? "true" : "false");

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
      } catch (err) {
        toast.error("Erro ao salvar categoria.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
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
            defaultValue={defaultValues?.name}
            required
            className="h-9 text-xs"
          />
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
            defaultValue={String(defaultValues?.displayOrder ?? 0)}
            required
            className="h-9 text-xs"
          />
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

        {defaultValues?.imageUrl && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={defaultValues.imageUrl}
              alt={defaultValues.name}
              className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
            />
            <span className="text-xs text-slate-500">Imagem atual configurada</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="cat-image-url" className="text-xs font-semibold text-slate-700">
            URL da Imagem (opcional)
          </Label>
          <Input
            id="cat-image-url"
            name="imageUrl"
            placeholder="https://..."
            defaultValue={defaultValues?.imageUrl ?? ""}
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-image-file" className="text-xs font-semibold text-slate-700">
            {defaultValues ? "Substituir Imagem (upload)" : "Upload de Imagem"}
          </Label>
          <Input
            id="cat-image-file"
            name="imageFile"
            type="file"
            accept="image/*"
            className="h-9 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-slate-700"
          />
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
