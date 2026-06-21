import { db, eq, marketingSettingsTable, restaurantsTable } from "@fsw/db";
import { BarChart2Icon } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { salvarMarketingSettingsAction } from "../marketing-actions";
import { MarketingSettingsForm } from "./marketing-settings-form";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MarketingPage({ params }: PageProps) {
  const { slug } = await params;

  const restaurant = await db.query.restaurantsTable.findFirst({
    where: eq(restaurantsTable.slug, slug),
  });

  if (!restaurant) notFound();

  const settings = await db.query.marketingSettingsTable.findFirst({
    where: eq(marketingSettingsTable.restaurantId, restaurant.id),
  });

  async function save(formData: FormData) {
    "use server";
    return salvarMarketingSettingsAction(slug, formData);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <BarChart2Icon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Marketing & Rastreamento</h1>
          <p className="text-sm text-muted-foreground">
            Configure pixels de rastreamento e automação de carrinho abandonado.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pixels de Rastreamento</CardTitle>
            <CardDescription>
              Os IDs configurados aqui serão injetados automaticamente no cardápio digital
              dos seus clientes para rastrear o comportamento de compra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarketingSettingsForm settings={settings ?? null} saveAction={save} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos rastreados automaticamente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-medium">ViewContent</span>
                <span className="text-muted-foreground">Visualização de produto</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-medium">AddToCart</span>
                <span className="text-muted-foreground">Item adicionado ao carrinho</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-medium">InitiateCheckout</span>
                <span className="text-muted-foreground">Abertura do checkout</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Purchase</span>
                <span className="text-muted-foreground">Pedido realizado com sucesso</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recuperação de Carrinho</CardTitle>
              <CardDescription>
                Mensagens automáticas via WhatsApp para clientes que abandonaram o carrinho.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                O sistema verifica carrinhos abandonados a cada hora. Configure o tempo de
                espera e o desconto do cupom nos campos abaixo.
              </p>
              <p>
                Para que o envio funcione, é necessário ter a{" "}
                <strong className="text-foreground">integração WhatsApp (IA Bot)</strong>{" "}
                configurada com uma instância ativa.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
