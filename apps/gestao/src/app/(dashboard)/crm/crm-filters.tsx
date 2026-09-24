"use client";

import { FilterXIcon, SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const SEGMENTS = [
  { value: "", label: "Todos os segmentos" },
  { value: "NEW", label: "Novos" },
  { value: "VIP", label: "VIP" },
  { value: "RECOVERED", label: "Recuperados" },
  { value: "AT_RISK", label: "Em Risco" },
  { value: "INACTIVE", label: "Inativos" },
];

interface CrmFiltersProps {
  currentSegment?: string;
  currentSearch?: string;
  totalShowing: number;
  totalCount: number;
}

export function CrmFilters({
  currentSegment = "",
  currentSearch = "",
  totalShowing,
  totalCount,
}: CrmFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(currentSearch);

  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams],
  );

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (currentSearch || "")) {
        updateParam("search", searchValue);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue, currentSearch, updateParam]);

  const handleClearFilters = () => {
    setSearchValue("");
    startTransition(() => router.push(pathname));
  };

  const isFiltering = Boolean(currentSegment || searchValue);

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <SearchIcon
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              placeholder="Buscar cliente por nome ou telefone..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue("");
                  updateParam("search", "");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Limpar busca"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>

          {/* Select Segment & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-52">
              <Select
                value={currentSegment || "ALL"}
                onValueChange={(val) => updateParam("segment", val === "ALL" ? "" : val)}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                  <SelectValue placeholder="Segmento..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                  {SEGMENTS.map((seg) => (
                    <SelectItem
                      key={seg.value || "ALL"}
                      value={seg.value || "ALL"}
                      className="text-xs"
                    >
                      {seg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isFiltering && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <FilterXIcon size={14} />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Quick pill filters */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">
            Filtrar:
          </span>
          {SEGMENTS.map((seg) => {
            const isActive =
              (!currentSegment && !seg.value) || currentSegment === seg.value;
            return (
              <button
                key={seg.value || "ALL"}
                type="button"
                onClick={() => updateParam("segment", seg.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
                )}
              >
                {seg.label === "Todos os segmentos" ? "Todos" : seg.label}
              </button>
            );
          })}
        </div>

        {/* Results counter indicator */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>
            Exibindo{" "}
            <strong className="font-semibold text-slate-900">
              {totalShowing}
            </strong>{" "}
            de {totalCount} cliente{totalCount !== 1 ? "s" : ""}
          </span>
          {isFiltering && (
            <span className="text-[11px] font-medium text-amber-600">
              Filtros aplicados
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
