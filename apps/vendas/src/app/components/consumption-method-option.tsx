"use client";

import { BikeIcon, ShoppingBagIcon, UtensilsCrossedIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ConsumptionMethod } from "@/lib/db";
import { cn } from "@/lib/utils";

interface ConsumptionMethodOptionProps {
  imageUrl: string;
  imageAlt: string;
  buttonText: string;
  option: ConsumptionMethod;
  slug?: string;
}

const renderFallbackIcon = (option: ConsumptionMethod) => {
  switch (option) {
    case "DELIVERY":
      return <BikeIcon size={38} className="text-primary" />;
    case "TAKEAWAY":
      return <ShoppingBagIcon size={38} className="text-primary" />;
    case "DINE_IN":
      return <UtensilsCrossedIcon size={38} className="text-primary" />;
    default:
      return <BikeIcon size={38} className="text-primary" />;
  }
};

const ConsumptionMethodOption = ({
  imageAlt,
  imageUrl,
  buttonText,
  option,
  slug,
}: ConsumptionMethodOptionProps) => {
  const [imageError, setImageError] = useState(false);
  const href = `/menu?consumptionMethod=${option}${slug ? `&slug=${encodeURIComponent(slug)}` : ""}`;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="flex h-full flex-col overflow-hidden border border-border/60 transition-all duration-200 group-hover:border-secondary/60 group-hover:shadow-md group-active:scale-[0.98]">
        <CardContent className="flex flex-1 flex-col items-center justify-between gap-3 p-2.5 py-4 sm:gap-6 sm:p-5 sm:py-6">
          <div className="relative flex h-14 w-14 items-center justify-center transition-transform duration-200 group-hover:scale-105 sm:h-20 sm:w-20">
            {!imageError ? (
              <Image
                src={imageUrl}
                fill
                unoptimized
                alt={imageAlt}
                className="object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-primary/10">
                {renderFallbackIcon(option)}
              </div>
            )}
          </div>
          <div
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "h-auto min-h-[38px] w-full max-w-full rounded-full px-1 py-1.5 text-center text-[11px] font-semibold leading-tight whitespace-normal break-words transition-colors group-hover:bg-secondary/90 min-[380px]:text-xs sm:min-h-[42px] sm:px-3 sm:py-2 sm:text-sm flex items-center justify-center shadow-sm"
            )}
          >
            {buttonText}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ConsumptionMethodOption;
