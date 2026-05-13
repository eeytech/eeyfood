"use client";

import { ChevronLeftIcon, ScrollTextIcon } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { Restaurant } from "@/lib/db";

interface RestaurantHeaderProps {
  restaurant: Pick<Restaurant, "name" | "coverImageUrl">;
}

const RestaurantHeader = ({ restaurant }: RestaurantHeaderProps) => {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const handleBackClick = () => router.back();
  const handleOrdersClick = () => router.push(`/${slug}/orders`);

  return (
    <div className="relative h-[280px] w-full overflow-hidden sm:h-[320px] lg:h-[380px]">
      <div className="absolute inset-0 bg-slate-950/20" />
      <Image
        src={restaurant.coverImageUrl}
        alt={restaurant.name}
        fill
        priority
        className="object-cover"
      />

      <div className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-[1600px] items-start justify-between px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full border border-white/40 bg-white/85 backdrop-blur"
          onClick={handleBackClick}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full border border-white/40 bg-white/85 backdrop-blur"
          onClick={handleOrdersClick}
        >
          <ScrollTextIcon />
        </Button>
      </div>

      <div className="absolute inset-x-0 bottom-10 z-10 mx-auto max-w-[1600px] px-5 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-white/80">
            Cardápio digital
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-5xl">
            {restaurant.name}
          </h1>
        </div>
      </div>
    </div>
  );
};

export default RestaurantHeader;
