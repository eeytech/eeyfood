"use client";

import * as React from "react";
import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      className,
      name,
      value: controlledValue,
      defaultValue,
      onValueChange,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
      defaultValue ?? "",
    );
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const handleValueChange = React.useCallback(
      (val: string) => {
        if (!isControlled) {
          setUncontrolledValue(val);
        }
        onValueChange?.(val);
      },
      [isControlled, onValueChange],
    );

    return (
      <RadioGroupContext.Provider
        value={{
          name,
          value,
          onValueChange: handleValueChange,
          disabled,
        }}
      >
        <div
          role="radiogroup"
          className={cn("grid gap-2", className)}
          ref={ref}
          {...props}
        />
      </RadioGroupContext.Provider>
    );
  },
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  (
    {
      className,
      value,
      id,
      name: explicitName,
      checked: explicitChecked,
      disabled: itemDisabled,
      onChange,
      ...props
    },
    ref,
  ) => {
    const context = React.useContext(RadioGroupContext);
    const name = explicitName ?? context.name;
    const isChecked =
      context.value !== undefined
        ? context.value === value
        : (explicitChecked ?? false);
    const isDisabled = itemDisabled ?? context.disabled;

    return (
      <div className="relative inline-flex items-center justify-center">
        <input
          type="radio"
          ref={ref}
          id={id}
          name={name}
          value={value}
          checked={isChecked}
          disabled={isDisabled}
          onChange={(e) => {
            onChange?.(e);
            context.onValueChange?.(value);
          }}
          className={cn(
            "peer aspect-square h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border border-slate-300 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:border-primary checked:bg-white checked:text-primary dark:border-slate-700",
            className,
          )}
          {...props}
        />
        <Circle className="pointer-events-none absolute h-2 w-2 fill-primary text-primary opacity-0 transition-opacity peer-checked:opacity-100" />
      </div>
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
