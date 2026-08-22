"use client";

import { UserIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { PatternFormat } from "react-number-format";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import type { FormSchema } from "../finish-order-schema";
import { SectionHeader } from "./section-header";

interface IdentificationSectionProps {
  form: UseFormReturn<FormSchema>;
}

export const IdentificationSection = ({ form }: IdentificationSectionProps) => (
  <section>
    <SectionHeader icon={<UserIcon size={16} />} title="Identificação" />
    <div className="space-y-3">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="space-y-1">
            <FormLabel className="text-sm">Seu nome</FormLabel>
            <FormControl>
              <Input
                placeholder="Digite seu nome..."
                className="rounded-xl h-9 text-base"
                {...field}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem className="space-y-1">
            <FormLabel className="text-sm">Seu celular</FormLabel>
            <FormControl>
              <PatternFormat
                placeholder="Digite seu celular..."
                format="(##) #####-####"
                customInput={Input}
                className="rounded-xl h-9 text-base"
                {...field}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
    </div>
  </section>
);
