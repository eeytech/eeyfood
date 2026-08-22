import { notFound } from "next/navigation";
import {
  buscarRestauranteParaGestao,
  listarContasBancariasGestao,
} from "@/lib/admin-queries";
import { ConciliacaoClient } from "./_components/conciliacao-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const ConciliacaoPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const [restaurant, contas] = await Promise.all([
    buscarRestauranteParaGestao(slug),
    listarContasBancariasGestao(slug),
  ]);

  if (!restaurant) return notFound();

  return (
    <main>
      <ConciliacaoClient slug={slug} contas={contas} />
    </main>
  );
};

export default ConciliacaoPage;
