"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
} from "../../menu/helpers/phone";

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

const PhoneForm = () => {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
  });
  const router = useRouter();
  const pathname = usePathname();

  const onSubmit = (data: FormSchema) => {
    router.replace(`${pathname}?phone=${normalizePhoneNumber(data.phone)}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Sheet open onOpenChange={(open) => !open && handleCancel()}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Visualizar Pedidos</SheetTitle>
          <SheetDescription>
            Insira seu celular abaixo para visualizar seus pedidos.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-8">
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
              <Button type="submit" variant="destructive" className="w-full rounded-full">
                Confirmar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};

export default PhoneForm;
