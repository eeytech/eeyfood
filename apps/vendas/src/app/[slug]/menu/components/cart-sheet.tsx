import { useContext } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { CartContext } from "../contexts/cart";
import CartPanel from "./cart-panel";

const CartSheet = () => {
  const { isOpen, toggleCart } = useContext(CartContext);

  return (
    <Sheet open={isOpen} onOpenChange={toggleCart}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Resumo do pedido</SheetTitle>
          <SheetDescription className="sr-only">
            Confira os itens que voce adicionou a sua sacola antes de finalizar
            o pedido.
          </SheetDescription>
        </SheetHeader>
        <CartPanel variant="sheet" />
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
