import { notFound } from "next/navigation";

import PdvFrenteCaixaClient from "@/components/pdv-frente-caixa-client";
import { buscarCardapioGestao } from "@/lib/admin-queries";
import { buscarTurnoAtivoPdv } from "./actions";

export const dynamic = "force-dynamic";

interface PdvPageProps {
  params: Promise<{ slug: string }>;
}

const PdvPage = async ({ params }: PdvPageProps) => {
  const { slug } = await params;

  const [cardapio, activeShift] = await Promise.all([
    buscarCardapioGestao(slug),
    buscarTurnoAtivoPdv(slug),
  ]);

  if (!cardapio) {
    return notFound();
  }

  const pizzaPricingRule =
    (cardapio.restaurant as unknown as { pizzaPricingRule?: "MAX" | "AVERAGE" })
      .pizzaPricingRule ?? "MAX";

  return (
    <PdvFrenteCaixaClient
      slug={slug}
      restaurantName={cardapio.restaurant.name}
      isCashbackEnabled={cardapio.restaurant.isCashbackEnabled}
      isCouponsEnabled={cardapio.restaurant.isCouponsEnabled}
      pizzaPricingRule={pizzaPricingRule}
      initialShift={activeShift}
      scaleProtocol={
        (cardapio.restaurant.scaleProtocol as "TOLEDO" | "FILIZOLA" | "ELGIN" | null) ??
        null
      }
      scaleBaudRate={cardapio.restaurant.scaleBaudRate ?? 9600}
      drawerPulseHex={cardapio.restaurant.drawerPulseHex ?? null}
      categories={cardapio.categories.map((c) => ({
        id: c.id,
        name: c.name,
        isPizzaCategory: Boolean(
          c.isPizzaCategory || c.name.toLowerCase().includes("pizza"),
        ),
      }))}
      products={cardapio.products.map((product) => {
        const cat = cardapio.categories.find((c) => c.id === product.categoryId);
        const isPizza = Boolean(
          cat?.isPizzaCategory ||
            product.categoryName?.toLowerCase().includes("pizza") ||
            product.name.toLowerCase().includes("pizza"),
        );

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl ?? undefined,
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          isPizzaCategory: isPizza,
          isActive: product.isActive,
          trackInventory: product.trackInventory,
          stockQuantity: product.stockQuantity,
          sku: product.sku ?? undefined,
        };
      })}
    />
  );
};

export default PdvPage;
