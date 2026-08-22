"use client";

import { Loader2Icon, UtensilsIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DiningTable } from "@/lib/db";

import type { FormSchema } from "../finish-order-schema";
import { SectionHeader } from "./section-header";

interface TableSectionProps {
  form: UseFormReturn<FormSchema>;
  tables: DiningTable[];
  isLoading: boolean;
}

const TableSkeleton = () => (
  <div className="h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
);

export const TableSection = ({ form, tables, isLoading }: TableSectionProps) => (
  <section aria-label="Seleção de mesa">
    <SectionHeader icon={<UtensilsIcon size={16} />} title="Mesa" />

    {isLoading ? (
      <TableSkeleton />
    ) : (
      <FormField
        control={form.control}
        name="diningTableId"
        render={({ field }) => (
          <FormItem>
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <FormControl>
                <SelectTrigger className="rounded-xl h-10">
                  {isLoading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2Icon size={14} className="animate-spin" />
                      Carregando mesas...
                    </span>
                  ) : (
                    <SelectValue placeholder="Selecione a sua mesa" />
                  )}
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {tables.length === 0 ? (
                  <div className="py-3 text-center text-sm text-muted-foreground">
                    Nenhuma mesa disponível.
                  </div>
                ) : (
                  tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name}
                      {table.seats ? ` · ${String(table.seats)} lugares` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
    )}
  </section>
);
