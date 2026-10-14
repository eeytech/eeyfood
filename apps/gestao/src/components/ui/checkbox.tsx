"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, defaultChecked, onChange, onCheckedChange, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center justify-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          className={cn(
            "peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-md border border-slate-300 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:border-primary checked:bg-primary checked:text-primary-foreground dark:border-slate-700",
            className,
          )}
          {...props}
        />
        <Check className="pointer-events-none absolute h-3 w-3 stroke-[3] text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100" />
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
