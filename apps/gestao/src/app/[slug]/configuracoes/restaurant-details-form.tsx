"use client";

import { StoreIcon, UploadIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateRestaurantDetailsAction } from "@/app/[slug]/actions";
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
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StoreIcon size={16} />
          Dados do Estabelecimento
        </CardTitle>
        <CardDescription>
          Informações públicas e de identificação do seu restaurante.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nome do Estabelecimento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={initialValues.name}
                placeholder="Ex: Burger House"
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Celular</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={initialValues.phone ?? ""}
                placeholder="(11) 99999-9999"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                name="cnpj"
                defaultValue={initialValues.cnpj ?? ""}
                placeholder="00.000.000/0001-00"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Endereço Completo</Label>
              <Input
                id="address"
                name="address"
                defaultValue={initialValues.address ?? ""}
                placeholder="Rua Exemplo, 123 – Bairro, Cidade"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              Descrição / Slogan <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initialValues.description}
              placeholder="Uma breve descrição exibida para os seus clientes."
              rows={3}
              disabled={isPending}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Logo do Restaurante <span className="text-destructive">*</span>
              </Label>
              <div
                className="relative flex aspect-square w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-slate-400 hover:bg-slate-100"
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
              <p className="text-xs text-slate-500">Clique para trocar. Máx. 2 MB.</p>
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

            <div className="space-y-1.5">
              <Label>
                Capa do Restaurante <span className="text-destructive">*</span>
              </Label>
              <div
                className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-slate-400 hover:bg-slate-100"
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
              <p className="text-xs text-slate-500">Clique para trocar. Máx. 2 MB.</p>
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

          <Button
            type="submit"
            className="w-full rounded-full"
            disabled={isPending}
          >
            {isPending ? "Salvando..." : "Salvar Dados"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
