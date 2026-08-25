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

  return (
    <PdvFrenteCaixaClient
      slug={slug}
      restaurantName={cardapio.restaurant.name}
      isCashbackEnabled={cardapio.restaurant.isCashbackEnabled}
      isCouponsEnabled={cardapio.restaurant.isCouponsEnabled}
      initialShift={activeShift}
      scaleProtocol={(cardapio.restaurant.scaleProtocol as "TOLEDO" | "FILIZOLA" | "ELGIN" | null) ?? null}
      scaleBaudRate={cardapio.restaurant.scaleBaudRate ?? 9600}
      drawerPulseHex={cardapio.restaurant.drawerPulseHex ?? null}
      products={cardapio.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        categoryName: product.categoryName,
        isActive: product.isActive,
        trackInventory: product.trackInventory,
        stockQuantity: product.stockQuantity,
        sku: product.sku ?? undefined,
      }))}
    />
  );
};

export default PdvPage;
