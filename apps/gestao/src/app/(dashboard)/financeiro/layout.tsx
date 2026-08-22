import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";

interface FinanceiroLayoutProps {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "", label: "Lançamentos" },
  { href: "/contas-bancarias", label: "Contas Bancárias" },
  { href: "/configuracoes-fiscais", label: "Fiscal (NFC-e)" },
  { href: "/fiados", label: "Livro de Fiados" },
  { href: "/conciliacao", label: "Conciliação OFX" },
];

const FinanceiroLayout = async ({ params, children }: FinanceiroLayoutProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);

  if (!restaurant) return notFound();

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto border-b pb-0">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={`/${slug}/financeiro${item.href}`}
            className="shrink-0 rounded-t-md border border-b-0 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active]:border-border data-[active]:bg-background data-[active]:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
};

export default FinanceiroLayout;
