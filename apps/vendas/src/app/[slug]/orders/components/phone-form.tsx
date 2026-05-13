"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
    <Drawer open>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Visualizar Pedidos</DrawerTitle>
          <DrawerDescription>
            Insira seu celular abaixo para visualizar seus pedidos.
          </DrawerDescription>
        </DrawerHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="px-4">
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
            <DrawerFooter>
              <Button variant="destructive" className="w-full rounded-full">
                Confirmar
              </Button>
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
};

export default PhoneForm;
