import { notFound } from "next/navigation";

import GarcomMobile from "@/components/garcom-mobile";
import {
  buscarCardapioGestao,
  buscarRestauranteParaGestao,
  listarGarconsGestao,
  listarMesasComandasGestao,
} from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface GarcomPageProps {
  params: Promise<{ slug: string }>;
}

const GarcomPage = async ({ params }: GarcomPageProps) => {
  const { slug } = await params;

  const [restaurant, cardapio, mesas, waiters] = await Promise.all([
    buscarRestauranteParaGestao(slug),
    buscarCardapioGestao(slug),
    listarMesasComandasGestao(slug),
    listarGarconsGestao(slug),
  ]);

  if (!restaurant || !cardapio) {
    return notFound();
  }

  return (
    <GarcomMobile
      slug={slug}
      restaurantName={restaurant.name}
      initialTables={mesas}
      products={cardapio.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        categoryName: p.categoryName,
        isActive: p.isActive,
        trackInventory: p.trackInventory,
        stockQuantity: p.stockQuantity,
      }))}
      waiters={waiters}
    />
  );
};

export default GarcomPage;
