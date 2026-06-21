"use client";

import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SEGMENTS = [
  { value: "", label: "Todos" },
  { value: "NEW", label: "Novos" },
  { value: "VIP", label: "VIP" },
  { value: "INACTIVE", label: "Inativos" },
  { value: "AT_RISK", label: "Em Risco" },
  { value: "RECOVERED", label: "Recuperados" },
];

interface CrmFiltersProps {
  currentSegment?: string;
  currentSearch?: string;
}

export function CrmFilters({ currentSegment, currentSearch }: CrmFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {SEGMENTS.map((seg) => (
        <Button
          key={seg.value}
          size="sm"
          variant={currentSegment === seg.value || (!currentSegment && !seg.value) ? "default" : "outline"}
          onClick={() => updateParam("segment", seg.value)}
        >
          {seg.label}
        </Button>
      ))}

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome ou telefone..."
            defaultValue={currentSearch}
            className="w-56 pl-8"
            onChange={(e) => {
              const val = e.target.value;
              setTimeout(() => updateParam("search", val), 400);
            }}
          />
        </div>
      </div>
    </div>
  );
}
