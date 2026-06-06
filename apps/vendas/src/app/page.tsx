"use client";

import { ShoppingBagIcon, UtensilsIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HomePage = () => {
  const [restaurantName, setRestaurantName] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (restaurantName.trim()) {
      // Simple slugification: lowercase, replace spaces with hyphens, remove special chars
      const slug = restaurantName
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric except spaces/hyphens
        .replace(/\s+/g, "-") // replace spaces with -
        .replace(/-+/g, "-"); // remove double hyphens

      router.push(`/${slug}`);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full select-none overflow-hidden opacity-[0.03]">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-destructive blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-primary blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[24px] bg-destructive text-white shadow-lg shadow-destructive/20">
            <UtensilsIcon size={32} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            EeyFood
          </h1>
          <p className="font-medium text-slate-500">
            Sua refeicao favorita, a um clique de distancia.
          </p>
        </div>

        <Card className="overflow-hidden rounded-[32px] border-none bg-white/80 shadow-2xl shadow-slate-200/60 backdrop-blur-xl">
          <CardHeader className="pb-2 pt-8 text-center">
            <CardTitle className="text-xl font-bold">Acessar Cardapio</CardTitle>
            <CardDescription className="px-4 text-base">
              Digite o nome do restaurante para visualizar as opcoes e fazer seu
              pedido.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label
                  htmlFor="restaurantName"
                  className="ml-1 text-sm font-semibold text-slate-700"
                >
                  Nome do Restaurante
                </Label>
                <div className="relative">
                  <Input
                    id="restaurantName"
                    placeholder="Ex: FSW Donalds"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    required
                    className="h-14 rounded-full border-slate-200 bg-white/50 px-6 text-lg shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="h-14 w-full rounded-full text-lg font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Explorar Cardapio
                <ShoppingBagIcon className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()} EeyFood. Todos os direitos
          reservados.
        </p>
      </div>
    </main>
  );
};

export default HomePage;
