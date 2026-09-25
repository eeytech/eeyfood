"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRightIcon,
  BookOpenIcon,
  Building2Icon,
  FileTextIcon,
  ReceiptIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "", label: "Lançamentos & Fluxo", icon: ReceiptIcon },
  { href: "/contas-bancarias", label: "Contas Bancárias", icon: Building2Icon },
  { href: "/configuracoes-fiscais", label: "Fiscal (NFC-e)", icon: FileTextIcon },
  { href: "/fiados", label: "Livro de Fiados", icon: BookOpenIcon },
  { href: "/conciliacao", label: "Conciliação OFX", icon: ArrowLeftRightIcon },
];

export function FinanceiroNav() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto pb-1">
      <nav className="inline-flex h-auto items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const fullPath = `/financeiro${item.href}`;
          const isActive =
            item.href === ""
              ? pathname === "/financeiro"
              : pathname.startsWith(fullPath);

          return (
            <Link
              key={item.href}
              href={fullPath}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
              )}
            >
              <Icon
                size={14}
                className={cn(isActive ? "text-slate-900" : "text-slate-500")}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
