import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const HomePage = () => {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
      <Card className="w-full overflow-hidden border-white/80 bg-white/90">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            F
          </div>
          <CardTitle className="font-display text-4xl">
            Painel de recebimento em tempo real
          </CardTitle>
          <CardDescription className="max-w-2xl text-base">
            Acesse a operação do restaurante com uma fila viva de pedidos,
            destaque de pagamentos presenciais e confirmação manual de baixa.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Button asChild size="lg">
            <Link href="/fsw-donalds">Abrir painel principal</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/fsw-donalds">Entrar com outro slug pela URL</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default HomePage;
