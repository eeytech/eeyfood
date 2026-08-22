"use client";

import type { RestaurantComCategoriasEProdutos } from "@fsw/db";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

import { CartContext } from "../contexts/cart";
import RestaurantCategories from "./categories";
import RestaurantHeader from "./header";
import KioskIdleOverlay from "./kiosk-idle-overlay";
import OrdersSheet from "./orders-sheet";

const KIOSK_IDLE_TIMEOUT = 2 * 60 * 1000;

interface RestaurantMenuPageContentProps {
  restaurant: RestaurantComCategoriasEProdutos & {
    rating: number;
    ratingCount: number;
  };
  consumptionMethod?: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string;
  isKioskMode?: boolean;
}

const RestaurantMenuPageContent = ({
  restaurant,
  consumptionMethod,
  tableId,
  isKioskMode,
}: RestaurantMenuPageContentProps) => {
  const [ordersSheetIsOpen, setOrdersSheetIsOpen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { clearCart } = useContext(CartContext);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clearCart();
      setOrdersSheetIsOpen(false);
      setIsIdle(true);
    }, KIOSK_IDLE_TIMEOUT);
  }, [clearCart]);

  useEffect(() => {
    if (!isKioskMode) return;
    const events: string[] = ["pointerdown", "pointermove", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isKioskMode, resetTimer]);

  const handleIdleTouch = () => {
    setIsIdle(false);
    resetTimer();
  };

  return (
    <div className={isKioskMode ? "kiosk-mode" : undefined}>
      {isKioskMode && isIdle && (
        <KioskIdleOverlay
          restaurantName={restaurant.name}
          coverImageUrl={restaurant.coverImageUrl}
          onTouch={handleIdleTouch}
        />
      )}
      <RestaurantHeader
        restaurant={restaurant}
        onOrdersClick={() => setOrdersSheetIsOpen(true)}
        consumptionMethod={consumptionMethod}
        tableId={tableId}
        isKioskMode={isKioskMode}
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
