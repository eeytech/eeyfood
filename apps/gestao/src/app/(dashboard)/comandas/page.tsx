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

import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface ComandasPageProps {
  params?: Promise<{ slug?: string }>;
}

const ComandasPage = async ({ params }: ComandasPageProps) => {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    return notFound();
  }

  const slug = restaurant.slug;
  const session = await getSession();

  const [cardapio, mesas, , reservations, queue, avulsas] =
    await Promise.all([
      buscarCardapioGestao(slug),
      listarMesasComandasGestao(slug),
      listarGarconsGestao(slug),
      listarReservasGestao(slug),
      listarFilaEsperaGestao(slug),
      listarComandasAvulsasGestao(slug),
    ]);

  if (!cardapio) {
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
      initialReservations={reservations}
      initialQueue={queue}
      initialComandasAvulsas={avulsas}
      userName={session?.name}
      userRole={session?.role}
      isDedicatedMode={session?.role === "WAITER"}
    />
  );
};

export default ComandasPage;
