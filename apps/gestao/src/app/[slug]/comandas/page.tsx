import { notFound } from "next/navigation";

import ComandaDigital from "@/components/comanda-digital";
import {
  buscarCardapioGestao,
  buscarRestauranteParaGestao,
  listarMesasComandasGestao,
} from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface ComandasPageProps {
  params: Promise<{ slug: string }>;
}

const ComandasPage = async ({ params }: ComandasPageProps) => {
  const { slug } = await params;
  const [restaurant, cardapio, mesas] = await Promise.all([
    buscarRestauranteParaGestao(slug),
    buscarCardapioGestao(slug),
    listarMesasComandasGestao(slug),
  ]);

  if (!restaurant || !cardapio) {
    return notFound();
  }

  return (
    <ComandaDigital
      slug={slug}
      restaurantName={restaurant.name}
      initialTables={mesas}
      products={cardapio.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        categoryName: product.categoryName,
        isActive: product.isActive,
        trackInventory: product.trackInventory,
        stockQuantity: product.stockQuantity,
      }))}
    />
  );
};

export default ComandasPage;
