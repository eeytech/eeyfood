"use client";

import { PlayIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { reativarBotAction } from "@/app/[slug]/ai-actions";
import { Button } from "@/components/ui/button";

interface ReativarBotButtonProps {
  slug: string;
}

const ReativarBotButton = ({ slug }: ReativarBotButtonProps) => {
  const [isPending, startTransition] = useTransition();

  const handleReativar = () => {
    startTransition(async () => {
      await reativarBotAction(slug);
      toast.success("Robô reativado com sucesso!");
    });
  };

  return (
    <Button
      onClick={handleReativar}
      disabled={isPending}
      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
    >
      <PlayIcon size={16} />
      {isPending ? "Reativando..." : "Reativar Robô"}
    </Button>
  );
};

export default ReativarBotButton;
