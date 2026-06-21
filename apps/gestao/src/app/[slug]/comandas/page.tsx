import { notFound } from "next/navigation";

import ComandaDigital from "@/components/comanda-digital";
import {
  buscarCardapioGestao,
  buscarRestauranteParaGestao,
  listarComandasAvulsasGestao,
  listarFilaEsperaGestao,
  listarGarconsGestao,
  listarMesasComandasGestao,
  listarReservasGestao,
} from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

interface ComandasPageProps {
  params: Promise<{ slug: string }>;
}

const ComandasPage = async ({ params }: ComandasPageProps) => {
  const { slug } = await params;
  const [restaurant, cardapio, mesas, waiters, reservations, queue, avulsas] =
    await Promise.all([
      buscarRestauranteParaGestao(slug),
      buscarCardapioGestao(slug),
      listarMesasComandasGestao(slug),
      listarGarconsGestao(slug),
      listarReservasGestao(slug),
      listarFilaEsperaGestao(slug),
      listarComandasAvulsasGestao(slug),
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
      initialWaiters={waiters}
      initialReservations={reservations}
      initialQueue={queue}
      initialComandasAvulsas={avulsas}
    />
  );
};

export default ComandasPage;
