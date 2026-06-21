import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao, listarFornecedoresGestao, listarInventarioGestao, listarNotasCompraGestao } from "@/lib/admin-queries";

import { ComprasClient } from "./_components/compras-client";

interface ComprasPageProps {
  params: Promise<{ slug: string }>;
}

const ComprasPage = async ({ params }: ComprasPageProps) => {
  const { slug } = await params;

  const [restaurant, inventoryItems, fornecedores, notasCompra] = await Promise.all([
    buscarRestauranteParaGestao(slug),
    listarInventarioGestao(slug),
    listarFornecedoresGestao(slug),
    listarNotasCompraGestao(slug),
  ]);

  if (!restaurant) return notFound();

  return (
    <main className="space-y-4">
      <ComprasClient
        slug={slug}
        inventoryItems={inventoryItems}
        fornecedores={fornecedores}
        notasCompra={notasCompra}
      />
    </main>
  );
};

export default ComprasPage;
