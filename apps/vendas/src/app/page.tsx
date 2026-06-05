"use client";

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
  const [slug, setSlug] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug.trim()) {
      router.push(`/${slug.trim().toLowerCase()}`);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md border-white/80 bg-white/90 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive text-xl font-bold text-destructive-foreground">
            E
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Bem-vindo ao EeyFood
          </CardTitle>
          <CardDescription>
            Digite o nome do restaurante para acessar o cardápio digital.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador do Restaurante</Label>
              <Input
                id="slug"
                placeholder="ex: fsw-donalds"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="rounded-full"
              />
            </div>
            <Button type="submit" className="w-full rounded-full" size="lg">
              Acessar Cardápio
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default HomePage;
