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
}

const CartSheet = ({ restaurant }: CartSheetProps) => {
  const { isOpen, toggleCart } = useContext(CartContext);

  return (
    <Sheet open={isOpen} onOpenChange={toggleCart}>
      <SheetContent side="right" className="w-full sm:max-w-[450px] flex flex-col p-0 gap-0">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Resumo do pedido</SheetTitle>
          <SheetDescription className="sr-only">
            Confira os itens que voce adicionou a sua sacola antes de finalizar
            o pedido.
          </SheetDescription>
        </SheetHeader>
        <CartPanel variant="sheet" restaurant={restaurant} />
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
