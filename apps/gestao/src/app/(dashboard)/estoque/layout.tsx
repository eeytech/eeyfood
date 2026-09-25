import { notFound } from "next/navigation";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { EstoqueNav } from "./_components/estoque-nav";

interface EstoqueLayoutProps {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

const EstoqueLayout = async ({ params, children }: EstoqueLayoutProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) return notFound();

  return (
    <div className="space-y-6">
      <EstoqueNav />
      {children}
    </div>
  );
};

export default EstoqueLayout;
