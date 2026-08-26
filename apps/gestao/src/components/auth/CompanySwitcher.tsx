"use client";

import { BuildingIcon, CheckIcon, ChevronsUpDownIcon, LoaderCircleIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TokenCompany } from "@/lib/auth/types";

interface CompanySwitcherProps {
  companies: TokenCompany[];
  currentCompanyId: string;
  isCollapsed?: boolean;
}

export function CompanySwitcher({
  companies,
  currentCompanyId,
  isCollapsed = false,
}: CompanySwitcherProps) {
  const [isSwitching, setIsSwitching] = useState(false);

  const currentCompany = companies.find((c) => c.id === currentCompanyId);

  const handleSwitch = async (company: TokenCompany) => {
    if (company.id === currentCompanyId || isSwitching) return;

    setIsSwitching(true);
    try {
      const response = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível trocar de unidade.");
      }

      await response.json();
      window.location.href = "/pedidos";
    } catch {
      setIsSwitching(false);
    }
  };

  if (companies.length <= 1) {
    return (
      <div
        className={`flex items-center gap-2.5 overflow-hidden border-b border-white/10 px-3 py-4 ${
          isCollapsed ? "justify-center px-0" : ""
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BuildingIcon size={15} />
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">
              Gestão
            </p>
            <h2 className="truncate text-sm font-semibold leading-tight text-white">
              {currentCompany?.name ?? "—"}
            </h2>
          </div>
        )}
        {isSwitching && <LoaderCircleIcon size={14} className="shrink-0 animate-spin text-slate-400" />}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`h-auto w-full justify-start gap-2.5 overflow-hidden rounded-none border-b border-white/10 px-3 py-4 hover:bg-white/5 ${
            isCollapsed ? "justify-center px-0" : ""
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {isSwitching ? (
              <LoaderCircleIcon size={15} className="animate-spin" />
            ) : (
              <BuildingIcon size={15} />
            )}
          </div>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">
                  Gestão
                </p>
                <h2 className="truncate text-sm font-semibold leading-tight text-white">
                  {currentCompany?.name ?? "—"}
                </h2>
              </div>
              <ChevronsUpDownIcon size={14} className="shrink-0 text-slate-500" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Trocar unidade
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onSelect={() => handleSwitch(company)}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate">{company.name}</span>
            {company.id === currentCompanyId && (
              <CheckIcon size={13} className="shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
