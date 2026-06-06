"use client";

import { ScrollTextIcon } from "lucide-react";
import { useState } from "react";

import { buscarPedidosPorTelefoneAction } from "@/app/[slug]/orders/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { OrderComItens } from "@/lib/db";

import OrderList from "../../orders/components/order-list";
import PhoneFormSide from "./phone-form-side";

interface OrdersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrdersSheet = ({ open, onOpenChange }: OrdersSheetProps) => {
  const [phone, setPhone] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderComItens[]>([]);

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
    if (!nextOpen) {
      setPhone(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 w-full sm:max-w-md md:max-w-lg lg:max-w-xl">
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
                <OrderList
                  orders={orders}
                  isSidePanel
                  onBackClick={() => setPhone(null)}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default OrdersSheet;
