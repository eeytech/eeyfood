"use client";

import {
  BarChart3Icon,
  BikeIcon,
  BoxesIcon,
  CircleDollarSignIcon,
  ClipboardListIcon,
  CoinsIcon,
  ConciergeBellIcon,
  GiftIcon,
  HeadphonesIcon,
  HeartHandshakeIcon,
  LayoutGridIcon,
  LogOutIcon,
  MegaphoneIcon,
  MenuIcon,
  MessageSquareIcon,
  MonitorSmartphoneIcon,
  PanelLeftCloseIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SparklesIcon,
  StoreIcon,
  TagIcon,
  TargetIcon,
  TruckIcon,
  Users2Icon,
  UsersRoundIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import type { TokenCompany } from "@/lib/auth/types";

interface AdminSidebarProps {
  slug?: string;
  restaurantName: string;
  companies?: TokenCompany[];
  currentCompanyId?: string;
  userPermissions?: Record<string, string[]>;
  userRole?: string;
  userName?: string;
  userEmail?: string;
  children?: React.ReactNode;
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
      { href: "pedidos", label: "Pedidos", icon: ClipboardListIcon },
      { href: "pdv", label: "PDV", icon: MonitorSmartphoneIcon },
      { href: "comandas", label: "Comandas", icon: UsersRoundIcon },
      { href: "mesas", label: "Mesas", icon: LayoutGridIcon },
      { href: "kds", label: "Cozinha (KDS)", icon: ConciergeBellIcon },
      { href: "entregas", label: "Entregas", icon: BikeIcon },
    ],
  },
  {
    label: "Cardápio & Estoque",
    items: [
      { href: "cardapio", label: "Cardápio", icon: UtensilsCrossedIcon },
      { href: "estoque", label: "Estoque", icon: BoxesIcon },
      { href: "estoque/compras", label: "Compras", icon: ShoppingCartIcon },
    ],
  },
  {
    label: "Financeiro & Métricas",
    items: [
      { href: "financeiro", label: "Financeiro", icon: CircleDollarSignIcon },
      { href: "relatorios", label: "Relatórios", icon: BarChart3Icon },
    ],
  },
  {
    label: "Marketing & Clientes",
    items: [
      { href: "crm", label: "Clientes (CRM)", icon: HeartHandshakeIcon },
      { href: "campanhas", label: "Campanhas", icon: MegaphoneIcon },
      { href: "cupons", label: "Cupons", icon: TagIcon },
      { href: "cashback", label: "Cashback", icon: CoinsIcon },
      { href: "frete", label: "Frete Grátis", icon: GiftIcon },
    ],
  },
  {
    label: "Configurações",
    items: [
      { href: "configuracoes", label: "Geral", icon: StoreIcon },
      { href: "logistica", label: "Logística & Motoboys", icon: TruckIcon },
      { href: "configuracoes/usuarios", label: "Equipe & Acessos", icon: Users2Icon },
      { href: "marketplaces", label: "Marketplaces (iFood)", icon: ShoppingBagIcon },
      { href: "whatsapp", label: "WhatsApp", icon: MessageSquareIcon },
      { href: "ai", label: "IA", icon: SparklesIcon },
      { href: "marketing", label: "Pixels & Rastreamento", icon: TargetIcon },
    ],
  },
];

const AdminSidebar = ({
  companies,
  currentCompanyId,
  userRole,
  userName,
  restaurantName,
  children,
}: AdminSidebarProps) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Inicializa preferência e no celular inicia recolhido
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      } else {
        const saved = localStorage.getItem("admin_sidebar_collapsed");
        if (saved !== null) {
          setIsCollapsed(saved === "true");
        }
      }
    }
  }, []);

  // Ao navegar em uma rota no celular, fecha a sidebar automaticamente
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  }, [pathname]);

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      localStorage.setItem("admin_sidebar_collapsed", String(collapsed));
    }
  };

  const activeGroups =
    userRole === "KITCHEN"
      ? kitchenGroups
      : userRole === "COURIER"
        ? courierGroups
        : navigationGroups;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Backdrop para fechar ao tocar fora no celular quando aberto */}
      {!isCollapsed && (
        <div
          onClick={() => setCollapsed(true)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Barra lateral */}
      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col bg-slate-950 text-white transition-all duration-300 ease-in-out overflow-hidden",
          // Mobile: Drawer fixo acima do conteúdo com largura fixa de 260px
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-[260px] max-md:shadow-2xl",
          // Desktop: posicionado no fluxo normal
          "md:relative md:z-30",
          isCollapsed
            ? "max-md:-translate-x-full max-md:invisible max-md:pointer-events-none md:w-0 md:opacity-0 md:invisible md:pointer-events-none"
            : "max-md:translate-x-0 max-md:visible md:w-[240px] md:opacity-100 md:visible",
        )}
      >
        {/* Cabeçalho da Sidebar: Logo do Sistema + Nome do Restaurante + Botão Recolher */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-3">
          <Link
            href="/pedidos"
            className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-white/5"
            title={restaurantName || "Painel de Gestão"}
          >
            {/* Ícone com Logo */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/25 p-1 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <Image
                src="/logo-icon.png"
                alt="Logo"
                width={28}
                height={28}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            {/* Nome do Restaurante */}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold tracking-tight text-white transition-colors group-hover:text-blue-200">
                {restaurantName || "Restaurante"}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="truncate">Painel de Gestão</span>
              </span>
            </div>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            title="Recolher menu lateral"
          >
            <PanelLeftCloseIcon size={18} />
          </Button>
        </div>

        {/* Links de navegação agrupados */}
        <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {activeGroups.map((group, groupIndex) => (
            <div
              key={group.label}
              className={cn("flex flex-col gap-0.5", groupIndex > 0 && "mt-3")}
            >
              <p className="mb-0.5 px-2 text-[10px] font-medium uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
              {group.items.map((item) => {
                const href = `/${item.href}`;
                const isActive =
                  pathname === href ||
                  (item.href !== "configuracoes" &&
                    item.href !== "estoque" &&
                    pathname.startsWith(`${href}/`));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
                      isActive
                        ? "bg-white font-medium text-slate-950"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                    )}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="shrink-0 border-t border-white/10 p-2">
          {userName && (
            <div className="mb-2 rounded-md bg-white/5 p-2 text-xs">
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

          <div className="flex flex-col gap-1">
            {userRole !== "KITCHEN" && (
              <Link
                href="/suporte"
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
                  pathname === "/suporte" || pathname.startsWith("/suporte/")
                    ? "bg-white font-medium text-slate-950"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                )}
              >
                <HeadphonesIcon size={15} className="shrink-0" />
                <span>Suporte</span>
              </Link>
            )}

            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-red-400"
              >
                <LogOutIcon size={15} className="shrink-0" />
                <span>Sair</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Área Direita: Linha Fixa Superior + Conteúdo da Tela */}
      <div className="flex flex-1 flex-col h-screen min-w-0 overflow-hidden">
        {/* Linha fixa no topo para o botão quando a sidebar estiver recolhida */}
        {isCollapsed && (
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4 shadow-xs z-20">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCollapsed(false)}
                className="flex h-8 items-center gap-2 rounded-lg border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-100 hover:text-slate-950 active:scale-95 transition-all"
                title="Abrir menu lateral"
              >
                <MenuIcon size={15} className="text-slate-700" />
                <span>Abrir Menu</span>
              </Button>

              <div className="h-4 w-px bg-slate-200" />

              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20 p-0.5">
                  <Image
                    src="/logo-icon.png"
                    alt="Logo"
                    width={18}
                    height={18}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="truncate text-xs font-semibold text-slate-800">
                  {restaurantName || "Gestão"}
                </span>
              </div>
            </div>

            {userName && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="hidden sm:inline-block font-medium text-slate-700 truncate max-w-[150px]">
                  {userName}
                </span>
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/60">
                  {userRole === "KITCHEN"
                    ? "Cozinha"
                    : userRole === "WAITER"
                      ? "Garçom"
                      : userRole === "COURIER"
                        ? "Entregador"
                        : "Admin"}
                </span>
              </div>
            )}
          </header>
        )}

        {/* Conteúdo Principal logo abaixo da linha */}
        {children && (
          <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-5">
            {children}
          </main>
        )}
      </div>
    </div>
  );
};

export default AdminSidebar;
