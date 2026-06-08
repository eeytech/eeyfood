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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-slate-200 p-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full select-none overflow-hidden opacity-[0.05]">
        <div className="absolute left-[-5%] top-[-5%] h-[50%] w-[50%] rounded-full bg-destructive blur-[150px]" />
        <div className="absolute bottom-[-5%] right-[-5%] h-[50%] w-[50%] rounded-full bg-primary blur-[150px]" />
      </div>

      <div className="z-10 w-full max-w-md space-y-10">
        <div className="space-y-4 text-center">
          <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-[28px] bg-destructive text-white shadow-xl shadow-destructive/30 ring-8 ring-white/50">
            <UtensilsIcon size={38} />
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
              EeyFood
            </h1>
            <p className="text-lg font-medium text-slate-500/80">
              Sua refeição favorita, a um clique de distância.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[40px] border-none bg-white/70 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] backdrop-blur-2xl">
          <CardHeader className="pb-2 pt-10 text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">Acessar Cardápio</CardTitle>
            <CardDescription className="px-6 text-base text-slate-500">
              Digite o nome do restaurante para visualizar as opções e fazer seu
              pedido.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <Label
                  htmlFor="restaurantName"
                  className="ml-2 text-sm font-bold uppercase tracking-wider text-slate-500"
                >
                  Nome do Restaurante
                </Label>
                <div className="group relative">
                  <Input
                    id="restaurantName"
                    placeholder="Ex: FSW Donalds"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    required
                    className="h-16 rounded-[20px] border-slate-200/60 bg-white/50 px-6 text-lg shadow-sm transition-all duration-300 focus:border-primary/50 focus:bg-white focus:ring-[12px] focus:ring-primary/5"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary">
                    <UtensilsIcon size={20} />
                  </div>
                </div>
              </div>
              <Button
                type="submit"
                className="h-16 w-full rounded-[20px] bg-destructive text-lg font-bold shadow-lg shadow-destructive/20 transition-all duration-300 hover:scale-[1.02] hover:bg-destructive/95 active:scale-[0.98]"
              >
                Explorar Cardápio
                <ShoppingBagIcon className="ml-2 h-6 w-6" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm font-medium text-slate-400">
          &copy; {new Date().getFullYear()} EeyFood. Todos os direitos
          reservados.
        </p>
      </div>
    </main>
  );
};

export default HomePage;
