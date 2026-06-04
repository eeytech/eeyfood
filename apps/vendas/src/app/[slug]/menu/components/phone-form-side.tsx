"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import {
  isValidPhoneNumber,
  normalizePhoneNumber,
} from "../helpers/phone";

const formSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, {
      message: "O celular é obrigatório.",
    })
    .refine((value) => isValidPhoneNumber(value), {
      message: "Celular inválido.",
    }),
});

type FormSchema = z.infer<typeof formSchema>;

interface PhoneFormSideProps {
  onSubmit: (phone: string) => void;
  onCancel: () => void;
}

const PhoneFormSide = ({ onSubmit, onCancel }: PhoneFormSideProps) => {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
  });

  const handleSubmit = (data: FormSchema) => {
    onSubmit(normalizePhoneNumber(data.phone));
  };

  return (
    <div className="py-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seu celular</FormLabel>
                <FormControl>
                  <PatternFormat
                    placeholder="Digite seu celular..."
                    format="(##) #####-####"
                    customInput={Input}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-3">
            <Button variant="destructive" className="w-full rounded-full" type="submit">
              Confirmar
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full"
              type="button"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PhoneFormSide;
