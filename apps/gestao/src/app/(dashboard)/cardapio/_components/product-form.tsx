"use client";

import { InfoIcon, SparklesIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createProductAction,
  generateProductAiAction,
  updateProductAction,
} from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CategoriaComProdutos } from "@/lib/admin-queries";
import type { Product } from "@fsw/db";

import { ProductOptionsManager } from "./product-options-manager";
import { RecipeManager } from "./recipe-manager";

interface ProductFormProps {
  slug: string;
  categories: CategoriaComProdutos[];
  defaultValues?: Product & { categoryId: string };
  onSuccess?: () => void;
}

function ProductFields({
  slug,
  categories,
  defaultValues,
  onSuccess,
}: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isGeneratingAi, startAiTransition] = useTransition();
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [nutritionValues, setNutritionValues] = useState({
    calories: defaultValues?.nutritionInfo?.calories ?? "",
    carbs: defaultValues?.nutritionInfo?.carbs ?? "",
    protein: defaultValues?.nutritionInfo?.protein ?? "",
    fat: defaultValues?.nutritionInfo?.fat ?? "",
    fiber: defaultValues?.nutritionInfo?.fiber ?? "",
    sodium: defaultValues?.nutritionInfo?.sodium ?? "",
  });

  const handleGenerateAi = (form: HTMLFormElement) => {
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value;
    const categoryId = (form.elements.namedItem("menuCategoryId") as HTMLSelectElement)?.value;
    const category = categories.find((c) => c.id === categoryId);

    if (!name || !categoryId) {
      toast.warning("Preencha o nome e selecione a categoria antes de gerar com IA.");
      return;
    }

    startAiTransition(async () => {
      const result = await generateProductAiAction(slug, name, category?.name ?? "");
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.description) setDescription(result.description);
      if (result.nutrition) {
        setNutritionValues({
          calories: result.nutrition.calories ?? "",
          carbs: result.nutrition.carbs ?? "",
          protein: result.nutrition.protein ?? "",
          fat: result.nutrition.fat ?? "",
          fiber: result.nutrition.fiber ?? "",
          sodium: result.nutrition.sodium ?? "",
        });
      }
      toast.success("Descrição e tabela nutricional geradas pela IA!");
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (defaultValues) {
        formData.set("productId", defaultValues.id);
        formData.set("currentImageUrl", defaultValues.imageUrl);
        await updateProductAction(slug, formData);
      } else {
        await createProductAction(slug, formData);
      }
      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="prod-name">Nome do produto</Label>
        <Input
          id="prod-name"
          name="name"
          placeholder="Ex.: Combo Big Burger"
          defaultValue={defaultValues?.name}
          required
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="prod-description">Descrição</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isGeneratingAi}
            onClick={(e) => handleGenerateAi(e.currentTarget.closest("form")!)}
            className="h-7 gap-1.5 border-purple-200 bg-purple-50 px-2.5 text-xs font-semibold text-purple-700 hover:bg-purple-100"
          >
            <SparklesIcon size={12} />
            {isGeneratingAi ? "Gerando..." : "Gerar com IA"}
          </Button>
        </div>
        <Textarea
          id="prod-description"
          name="description"
          placeholder="Descreva o produto para o cliente..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[80px]"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prod-price">Preço de venda</Label>
          <Input
            id="prod-price"
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaultValues ? String(defaultValues.price) : ""}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prod-cost">Preço de custo</Label>
          <Input
            id="prod-cost"
            name="costPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues ? String(defaultValues.costPrice) : "0"}
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prod-category">Categoria</Label>
          <select
            id="prod-category"
            name="menuCategoryId"
            defaultValue={defaultValues?.categoryId ?? ""}
            className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm"
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prod-sku">SKU</Label>
          <Input
            id="prod-sku"
            name="sku"
            placeholder="Ex.: LAN-001"
            defaultValue={defaultValues?.sku ?? ""}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prod-ingredients">Ingredientes</Label>
        <Input
          id="prod-ingredients"
          name="ingredients"
          placeholder="Separados por vírgula"
          defaultValue={defaultValues?.ingredients.join(", ") ?? ""}
        />
      </div>

      {!defaultValues && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <InfoIcon size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <p>
            Para adicionar ingredientes extras, tamanhos ou opcionais com cobrança de
            valores, crie e salve o produto primeiro. Após salvar, edite o produto e
            acesse a aba <strong>Adicionais</strong> que ficará disponível no topo.
          </p>
        </div>
      )}

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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prod-image-url">URL da imagem</Label>
          <Input
            id="prod-image-url"
            name="imageUrl"
            placeholder="https://..."
            defaultValue={defaultValues?.imageUrl ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prod-image-file">
            {defaultValues ? "Substituir imagem" : "Upload de imagem"}
          </Label>
          <Input id="prod-image-file" name="imageFile" type="file" accept="image/*" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prod-stock">Estoque inicial</Label>
          <Input
            id="prod-stock"
            name="stockQuantity"
            type="number"
            min="0"
            defaultValue={defaultValues ? String(defaultValues.stockQuantity) : "0"}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prod-threshold">Alerta de estoque baixo</Label>
          <Input
            id="prod-threshold"
            name="lowStockThreshold"
            type="number"
            min="0"
            defaultValue={defaultValues ? String(defaultValues.lowStockThreshold) : "0"}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-slate-50 px-3 py-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="trackInventory"
            defaultChecked={defaultValues?.trackInventory ?? true}
            className="h-4 w-4 rounded"
          />
          Controlar estoque deste produto
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-slate-50 px-3 py-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaultValues?.isActive ?? true}
            className="h-4 w-4 rounded"
          />
          Produto ativo para vendas
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="prod-ncm">NCM</Label>
          <Input
            id="prod-ncm"
            name="ncm"
            placeholder="21069090"
            defaultValue={defaultValues?.ncm ?? ""}
            maxLength={8}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prod-cfop">CFOP</Label>
          <Input
            id="prod-cfop"
            name="cfop"
            placeholder="5102"
            defaultValue={defaultValues?.cfop ?? ""}
            maxLength={4}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prod-csosn">CSOSN</Label>
          <Input
            id="prod-csosn"
            name="csosn"
            placeholder="102"
            defaultValue={defaultValues?.csosn ?? ""}
            maxLength={3}
          />
        </div>
      </div>

      {/* Vídeo */}
      <div className="space-y-1.5">
        <Label htmlFor="prod-video">URL do vídeo demonstrativo (opcional)</Label>
        <Input
          id="prod-video"
          name="videoUrl"
          placeholder="https://youtube.com/..."
          defaultValue={defaultValues?.videoUrl ?? ""}
        />
      </div>

      {/* Horário de disponibilidade */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prod-available-from">Disponível a partir de</Label>
          <Input
            id="prod-available-from"
            name="availableFrom"
            type="time"
            defaultValue={defaultValues?.availableFrom ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prod-available-to">Disponível até</Label>
          <Input
            id="prod-available-to"
            name="availableTo"
            type="time"
            defaultValue={defaultValues?.availableTo ?? ""}
          />
        </div>
      </div>

      {/* Selos alimentares */}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Selos alimentares</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["isVegan", "isGlutenFree", "isLactoseFree", "isSpicy"] as const).map((field) => {
            const labels: Record<string, string> = {
              isVegan: "Vegano",
              isGlutenFree: "Sem Glúten",
              isLactoseFree: "Sem Lactose",
              isSpicy: "Picante",
            };
            return (
              <label key={field} className="flex cursor-pointer items-center gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name={field}
                  defaultChecked={(defaultValues as Record<string, unknown>)?.[field] as boolean ?? false}
                  className="h-4 w-4 rounded"
                />
                {labels[field]}
              </label>
            );
          })}
        </div>
      </div>

      {/* Tabela nutricional */}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Tabela Nutricional (por porção)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { name: "nutritionCalories", label: "Calorias (kcal)", key: "calories" },
            { name: "nutritionCarbs", label: "Carboidratos (g)", key: "carbs" },
            { name: "nutritionProtein", label: "Proteínas (g)", key: "protein" },
            { name: "nutritionFat", label: "Gorduras (g)", key: "fat" },
            { name: "nutritionFiber", label: "Fibras (g)", key: "fiber" },
            { name: "nutritionSodium", label: "Sódio (mg)", key: "sodium" },
          ].map(({ name, label, key }) => (
            <div key={name} className="space-y-1">
              <Label htmlFor={`prod-${name}`} className="text-xs">{label}</Label>
              <Input
                id={`prod-${name}`}
                name={name}
                type="number"
                min="0"
                step="0.1"
                value={String(nutritionValues[key as keyof typeof nutritionValues])}
                onChange={(e) => setNutritionValues((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? defaultValues
            ? "Salvando..."
            : "Criando..."
          : defaultValues
            ? "Salvar produto"
            : "Criar produto"}
      </Button>
    </form>
  );
}

export function ProductForm({ slug, categories, defaultValues, onSuccess }: ProductFormProps) {
  if (!defaultValues) {
    return (
      <ProductFields
        slug={slug}
        categories={categories}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-4 w-full">
        <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
        <TabsTrigger value="recipe" className="flex-1">Ficha Técnica</TabsTrigger>
        <TabsTrigger value="options" className="flex-1">Adicionais</TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <ProductFields
          slug={slug}
          categories={categories}
          defaultValues={defaultValues}
          onSuccess={onSuccess}
        />
      </TabsContent>

      <TabsContent value="recipe">
        <RecipeManager slug={slug} productId={defaultValues.id} />
      </TabsContent>

      <TabsContent value="options">
        <ProductOptionsManager slug={slug} productId={defaultValues.id} />
      </TabsContent>
    </Tabs>
  );
}
