"use client";

import { Loader2Icon } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends ButtonProps {
  pendingText?: string;
}

const SubmitButton = ({
  children,
  pendingText = "Salvando...",
  ...props
}: SubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={pending || props.disabled}>
      {pending ? <Loader2Icon className="animate-spin" size={16} /> : null}
      {pending ? pendingText : children}
    </Button>
  );
};

export { SubmitButton };
