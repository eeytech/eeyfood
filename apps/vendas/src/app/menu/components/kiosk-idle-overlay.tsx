"use client";

import { HandIcon } from "lucide-react";
import Image from "next/image";

interface KioskIdleOverlayProps {
  restaurantName: string;
  coverImageUrl: string;
  onTouch: () => void;
}

const KioskIdleOverlay = ({
  restaurantName,
  coverImageUrl,
  onTouch,
}: KioskIdleOverlayProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center select-none"
      onClick={onTouch}
      onTouchStart={onTouch}
    >
      <div className="absolute inset-0">
        <Image
          src={coverImageUrl}
          alt={restaurantName}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-medium uppercase tracking-[0.3em] text-white/60">
            Cardápio digital
          </p>
          <h1 className="text-6xl font-bold tracking-tight text-white drop-shadow-lg">
            {restaurantName}
          </h1>
        </div>

        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="animate-bounce rounded-full bg-orange-500 p-5 shadow-2xl">
            <HandIcon size={48} className="text-white" />
          </div>
          <p className="text-3xl font-semibold text-white">
            Toque para iniciar
          </p>
          <p className="text-base text-white/50">
            Sessão encerrada por inatividade
          </p>
        </div>
      </div>
    </div>
  );
};

export default KioskIdleOverlay;
