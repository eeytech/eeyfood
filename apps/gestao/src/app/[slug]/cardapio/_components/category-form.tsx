"use client";

import { useTransition } from "react";

import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/[slug]/actions";
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
        <Label htmlFor="cat-name">Nome da categoria</Label>
        <Input
          id="cat-name"
          name="name"
          placeholder="Ex.: Lanches especiais"
          defaultValue={defaultValues?.name}
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cat-order">Ordem de exibição</Label>
          <Input
            id="cat-order"
            name="displayOrder"
            type="number"
            min="0"
            defaultValue={String(defaultValues?.displayOrder ?? 0)}
            required
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-slate-50 px-3 py-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaultValues?.isActive ?? true}
            className="h-4 w-4 rounded"
          />
          Categoria ativa
        </label>
      </div>

      {defaultValues?.imageUrl && (
        <div className="flex items-center gap-3 rounded-md border bg-slate-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={defaultValues.imageUrl}
            alt={defaultValues.name}
            className="h-12 w-12 rounded-md border object-cover"
          />
          <span className="text-xs text-muted-foreground">Imagem atual</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="cat-image-url">URL da imagem</Label>
        <Input
          id="cat-image-url"
          name="imageUrl"
          placeholder="https://..."
          defaultValue={defaultValues?.imageUrl ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cat-image-file">
          {defaultValues ? "Substituir imagem (upload)" : "Upload de imagem"}
        </Label>
        <Input id="cat-image-file" name="imageFile" type="file" accept="image/*" />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
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
