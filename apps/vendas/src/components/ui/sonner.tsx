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
          title: "group-[.toast]:text-foreground data-[type=error]:group-[.toast]:text-destructive data-[type=success]:group-[.toast]:text-green-600",
          description: "group-[.toast]:text-muted-foreground data-[type=error]:group-[.toast]:text-destructive/80 data-[type=success]:group-[.toast]:text-green-600/80",
          error: "group-[.toast]:border-destructive/20",
          success: "group-[.toast]:border-green-200",
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
