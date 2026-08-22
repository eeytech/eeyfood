import { notFound } from "next/navigation";
import {
  buscarRestauranteParaGestao,
  listarFiadosGestao,
  listarContasBancariasGestao,
} from "@/lib/admin-queries";
import { FiadosClient } from "./_components/fiados-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const FiadosPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const [restaurant, fiados, contas] = await Promise.all([
    buscarRestauranteParaGestao(slug),
    listarFiadosGestao(slug),
    listarContasBancariasGestao(slug),
  ]);

  if (!restaurant) return notFound();

  return (
    <main>
      <FiadosClient slug={slug} fiados={fiados} contas={contas} />
    </main>
  );
};

export default FiadosPage;
