"use client";

import { BellRingIcon, ChevronLeftIcon, ScrollTextIcon } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Restaurant } from "@/lib/db";

import { chamarGarcomAction } from "../actions";

interface RestaurantHeaderProps {
  restaurant: Pick<Restaurant, "name" | "coverImageUrl">;
  onOrdersClick?: () => void;
  consumptionMethod?: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string;
  isKioskMode?: boolean;
}

const RestaurantHeader = ({
  restaurant,
  onOrdersClick,
  consumptionMethod,
  tableId,
  isKioskMode,
}: RestaurantHeaderProps) => {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [calledAt, setCalledAt] = useState<Date | null>(null);

  const handleBackClick = () => router.back();
  const handleOrdersClick = () => {
    if (onOrdersClick) {
      onOrdersClick();
      return;
    }
    router.push(`/${slug}/orders`);
  };

  const handleChamarGarcom = () => {
    if (!tableId) return;

    const now = new Date();
    if (calledAt && now.getTime() - calledAt.getTime() < 60_000) {
      toast.info("Garçom já foi chamado. Aguarde um momento.");
      return;
    }

    startTransition(async () => {
      const result = await chamarGarcomAction(slug, tableId);
      if (result.success) {
        setCalledAt(new Date());
        toast.success("Garçom chamado! Ele virá em breve.");
      } else {
        toast.error(result.error ?? "Não foi possível chamar o garçom.");
      }
    });
  };

  const showWaiterButton = consumptionMethod === "DINE_IN" && !!tableId;

  return (
    <div className={`relative w-full overflow-hidden ${isKioskMode ? "h-[200px]" : "h-[280px] sm:h-[320px] lg:h-[380px]"}`}>
      <div className="absolute inset-0 bg-slate-950/20" />
      <Image
        src={restaurant.coverImageUrl}
        alt={restaurant.name}
        fill
        priority
        className="object-cover"
      />

      {!isKioskMode && (
        <div className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-[1600px] items-start justify-between px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full border-none bg-secondary text-secondary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-secondary-hover"
            onClick={handleBackClick}
          >
            <ChevronLeftIcon />
          </Button>
          <div className="flex items-center gap-2">
            {showWaiterButton && (
              <Button
                variant="secondary"
                disabled={isPending}
                className="rounded-full border-none bg-orange-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-orange-600 gap-1.5 px-3"
                onClick={handleChamarGarcom}
              >
                <BellRingIcon size={16} />
                <span className="text-sm font-semibold">Chamar Garçom</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full border-none bg-secondary text-secondary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-secondary-hover"
              onClick={handleOrdersClick}
            >
              <ScrollTextIcon />
            </Button>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-10 z-10 mx-auto max-w-[1600px] px-5 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className={`font-medium uppercase tracking-[0.28em] text-white/80 ${isKioskMode ? "text-sm" : "text-base"}`}>
            Cardápio digital
          </p>
          <h1 className={`mt-3 font-semibold tracking-tight text-white drop-shadow-sm ${isKioskMode ? "text-3xl" : "text-4xl sm:text-5xl"}`}>
            {restaurant.name}
          </h1>
        </div>
      </div>
    </div>
  );
};

export default RestaurantHeader;
