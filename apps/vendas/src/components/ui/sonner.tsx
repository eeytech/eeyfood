"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-border group-[.toaster]:bg-background group-[.toaster]:shadow-lg",
          title: "group-data-[type=error]:text-destructive group-data-[type=success]:text-green-600",
          description: "group-data-[type=error]:text-destructive/80 group-data-[type=success]:text-green-600/80",
          icon: "group-data-[type=error]:text-destructive group-data-[type=success]:text-green-600",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}

      {...props}
    />
  );
};

export { Toaster };
