"use client";

import { useTransition } from "react";

import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoriaComProdutos } from "@/lib/admin-queries";

interface CategoryFormProps {
  slug: string;
  defaultValues?: CategoriaComProdutos;
  onSuccess?: () => void;
}

export function CategoryForm({ slug, defaultValues, onSuccess }: CategoryFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (defaultValues) {
        formData.set("categoryId", defaultValues.id);
        await updateCategoryAction(slug, formData);
      } else {
        await createCategoryAction(slug, formData);
      }
      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cat-name" className="text-xs font-semibold text-slate-700">
          Nome da categoria
        </Label>
        <Input
          id="cat-name"
          name="name"
          placeholder="Ex.: Lanches especiais"
          defaultValue={defaultValues?.name}
          required
          className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cat-order" className="text-xs font-semibold text-slate-700">
            Ordem de exibição
          </Label>
          <Input
            id="cat-order"
            name="displayOrder"
            type="number"
            min="0"
            defaultValue={String(defaultValues?.displayOrder ?? 0)}
            required
            className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={defaultValues?.isActive ?? true}
              className="h-4 w-4 rounded accent-primary"
            />
            Categoria ativa
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100/80 transition-colors">
            <input
              type="checkbox"
              name="isPizzaCategory"
              defaultChecked={defaultValues?.isPizzaCategory ?? false}
              className="h-4 w-4 rounded accent-orange-600"
            />
            Categoria de pizzas (meio a meio)
          </label>
        </div>
      </div>

      {defaultValues?.imageUrl && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={defaultValues.imageUrl}
            alt={defaultValues.name}
            className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
          />
          <span className="text-xs text-slate-500">Imagem atual</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="cat-image-url" className="text-xs font-semibold text-slate-700">
          URL da imagem
        </Label>
        <Input
          id="cat-image-url"
          name="imageUrl"
          placeholder="https://..."
          defaultValue={defaultValues?.imageUrl ?? ""}
          className="h-10 rounded-xl border-slate-200 bg-white text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cat-image-file" className="text-xs font-semibold text-slate-700">
          {defaultValues ? "Substituir imagem (upload)" : "Upload de imagem"}
        </Label>
        <Input
          id="cat-image-file"
          name="imageFile"
          type="file"
          accept="image/*"
          className="h-10 rounded-xl border-slate-200 bg-white text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700"
        />
      </div>

      <Button
        type="submit"
        className="h-10 w-full rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
        disabled={isPending}
      >
        {isPending
          ? defaultValues
            ? "Salvando..."
            : "Criando..."
          : defaultValues
            ? "Salvar categoria"
            : "Criar categoria"}
      </Button>
    </form>
  );
}
