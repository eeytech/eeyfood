import { useContext } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { CartContext } from "../contexts/cart";
import CartPanel from "./cart-panel";

const CartSheet = () => {
  const { isOpen, toggleCart } = useContext(CartContext);

  return (
    <Sheet open={isOpen} onOpenChange={toggleCart}>
      <SheetContent className="w-full max-w-md sm:w-[440px]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Resumo do pedido</SheetTitle>
        </SheetHeader>
        <CartPanel variant="sheet" />
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
