"use client";

import type { RestaurantComCategoriasEProdutos } from "@fsw/db";
import { useState } from "react";

import RestaurantCategories from "./categories";
import RestaurantHeader from "./header";
import OrdersSheet from "./orders-sheet";

interface RestaurantMenuPageContentProps {
  restaurant: RestaurantComCategoriasEProdutos & {
    rating: number;
    ratingCount: number;
  };
}

const RestaurantMenuPageContent = ({
  restaurant,
}: RestaurantMenuPageContentProps) => {
  const [ordersSheetIsOpen, setOrdersSheetIsOpen] = useState(false);

  return (
    <div>
      <RestaurantHeader
        restaurant={restaurant}
        onOrdersClick={() => setOrdersSheetIsOpen(true)}
      />
      <RestaurantCategories restaurant={restaurant} />
      <OrdersSheet
        open={ordersSheetIsOpen}
        onOpenChange={setOrdersSheetIsOpen}
      />
    </div>
  );
};

export default RestaurantMenuPageContent;
