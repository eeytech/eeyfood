"use client";

import {
  BarChart3Icon,
  BoxesIcon,
  ClipboardListIcon,
  LayoutGridIcon,
  StoreIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  slug: string;
  restaurantName: string;
}

const navigationItems = [
  {
    href: "pedidos",
    label: "Pedidos",
    description: "Kanban e operação em tempo real",
    icon: ClipboardListIcon,
  },
  {
    href: "cardapio",
    label: "Cardápio",
    description: "Categorias, produtos e imagens",
    icon: LayoutGridIcon,
  },
  {
    href: "estoque",
    label: "Estoque",
    description: "Níveis, alertas e ajustes rápidos",
    icon: BoxesIcon,
  },
  {
    href: "relatorios",
    label: "Relatórios",
    description: "Faturamento, lucro e vendas",
    icon: BarChart3Icon,
  },
];

const AdminSidebar = ({ slug, restaurantName }: AdminSidebarProps) => {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col gap-4 rounded-[32px] border border-white/60 bg-slate-950 p-4 text-white shadow-2xl shadow-slate-950/15">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <StoreIcon size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Gestão ERP/PDV
            </p>
            <h2 className="mt-1 font-display text-2xl">{restaurantName}</h2>
          </div>
        </div>
      </div>

      <nav className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
        {navigationItems.map((item) => {
          const href = `/${slug}/${item.href}`;
          const isActive = pathname === href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "rounded-[26px] border px-4 py-4 transition",
                isActive
                  ? "border-white/20 bg-white text-slate-950 shadow-xl"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                    isActive ? "bg-slate-950 text-white" : "bg-white/10 text-white",
                  )}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p
                    className={cn(
                      "mt-1 text-sm",
                      isActive ? "text-slate-600" : "text-slate-300",
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
