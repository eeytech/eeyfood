"use client";

import { ScrollTextIcon } from "lucide-react";
import { useState } from "react";

import { buscarPedidosPorTelefoneAction } from "@/app/[slug]/orders/actions";
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
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
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <OrderList
            orders={orders}
            isSidePanel
            onBackClick={() => setPhone(null)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OrdersSheet;
