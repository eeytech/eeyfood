"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoxesIcon, ReceiptIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "", label: "Controle de Estoque e Insumos", icon: BoxesIcon },
  { href: "/compras", label: "Compras e Entrada NF-e", icon: ReceiptIcon },
];

export function EstoqueNav() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto pb-1">
      <nav className="inline-flex h-auto items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const fullPath = `/estoque${item.href}`;
          const isActive =
            item.href === ""
              ? pathname === "/estoque"
              : pathname.startsWith(fullPath);

          return (
            <Link
              key={item.href}
              href={fullPath}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all",
                isActive
                  ? "bg-white text-primary shadow-xs ring-1 ring-primary/20 font-bold"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
              )}
            >
              <Icon
                size={15}
                className={cn(isActive ? "text-primary" : "text-slate-500")}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

