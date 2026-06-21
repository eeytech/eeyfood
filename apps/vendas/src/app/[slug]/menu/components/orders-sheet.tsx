"use client";

import { RefreshCwIcon, ScrollTextIcon } from "lucide-react";
import { useContext, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { buscarPedidosPorTelefoneAction } from "@/app/[slug]/orders/actions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { OrderComItens } from "@/lib/db";

import { fetchLastOrderAction } from "../actions";
import { CartContext } from "../contexts/cart";
import OrderList from "../../orders/components/order-list";
import PhoneFormSide from "./phone-form-side";

interface OrdersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrdersSheet = ({ open, onOpenChange }: OrdersSheetProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { addProduct, toggleCart } = useContext(CartContext);
  const [phone, setPhone] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderComItens[]>([]);
  const [isRepeatPending, startRepeatTransition] = useTransition();

  const handlePhoneSubmit = async (submittedPhone: string) => {
    try {
      const data = await buscarPedidosPorTelefoneAction(submittedPhone);
      setOrders(data);
      setPhone(submittedPhone);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setPhone(null);
    onOpenChange(nextOpen);
  };

  const handleRepeatLastOrder = () => {
    if (!phone) return;
    startRepeatTransition(async () => {
      const lastOrder = await fetchLastOrderAction(slug, phone);
      if (!lastOrder || lastOrder.orderProducts.length === 0) {
        toast.info("Nenhum pedido anterior encontrado para repetir.");
        return;
      }

      lastOrder.orderProducts.forEach((item) => {
        const options = item.orderProductOptions.map((opt) => ({
          id: opt.productOptionId,
          name: opt.nameSnapshot,
          price: opt.priceSnapshot,
        }));
        const cartItemId = `repeat-${item.productId}-${options.map((o) => o.id).sort().join("-")}`;
        addProduct({
          id: item.productId,
          name: item.productNameSnapshot,
          price: item.price,
          imageUrl: item.product.imageUrl,
          cartItemId,
          quantity: item.quantity,
          notes: item.notes ?? undefined,
          selectedOptions: options,
        });
      });

      toast.success(`${String(lastOrder.orderProducts.length)} itens adicionados ao carrinho!`);
      handleOpenChange(false);
      toggleCart();
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 w-full sm:max-w-[450px]">
        <div className="flex-auto overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2 text-xl">
                  <ScrollTextIcon size={18} />
                  Meus Pedidos
                </SheetTitle>
                <SheetDescription>
                  Acompanhe o status dos seus pedidos realizados.
                </SheetDescription>
              </SheetHeader>

              {!phone ? (
                <PhoneFormSide
                  onSubmit={handlePhoneSubmit}
                  onCancel={() => handleOpenChange(false)}
                />
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="mb-4 w-full gap-2 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    disabled={isRepeatPending}
                    onClick={handleRepeatLastOrder}
                  >
                    <RefreshCwIcon size={15} />
                    {isRepeatPending ? "Adicionando..." : "Repetir Último Pedido"}
                  </Button>
                  <OrderList
                    orders={orders}
                    isSidePanel
                    onBackClick={() => setPhone(null)}
                  />
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default OrdersSheet;
