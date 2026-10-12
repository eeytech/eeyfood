"use client";

import { InfoIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createProductAction,
  generateProductAiAction,
  updateProductAction,
} from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  onCancel?: () => void;
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

function ProductFields({
  slug,
  categories,
  defaultValues,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isGeneratingAi, startAiTransition] = useTransition();

  const [name, setName] = useState(defaultValues?.name ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [price, setPrice] = useState(
    defaultValues ? formatCurrencyInput(defaultValues.price) : "",
  );
  const [costPrice, setCostPrice] = useState(
    defaultValues ? formatCurrencyInput(defaultValues.costPrice) : "",
  );
  const [categoryId, setCategoryId] = useState(defaultValues?.categoryId ?? "");
  const [trackInventory, setTrackInventory] = useState(
    defaultValues?.trackInventory ?? true,
  );
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);

  const [ncm, setNcm] = useState(defaultValues?.ncm ?? "");
  const [cfop, setCfop] = useState(defaultValues?.cfop ?? "");
  const [csosn, setCsosn] = useState(defaultValues?.csosn ?? "");

  const [foodBadges, setFoodBadges] = useState({
    isVegan: (defaultValues as Record<string, unknown> | undefined)?.isVegan === true,
    isGlutenFree:
      (defaultValues as Record<string, unknown> | undefined)?.isGlutenFree === true,
    isLactoseFree:
      (defaultValues as Record<string, unknown> | undefined)?.isLactoseFree === true,
    isSpicy: (defaultValues as Record<string, unknown> | undefined)?.isSpicy === true,
  });

  const [nutritionValues, setNutritionValues] = useState({
    calories: defaultValues?.nutritionInfo?.calories ?? "",
    carbs: defaultValues?.nutritionInfo?.carbs ?? "",
    protein: defaultValues?.nutritionInfo?.protein ?? "",
    fat: defaultValues?.nutritionInfo?.fat ?? "",
    fiber: defaultValues?.nutritionInfo?.fiber ?? "",
    sodium: defaultValues?.nutritionInfo?.sodium ?? "",
  });

  const handleGenerateAi = () => {
    const trimmedName = name.trim();
    const category = categories.find((c) => c.id === categoryId);

    if (!trimmedName || !categoryId) {
      toast.warning(
        "Preencha o nome do produto e selecione a categoria antes de gerar com IA.",
      );
      return;
    }

    startAiTransition(async () => {
      const result = await generateProductAiAction(
        slug,
        trimmedName,
        category?.name ?? "",
      );
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
      toast.success("Descrição e tabela nutricional geradas com IA!");
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!categoryId) {
      toast.error("Selecione uma categoria para o produto.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("name", name.trim());
    formData.set("description", description.trim());
    formData.set("price", String(parseCurrencyToRawNumber(price)));
    formData.set("costPrice", String(parseCurrencyToRawNumber(costPrice)));
    formData.set("menuCategoryId", categoryId);
    formData.set("trackInventory", trackInventory ? "true" : "false");
    formData.set("isActive", isActive ? "true" : "false");
    formData.set("ncm", ncm);
    formData.set("cfop", cfop);
    formData.set("csosn", csosn);

    for (const [key, val] of Object.entries(foodBadges)) {
      formData.set(key, val ? "true" : "false");
    }

    startTransition(async () => {
      try {
        if (defaultValues) {
          formData.set("productId", defaultValues.id);
          formData.set("currentImageUrl", defaultValues.imageUrl);
          await updateProductAction(slug, formData);
          toast.success("Produto atualizado com sucesso!");
        } else {
          await createProductAction(slug, formData);
          toast.success("Produto cadastrado com sucesso!");
        }
        onSuccess?.();
      } catch {
        toast.error("Erro ao salvar produto.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome do Produto */}
      <div className="space-y-1.5">
        <Label htmlFor="prod-name" className="text-xs font-semibold text-slate-700">
          Nome do produto
        </Label>
        <Input
          id="prod-name"
          name="name"
          placeholder="Ex.: Combo Big Burger Artesanal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-9 text-xs"
        />
      </div>

      {/* Descrição e Botão Gerar com IA */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="prod-description"
            className="text-xs font-semibold text-slate-700"
          >
            Descrição
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isGeneratingAi}
            onClick={handleGenerateAi}
            className="h-7 gap-1.5 rounded-lg border-purple-200 bg-purple-50/80 px-2.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 hover:text-purple-800 transition-colors shadow-xs"
          >
            {isGeneratingAi ? (
              <Loader2Icon size={12} className="animate-spin text-purple-600" />
            ) : (
              <SparklesIcon size={12} className="text-purple-600" />
            )}
            {isGeneratingAi ? "Gerando com IA..." : "Gerar com IA"}
          </Button>
        </div>
        <Textarea
          id="prod-description"
          name="description"
          placeholder="Descreva o produto, ingredientes principais e sabor para o cliente..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[80px] text-xs resize-y"
          required
        />
      </div>

      {/* Preço de Venda e Preço de Custo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="prod-price" className="text-xs font-semibold text-slate-700">
            Preço de venda
          </Label>
          <Input
            id="prod-price"
            name="price"
            value={price}
            onChange={(e) => setPrice(formatCurrencyInput(e.target.value))}
            placeholder="R$ 0,00"
            required
            className="h-9 text-xs font-medium"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prod-cost" className="text-xs font-semibold text-slate-700">
            Preço de custo
          </Label>
          <Input
            id="prod-cost"
            name="costPrice"
            value={costPrice}
            onChange={(e) => setCostPrice(formatCurrencyInput(e.target.value))}
            placeholder="R$ 0,00"
            required
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* Categoria e SKU */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="prod-category"
            className="text-xs font-semibold text-slate-700"
          >
            Categoria
          </Label>
          <Select value={categoryId} onValueChange={setCategoryId} required>
            <SelectTrigger id="prod-category" className="h-9 text-xs rounded-md">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prod-sku" className="text-xs font-semibold text-slate-700">
            SKU / Código interno
          </Label>
          <Input
            id="prod-sku"
            name="sku"
            placeholder="Ex.: LAN-001"
            defaultValue={defaultValues?.sku ?? ""}
            className="h-9 text-xs uppercase"
          />
        </div>
      </div>

      {/* Ingredientes */}
      <div className="space-y-1.5">
        <Label
          htmlFor="prod-ingredients"
          className="text-xs font-semibold text-slate-700"
        >
          Ingredientes
        </Label>
        <Input
          id="prod-ingredients"
          name="ingredients"
          placeholder="Separados por vírgula (ex.: Pão brioche, Blend 180g, Queijo cheddar, Bacon)"
          defaultValue={defaultValues?.ingredients.join(", ") ?? ""}
          className="h-9 text-xs"
        />
      </div>

      {!defaultValues && (
        <div className="flex gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-800">
          <InfoIcon size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <p>
            Para adicionar ingredientes extras, tamanhos ou opcionais com cobrança de
            valores, crie e salve o produto primeiro. Após salvar, você poderá gerenciar a{" "}
            <strong>Ficha Técnica</strong> e os <strong>Adicionais</strong>.
          </p>
        </div>
      )}

      {/* Imagem do Produto */}
      {defaultValues?.imageUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-slate-50 p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={defaultValues.imageUrl}
            alt={defaultValues.name}
            className="h-12 w-12 rounded-md border object-cover"
          />
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-slate-800">Imagem atual</span>
            <p className="text-[11px] text-slate-500">
              Para trocar, informe uma nova URL ou selecione um arquivo abaixo.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="prod-image-url"
            className="text-xs font-semibold text-slate-700"
          >
            URL da imagem
          </Label>
          <Input
            id="prod-image-url"
            name="imageUrl"
            placeholder="https://..."
            defaultValue={defaultValues?.imageUrl ?? ""}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="prod-image-file"
            className="text-xs font-semibold text-slate-700"
          >
            {defaultValues ? "Substituir por arquivo" : "Upload de arquivo"}
          </Label>
          <Input
            id="prod-image-file"
            name="imageFile"
            type="file"
            accept="image/*"
            className="h-9 text-xs file:text-xs file:py-0"
          />
        </div>
      </div>

      {/* Estoque Inicial e Alerta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="prod-stock" className="text-xs font-semibold text-slate-700">
            Estoque inicial
          </Label>
          <Input
            id="prod-stock"
            name="stockQuantity"
            type="number"
            min="0"
            defaultValue={defaultValues ? String(defaultValues.stockQuantity) : "0"}
            required
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="prod-threshold"
            className="text-xs font-semibold text-slate-700"
          >
            Alerta de estoque baixo
          </Label>
          <Input
            id="prod-threshold"
            name="lowStockThreshold"
            type="number"
            min="0"
            defaultValue={defaultValues ? String(defaultValues.lowStockThreshold) : "0"}
            required
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* Switches: Controle de Estoque e Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 p-3">
          <div className="space-y-0.5">
            <Label
              htmlFor="trackInventory"
              className="text-xs font-semibold text-slate-800 cursor-pointer"
            >
              Controlar estoque
            </Label>
            <p className="text-[11px] text-slate-500">
              Controlar baixas automáticas a cada venda
            </p>
          </div>
          <Switch
            id="trackInventory"
            checked={trackInventory}
            onCheckedChange={setTrackInventory}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 p-3">
          <div className="space-y-0.5">
            <Label
              htmlFor="isActive"
              className="text-xs font-semibold text-slate-800 cursor-pointer"
            >
              Produto ativo
            </Label>
            <p className="text-[11px] text-slate-500">
              Visível para clientes no cardápio
            </p>
          </div>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>
      </div>

      {/* Dados Fiscais: NCM, CFOP, CSOSN */}
      <div>
        <p className="mb-2 text-xs font-semibold text-slate-700">
          Dados Fiscais (NFC-e / SAT)
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="prod-ncm" className="text-xs font-semibold text-slate-700">
              NCM (8 dígitos)
            </Label>
            <Input
              id="prod-ncm"
              name="ncm"
              placeholder="Ex: 21069090"
              value={ncm}
              onChange={(e) => setNcm(e.target.value.replace(/\D/g, "").slice(0, 8))}
              maxLength={8}
              className="h-9 text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prod-cfop" className="text-xs font-semibold text-slate-700">
              CFOP (4 dígitos)
            </Label>
            <Input
              id="prod-cfop"
              name="cfop"
              placeholder="Ex: 5102"
              value={cfop}
              onChange={(e) => setCfop(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              className="h-9 text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prod-csosn" className="text-xs font-semibold text-slate-700">
              CSOSN (3 dígitos)
            </Label>
            <Input
              id="prod-csosn"
              name="csosn"
              placeholder="Ex: 102"
              value={csosn}
              onChange={(e) => setCsosn(e.target.value.replace(/\D/g, "").slice(0, 3))}
              maxLength={3}
              className="h-9 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Vídeo demonstrativo */}
      <div className="space-y-1.5">
        <Label htmlFor="prod-video" className="text-xs font-semibold text-slate-700">
          Vídeo demonstrativo (opcional)
        </Label>
        <Input
          id="prod-video"
          name="videoUrl"
          placeholder="https://youtube.com/watch?v=..."
          defaultValue={defaultValues?.videoUrl ?? ""}
          className="h-9 text-xs"
        />
      </div>

      {/* Horário de disponibilidade */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="prod-available-from"
            className="text-xs font-semibold text-slate-700"
          >
            Disponível a partir de
          </Label>
          <Input
            id="prod-available-from"
            name="availableFrom"
            type="time"
            defaultValue={defaultValues?.availableFrom ?? ""}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="prod-available-to"
            className="text-xs font-semibold text-slate-700"
          >
            Disponível até
          </Label>
          <Input
            id="prod-available-to"
            name="availableTo"
            type="time"
            defaultValue={defaultValues?.availableTo ?? ""}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* Selos alimentares */}
      <div>
        <p className="mb-2 text-xs font-semibold text-slate-700">Selos alimentares</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { field: "isVegan" as const, label: "Vegano" },
            { field: "isGlutenFree" as const, label: "Sem Glúten" },
            { field: "isLactoseFree" as const, label: "Sem Lactose" },
            { field: "isSpicy" as const, label: "Picante" },
          ].map(({ field, label }) => (
            <div
              key={field}
              className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5"
            >
              <Label
                htmlFor={`prod-${field}`}
                className="text-xs font-medium text-slate-700 cursor-pointer"
              >
                {label}
              </Label>
              <Switch
                id={`prod-${field}`}
                checked={foodBadges[field]}
                onCheckedChange={(checked) =>
                  setFoodBadges((prev) => ({ ...prev, [field]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tabela nutricional */}
      <div>
        <p className="mb-2 text-xs font-semibold text-slate-700">
          Tabela Nutricional (por porção estimada)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { name: "nutritionCalories", label: "Calorias (kcal)", key: "calories" },
            { name: "nutritionCarbs", label: "Carboidratos (g)", key: "carbs" },
            { name: "nutritionProtein", label: "Proteínas (g)", key: "protein" },
            { name: "nutritionFat", label: "Gorduras (g)", key: "fat" },
            { name: "nutritionFiber", label: "Fibras (g)", key: "fiber" },
            { name: "nutritionSodium", label: "Sódio (mg)", key: "sodium" },
          ].map(({ name: fieldName, label, key }) => (
            <div key={fieldName} className="space-y-1">
              <Label htmlFor={`prod-${fieldName}`} className="text-[11px] text-slate-600">
                {label}
              </Label>
              <Input
                id={`prod-${fieldName}`}
                name={fieldName}
                type="number"
                min="0"
                step="0.1"
                value={String(nutritionValues[key as keyof typeof nutritionValues])}
                onChange={(e) =>
                  setNutritionValues((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé padrão conforme dialog de garçom */}
      <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-100">
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
          {defaultValues ? "Salvar Alterações" : "Cadastrar Produto"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProductForm({
  slug,
  categories,
  defaultValues,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  if (!defaultValues) {
    return (
      <ProductFields
        slug={slug}
        categories={categories}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
  }

  return (
    <Tabs defaultValue="details">
      <TabsList className="mb-4 h-auto w-full gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
        <TabsTrigger
          value="details"
          className="flex-1 rounded-xl py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
        >
          Detalhes
        </TabsTrigger>
        <TabsTrigger
          value="recipe"
          className="flex-1 rounded-xl py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
        >
          Ficha Técnica
        </TabsTrigger>
        <TabsTrigger
          value="options"
          className="flex-1 rounded-xl py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
        >
          Adicionais
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <ProductFields
          slug={slug}
          categories={categories}
          defaultValues={defaultValues}
          onSuccess={onSuccess}
          onCancel={onCancel}
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
