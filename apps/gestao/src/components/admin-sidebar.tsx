"use client";

import {
  BarChart3Icon,
  BoxesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  LayoutGridIcon,
  MonitorSmartphoneIcon,
  SparklesIcon,
  StoreIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  slug: string;
  restaurantName: string;
}

const navigationItems = [
  {
    href: "pdv",
    label: "PDV",
    description: "Venda rapida de balcao",
    icon: MonitorSmartphoneIcon,
  },
  {
    href: "comandas",
    label: "Comandas",
    description: "Mesas e lancamentos",
    icon: UsersRoundIcon,
  },
  {
    href: "pedidos",
    label: "Pedidos",
    description: "Kanban em tempo real",
    icon: ClipboardListIcon,
  },
  {
    href: "financeiro",
    label: "Financeiro",
    description: "Contas e DRE",
    icon: BarChart3Icon,
  },
  {
    href: "logistica",
    label: "Logística",
    description: "Motoboys e frota",
    icon: UsersRoundIcon,
  },
  {
    href: "ai",
    label: "IA Bot",
    description: "Whats e automação",
    icon: SparklesIcon,
  },
  {
    href: "cardapio",
    label: "Cardápio",
    description: "Produtos e categorias",
    icon: LayoutGridIcon,
  },
  {
    href: "estoque",
    label: "Estoque",
    description: "Níveis e alertas",
    icon: BoxesIcon,
  },
  {
    href: "relatorios",
    label: "Relatórios",
    description: "Lucro e faturamento",
    icon: BarChart3Icon,
  },
  {
    href: "configuracoes",
    label: "Configurações",
    description: "Horários e status",
    icon: StoreIcon,
  },
];

const AdminSidebar = ({ slug, restaurantName }: AdminSidebarProps) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col bg-slate-950 p-4 text-white transition-all duration-300 ease-in-out print:hidden",
        isCollapsed ? "w-[100px]" : "w-[280px]",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-10 z-50 h-8 w-8 rounded-full border border-white/20 bg-slate-950 text-white hover:bg-slate-900 hover:text-white"
      >
        {isCollapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
      </Button>

      <div className={cn(
        "mb-6 flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition-all",
        isCollapsed ? "justify-center px-2" : "px-4"
      )}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <StoreIcon size={18} />
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Gestão
            </p>
            <h2 className="truncate font-display text-lg">{restaurantName}</h2>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden pr-1">
        {navigationItems.map((item) => {
          const href = `/${slug}/${item.href}`;
          const isActive = pathname === href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl border transition-all duration-200",
                isActive
                  ? "border-white/20 bg-white text-slate-950 shadow-lg"
                  : "border-transparent bg-transparent text-slate-400 hover:bg-white/5 hover:text-white",
                isCollapsed ? "justify-center py-4" : "px-4 py-3"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isActive ? "bg-slate-950 text-white" : "bg-white/5",
                )}
              >
                <Icon size={18} />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p
                    className={cn(
                      "truncate text-xs",
                      isActive ? "text-slate-600" : "text-slate-500",
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
