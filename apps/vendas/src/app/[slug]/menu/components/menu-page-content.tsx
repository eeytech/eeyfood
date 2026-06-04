"use client";

import { notFound } from "next/navigation";
import { useState } from "react";

import { isRestaurantOpen, getNextOpeningTime } from "@fsw/db";
import type {
  RestaurantComCategoriasEProdutos,
} from "@fsw/db";

import RestaurantCategories from "./components/categories";
import RestaurantHeader from "./components/header";
import OrdersSheet from "./components/orders-sheet";

interface RestaurantMenuPageContentProps {
  restaurant: RestaurantComCategoriasEProdutos;
}

const RestaurantMenuPageContent = ({ restaurant }: RestaurantMenuPageContentProps) => {
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
