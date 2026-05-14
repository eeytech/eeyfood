import { notFound } from "next/navigation";

import PdvFrenteCaixa from "@/components/pdv-frente-caixa";
import { buscarCardapioGestao } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface PdvPageProps {
  params: Promise<{ slug: string }>;
}

const PdvPage = async ({ params }: PdvPageProps) => {
  const { slug } = await params;
  const cardapio = await buscarCardapioGestao(slug);

  if (!cardapio) {
    return notFound();
  }

  return (
    <PdvFrenteCaixa
      slug={slug}
      restaurantName={cardapio.restaurant.name}
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

export default PdvPage;
