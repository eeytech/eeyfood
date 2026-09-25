"use client";

import {
  BarChart2Icon,
  BarChart3Icon,
  BikeIcon,
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
  MessageSquareIcon,
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
import { useEffect, useState } from "react";

import { CompanySwitcher } from "@/components/auth/CompanySwitcher";
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
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

const kitchenGroups = [
  {
    label: "Cozinha & KDS",
    items: [
      { href: "kds", label: "Painel KDS", icon: ConciergeBellIcon },
      { href: "senha", label: "Painel de Senhas", icon: MonitorSmartphoneIcon },
    ],
  },
];

const courierGroups = [
  {
    label: "Entregas & Expedição",
    items: [
      { href: "entregas", label: "Painel de Entregas", icon: BikeIcon },
      { href: "pedidos", label: "Pedidos", icon: ClipboardListIcon },
    ],
  },
];

const navigationGroups = [
  {
    label: "Operações",
    items: [
      { href: "pdv", label: "PDV", icon: MonitorSmartphoneIcon },
      { href: "comandas", label: "Comandas", icon: UsersRoundIcon },
      { href: "mesas", label: "Mesas", icon: LayoutGridIcon },
      { href: "pedidos", label: "Pedidos", icon: ClipboardListIcon },
      { href: "entregas", label: "Entregas", icon: BikeIcon },
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
    ],
  },
  {
    label: "Fidelização",
    items: [
      { href: "cupons", label: "Cupons", icon: TagIcon },
      { href: "cashback", label: "Cashback", icon: CircleDollarSignIcon },
      { href: "frete", label: "Frete", icon: TruckIcon },
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
      { href: "ai", label: "IA", icon: SparklesIcon },
      { href: "whatsapp", label: "WhatsApp", icon: MessageSquareIcon },
      { href: "configuracoes", label: "Configurações", icon: StoreIcon },
      { href: "configuracoes/usuarios", label: "Usuários", icon: Users2Icon },
      { href: "suporte", label: "Suporte", icon: HeadphonesIcon },
    ],
  },
];

const AdminSidebar = ({
  companies,
  currentCompanyId,
  userRole,
  userName,
}: AdminSidebarProps) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // No celular, inicia oculto para não ocupar a tela pequena
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  }, []);

  // Ao navegar em uma rota no celular, oculta a sidebar automaticamente
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  }, [pathname]);

  const activeGroups =
    userRole === "KITCHEN"
      ? kitchenGroups
      : userRole === "COURIER"
        ? courierGroups
        : navigationGroups;

  return (
    <>
      {/* Backdrop para fechar ao tocar fora no celular */}
      {!isCollapsed && (
        <div
          onClick={() => setIsCollapsed(true)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Botão flutuante para reexibir a sidebar no celular quando estiver totalmente ocultada */}
      {isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="fixed left-3 top-2.5 z-50 flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-slate-900/95 text-white shadow-md backdrop-blur transition-transform active:scale-95 hover:bg-slate-800 hover:text-white md:hidden"
          title="Exibir menu"
        >
          <ChevronRightIcon size={16} />
        </Button>
      )}

      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col bg-slate-950 text-white transition-all duration-300 ease-in-out",
          // Mobile: fixo em tela cheia na lateral, acima do conteúdo
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:shadow-2xl",
          // Desktop: posicionado no fluxo normal
          "md:relative md:z-auto",
          isCollapsed
            ? "max-md:-translate-x-full max-md:w-0 md:translate-x-0 md:w-16"
            : "max-md:translate-x-0 max-md:w-[240px] md:w-[220px]",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "absolute -right-3 top-10 z-50 h-6 w-6 rounded-full border border-white/20 bg-slate-900 text-white hover:bg-slate-800 hover:text-white shadow-md",
            isCollapsed && "max-md:hidden",
          )}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
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

      <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {activeGroups.map((group, groupIndex) => (
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
              const href = `/${item.href}`;
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

      <div className="shrink-0 border-t border-white/10 p-2">
        {/* User identification badge */}
        {userName && (
          <div
            className={cn(
              "mb-2 rounded-md bg-white/5 p-2 text-xs",
              isCollapsed && "px-1 text-center",
            )}
          >
            <p className="truncate font-medium text-white">{userName}</p>
            <span className="text-[10px] font-semibold text-amber-400">
              {userRole === "KITCHEN"
                ? "Cozinha / KDS"
                : userRole === "WAITER"
                  ? "Comandas / Garçom"
                  : userRole === "COURIER"
                    ? "Entregador"
                    : "Administrador"}
            </span>
          </div>
        )}

        <div className={cn("flex flex-col gap-1", isCollapsed && "items-center")}>
          {userRole !== "KITCHEN" && (
            <Link
              href="/suporte"
              title={isCollapsed ? "Central de Suporte" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
                pathname === "/suporte"
                  ? "bg-white font-medium text-slate-950"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                isCollapsed && "justify-center",
              )}
            >
              <HeadphonesIcon size={15} className="shrink-0" />
              {!isCollapsed && <span>Suporte</span>}
            </Link>
          )}

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
      </div>
    </aside>
  </>
);
};

export default AdminSidebar;
