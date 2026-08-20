"use client";

import {
  BarChart2Icon,
  BarChart3Icon,
  BoxesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  ClipboardListIcon,
  ConciergeBellIcon,
  HeadphonesIcon,
  LayoutGridIcon,
  LogOutIcon,
  MegaphoneIcon,
  MonitorSmartphoneIcon,
  ShoppingCartIcon,
  SparklesIcon,
  StoreIcon,
  TagIcon,
  TruckIcon,
  Users2Icon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { CompanySwitcher } from "@/components/auth/CompanySwitcher";
import { SupportTicketForm } from "@/components/auth/SupportTicketForm";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import type { TokenCompany } from "@/lib/auth/types";

interface AdminSidebarProps {
  slug: string;
  restaurantName: string;
  companies: TokenCompany[];
  currentCompanyId: string;
  userPermissions: Record<string, string[]>;
}

const navigationGroups = [
  {
    label: "Operações",
    items: [
      { href: "pdv", label: "PDV", icon: MonitorSmartphoneIcon },
      { href: "comandas", label: "Comandas", icon: UsersRoundIcon },
      { href: "mesas", label: "Mesas", icon: LayoutGridIcon },
      { href: "pedidos", label: "Pedidos", icon: ClipboardListIcon },
      { href: "kds", label: "KDS", icon: ConciergeBellIcon },
    ],
  },
  {
    label: "Cardápio",
    items: [
      { href: "cardapio", label: "Cardápio", icon: LayoutGridIcon },
      { href: "estoque", label: "Estoque", icon: BoxesIcon },
      { href: "estoque/compras", label: "Compras", icon: ShoppingCartIcon },
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
    label: "Fidelização",
    items: [
      { href: "cupons", label: "Cupons", icon: TagIcon },
      { href: "cashback", label: "Cashback", icon: CircleDollarSignIcon },
    ],
  },
  {
    label: "CRM & Marketing",
    items: [
      { href: "crm", label: "Clientes (CRM)", icon: Users2Icon },
      { href: "campanhas", label: "Campanhas", icon: MegaphoneIcon },
      { href: "marketing", label: "Marketing", icon: BarChart2Icon },
    ],
  },
  {
    label: "Configurar",
    items: [
      { href: "logistica", label: "Logística", icon: TruckIcon },
      { href: "configuracoes", label: "Configurações", icon: StoreIcon },
      { href: "configuracoes/usuarios", label: "Usuários", icon: Users2Icon },
    ],
  },
];

const AdminSidebar = ({
  slug,
  companies,
  currentCompanyId,
}: AdminSidebarProps) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

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

      <CompanySwitcher
        companies={companies}
        currentCompanyId={currentCompanyId}
        isCollapsed={isCollapsed}
      />

      <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2">
        {navigationGroups.map((group, groupIndex) => (
          <div
            key={group.label}
            className={cn("flex flex-col gap-0.5", groupIndex > 0 && "mt-3")}
          >
            {!isCollapsed && (
              <p className="mb-0.5 px-2 text-[10px] font-medium uppercase tracking-widest text-slate-600">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const href = slug ? `/${slug}/${item.href}` : `/${item.href}`;
              const isActive = pathname === href || pathname === `/${item.href}`;
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

      <div className="shrink-0 border-t border-white/10 p-2">
        {showSupport && !isCollapsed ? (
          <div className="rounded-md border border-white/10 bg-slate-900 p-3">
            <SupportTicketForm onClose={() => setShowSupport(false)} />
          </div>
        ) : (
          <div className={cn("flex flex-col gap-1", isCollapsed && "items-center")}>
            <button
              onClick={() => setShowSupport(true)}
              title={isCollapsed ? "Suporte" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100",
                isCollapsed && "justify-center",
              )}
            >
              <HeadphonesIcon size={15} className="shrink-0" />
              {!isCollapsed && <span>Suporte</span>}
            </button>

            <form action={logoutAction}>
              <button
                type="submit"
                title={isCollapsed ? "Sair" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-red-400",
                  isCollapsed && "justify-center",
                )}
              >
                <LogOutIcon size={15} className="shrink-0" />
                {!isCollapsed && <span>Sair</span>}
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;
