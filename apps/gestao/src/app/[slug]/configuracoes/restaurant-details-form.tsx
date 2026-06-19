"use client";

import { StoreIcon } from "lucide-react";
import { useTransition } from "react";
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateRestaurantDetailsAction(slug, formData);
        toast.success("Dados do estabelecimento atualizados!");
      } catch {
        toast.error("Erro ao salvar os dados. Verifique os campos obrigatórios.");
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="avatarImageUrl">
                URL do Logo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="avatarImageUrl"
                name="avatarImageUrl"
                defaultValue={initialValues.avatarImageUrl}
                placeholder="https://..."
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coverImageUrl">
                URL da Capa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="coverImageUrl"
                name="coverImageUrl"
                defaultValue={initialValues.coverImageUrl}
                placeholder="https://..."
                disabled={isPending}
                required
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
