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
  TruckIcon,
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

const navigationGroups = [
  {
    label: "Operações",
    items: [
      { href: "pdv", label: "PDV", icon: MonitorSmartphoneIcon },
      { href: "comandas", label: "Comandas", icon: UsersRoundIcon },
      { href: "mesas", label: "Mesas", icon: LayoutGridIcon },
      { href: "pedidos", label: "Pedidos", icon: ClipboardListIcon },
    ],
  },
  {
    label: "Cardápio",
    items: [
      { href: "cardapio", label: "Cardápio", icon: LayoutGridIcon },
      { href: "estoque", label: "Estoque", icon: BoxesIcon },
    ],
  },
  {
    label: "Backoffice",
    items: [
      { href: "financeiro", label: "Financeiro", icon: BarChart3Icon },
      { href: "relatorios", label: "Relatórios", icon: BarChart3Icon },
      { href: "ai", label: "IA Bot", icon: SparklesIcon },
    ],
  },
  {
    label: "Configurar",
    items: [
      { href: "logistica", label: "Logística", icon: TruckIcon },
      { href: "configuracoes", label: "Configurações", icon: StoreIcon },
    ],
  },
];

const AdminSidebar = ({ slug, restaurantName }: AdminSidebarProps) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col bg-slate-950 text-white transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-[220px]",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 z-50 h-6 w-6 rounded-full border border-white/20 bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
      >
        {isCollapsed ? (
          <ChevronRightIcon size={12} />
        ) : (
          <ChevronLeftIcon size={12} />
        )}
      </Button>

      <div
        className={cn(
          "flex items-center gap-2.5 overflow-hidden border-b border-white/10 px-3 py-4",
          isCollapsed && "justify-center px-0",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <StoreIcon size={15} />
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">
              Gestão
            </p>
            <h2 className="truncate text-sm font-semibold leading-tight">
              {restaurantName}
            </h2>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2">
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.label} className={cn("flex flex-col gap-0.5", groupIndex > 0 && "mt-3")}>
            {!isCollapsed && (
              <p className="mb-0.5 px-2 text-[10px] font-medium uppercase tracking-widest text-slate-600">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const href = `/${slug}/${item.href}`;
              const isActive = pathname === href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={href}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
                    isActive
                      ? "bg-white font-medium text-slate-950"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                    isCollapsed && "justify-center",
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
