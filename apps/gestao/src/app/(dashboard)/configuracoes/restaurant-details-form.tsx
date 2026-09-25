"use client";

import { StoreIcon, UploadIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateRestaurantDetailsAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RestaurantDetailsFormProps {
  slug: string;
  initialValues: {
    name: string;
    description: string;
    cnpj: string | null;
    phone: string | null;
    address: string | null;
    avatarImageUrl: string;
    coverImageUrl: string;
  };
}

export const RestaurantDetailsForm = ({
  slug,
  initialValues,
}: RestaurantDetailsFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string>(initialValues.avatarImageUrl);
  const [coverPreview, setCoverPreview] = useState<string>(initialValues.coverImageUrl);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateRestaurantDetailsAction(slug, formData);
        toast.success("Dados do estabelecimento atualizados!");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao salvar os dados.";
        toast.error(message);
      }
    });
  };

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <StoreIcon size={18} />
          </div>
          Dados do Estabelecimento
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Informações públicas e de identificação visíveis para clientes e comprovantes de venda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold uppercase text-slate-600">
                Nome do Estabelecimento <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={initialValues.name}
                placeholder="Ex: Burger House"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold uppercase text-slate-600">
                Telefone / WhatsApp
              </Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={initialValues.phone ?? ""}
                placeholder="(11) 99999-9999"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnpj" className="text-xs font-semibold uppercase text-slate-600">
                CNPJ
              </Label>
              <Input
                id="cnpj"
                name="cnpj"
                defaultValue={initialValues.cnpj ?? ""}
                placeholder="00.000.000/0001-00"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-semibold uppercase text-slate-600">
                Endereço Completo
              </Label>
              <Input
                id="address"
                name="address"
                defaultValue={initialValues.address ?? ""}
                placeholder="Rua Exemplo, 123 – Bairro, Cidade"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold uppercase text-slate-600">
              Descrição / Slogan <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initialValues.description}
              placeholder="Uma breve apresentação exibida para seus clientes no topo do cardápio."
              rows={3}
              className="rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400 resize-none"
              disabled={isPending}
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 pt-1">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-slate-600">
                Logo do Restaurante <span className="text-rose-500">*</span>
              </Label>
              <div
                className="relative flex aspect-square w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-slate-100"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Preview do logo"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <UploadIcon size={20} className="text-slate-400" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
                  <UploadIcon size={20} className="text-white" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Formatos JPG, PNG ou WEBP. Máx. 2 MB.</p>
              <input
                ref={avatarInputRef}
                id="avatarFile"
                name="avatarFile"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isPending}
                onChange={(e) => handleImageChange(e, setAvatarPreview)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-slate-600">
                Banner de Capa <span className="text-rose-500">*</span>
              </Label>
              <div
                className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-slate-100"
                onClick={() => coverInputRef.current?.click()}
              >
                {coverPreview ? (
                  <Image
                    src={coverPreview}
                    alt="Preview da capa"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <UploadIcon size={20} className="text-slate-400" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
                  <UploadIcon size={20} className="text-white" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Imagem panorâmica para topo do cardápio digital.</p>
              <input
                ref={coverInputRef}
                id="coverFile"
                name="coverFile"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isPending}
                onChange={(e) => handleImageChange(e, setCoverPreview)}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="h-10 w-full rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
              disabled={isPending}
            >
              {isPending ? "Salvando alterações..." : "Salvar Dados do Estabelecimento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
