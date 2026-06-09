"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, StarIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

import { createOrderRating } from "../actions/create-order-rating";

const formSchema = z.object({
  stars: z.number().min(1, "Selecione pelo menos 1 estrela").max(5),
  comment: z.string().optional(),
});

interface RatingDialogProps {
  orderId: number;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  slug: string;
}

export const RatingDialog = ({ orderId, restaurantId, restaurantName, customerName, slug }: RatingDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stars: 5,
      comment: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      await createOrderRating({
        orderId,
        restaurantId,
        customerName,
        slug,
        stars: values.stars,
        comment: values.comment,
      });
      toast.success("Obrigado pela sua avaliação!");
      setIsOpen(false);
    } catch {
      toast.error("Erro ao enviar avaliação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full rounded-2xl bg-amber-500 font-bold hover:bg-amber-600 transition-colors">
          Avaliar Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[32px] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">O que achou do seu pedido?</DialogTitle>
          <DialogDescription className="text-slate-500">
            Sua avaliação ajuda o <strong>{restaurantName}</strong> a melhorar e outros clientes a escolherem melhor.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="stars"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center gap-2">
                  <FormLabel className="text-sm font-bold uppercase text-slate-400">Nota</FormLabel>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="transition-transform active:scale-90"
                      >
                        <StarIcon
                          size={40}
                          className={`${
                            star <= field.value ? "fill-amber-400 text-amber-400" : "text-slate-200"
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Comentário (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conte para nós o que você mais gostou ou o que podemos melhorar..."
                      className="min-h-[100px] rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-amber-400"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl bg-amber-500 font-bold text-lg hover:bg-amber-600 shadow-lg shadow-amber-100"
              >
                {isSubmitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Avaliação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
