import { notFound } from "next/navigation";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
interface EstoqueLayoutProps {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

const EstoqueLayout = async ({ params, children }: EstoqueLayoutProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) return notFound();

  return <>{children}</>;
};

export default EstoqueLayout;
