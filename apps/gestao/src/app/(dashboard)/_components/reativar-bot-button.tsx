"use client";

import { PlayIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { reativarBotAction } from "@/app/(dashboard)/ai-actions";
import { Button } from "@/components/ui/button";

interface ReativarBotButtonProps {
  slug: string;
  customerPhone?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const ReativarBotButton = ({
  slug,
  customerPhone,
  label,
  variant = "default",
  size = "default",
  className = "gap-2 bg-emerald-600 hover:bg-emerald-700 text-white",
}: ReativarBotButtonProps) => {
  const [isPending, startTransition] = useTransition();

  const handleReativar = () => {
    startTransition(async () => {
      await reativarBotAction(slug, customerPhone);
      toast.success(
        customerPhone
          ? `Robô reativado para ${customerPhone}!`
          : "Robô reativado com sucesso para todos os clientes!",
      );
    });
  };

  return (
    <Button
      onClick={handleReativar}
      disabled={isPending}
      variant={variant}
      size={size}
      className={className}
    >
      <PlayIcon size={14} />
      {isPending ? "Reativando..." : label || "Reativar Robô"}
    </Button>
  );
};

export default ReativarBotButton;
