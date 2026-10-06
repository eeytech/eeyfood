"use client";

import { RefreshCwIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface CrmReclassifyButtonProps {
  action: () => Promise<void>;
}

export function CrmReclassifyButton({ action }: CrmReclassifyButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleReclassify = () => {
    startTransition(async () => {
      try {
        await action();
        toast.success("Segmentos RFM de clientes reclassificados com sucesso!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao reclassificar clientes.");
      }
    });
  };

  return (
    <Button
      onClick={handleReclassify}
      disabled={isPending}
      className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-60 transition-all"
    >
      <RefreshCwIcon size={16} className={isPending ? "animate-spin" : ""} />
      <span>{isPending ? "Reclassificando..." : "Reclassificar Segmentos"}</span>
    </Button>
  );
}
