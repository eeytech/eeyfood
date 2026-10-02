import { useContext } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RestaurantComCategoriasEProdutos } from "@/lib/db";

import { CartContext } from "../contexts/cart";
import CartPanel from "./cart-panel";

interface CartSheetProps {
  restaurant: RestaurantComCategoriasEProdutos;
  consumptionMethod?: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
}

const CartSheet = ({ restaurant, consumptionMethod }: CartSheetProps) => {
  const { isOpen, toggleCart } = useContext(CartContext);

  return (
    <Sheet open={isOpen} onOpenChange={toggleCart}>
      <SheetContent side="right" className="w-full sm:max-w-[450px] flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-6">
          <SheetTitle className="text-left text-xl font-bold">Resumo do pedido</SheetTitle>
          <SheetDescription className="sr-only">
            Confira os itens que voce adicionou ao seu pedido antes de finalizar.
          </SheetDescription>
        </SheetHeader>
        <CartPanel
          variant="sheet"
          restaurant={restaurant}
          consumptionMethod={consumptionMethod}
        />
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
