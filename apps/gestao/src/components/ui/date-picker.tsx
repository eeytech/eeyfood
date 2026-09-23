"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: Date | string | null;
  defaultValue?: Date | string | null;
  onChange?: (date: Date | undefined, formattedString: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  withTime?: boolean;
  required?: boolean;
  clearable?: boolean;
}

const parseDateValue = (val: Date | string | null | undefined): Date | undefined => {
  if (!val) return undefined;
  if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    // Tenta parseISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm)
    const d = parseISO(trimmed);
    if (!isNaN(d.getTime())) return d;
    const directDate = new Date(trimmed);
    return isNaN(directDate.getTime()) ? undefined : directDate;
  }
  return undefined;
};

const formatDateOutput = (d: Date | undefined, withTime: boolean): string => {
  if (!d) return "";
  try {
    return withTime ? format(d, "yyyy-MM-dd'T'HH:mm") : format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
};

export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  className,
  buttonClassName,
  withTime = false,
  required = false,
  clearable = true,
}: DatePickerProps) {
  const isControlled = value !== undefined;
  const initialDate = parseDateValue(isControlled ? value : defaultValue);

  const [internalDate, setInternalDate] = React.useState<Date | undefined>(initialDate);
  const [time, setTime] = React.useState<string>(
    initialDate ? format(initialDate, "HH:mm") : "12:00",
  );
  const [open, setOpen] = React.useState(false);

  // Sincroniza quando controlado
  React.useEffect(() => {
    if (isControlled) {
      const parsed = parseDateValue(value);
      setInternalDate(parsed);
      if (parsed) {
        setTime(format(parsed, "HH:mm"));
      }
    }
  }, [value, isControlled]);

  const activeDate = isControlled ? parseDateValue(value) : internalDate;

  const handleSelectDay = (selectedDay: Date | undefined) => {
    if (!selectedDay) {
      if (!isControlled) setInternalDate(undefined);
      onChange?.(undefined, "");
      return;
    }

    let finalDate = new Date(selectedDay);
    if (withTime && time) {
      const [hours, minutes] = time.split(":").map((v) => parseInt(v, 10) || 0);
      finalDate.setHours(hours, minutes, 0, 0);
    }

    if (!isControlled) {
      setInternalDate(finalDate);
    }
    onChange?.(finalDate, formatDateOutput(finalDate, withTime));

    if (!withTime) {
      setOpen(false);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (activeDate) {
      const finalDate = new Date(activeDate);
      const [hours, minutes] = newTime.split(":").map((v) => parseInt(v, 10) || 0);
      finalDate.setHours(hours, minutes, 0, 0);

      if (!isControlled) {
        setInternalDate(finalDate);
      }
      onChange?.(finalDate, formatDateOutput(finalDate, withTime));
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isControlled) setInternalDate(undefined);
    onChange?.(undefined, "");
  };

  const formattedOutput = formatDateOutput(activeDate, withTime);

  return (
    <div className={cn("relative inline-block w-full", className)}>
      {name && (
        <input
          type="hidden"
          name={name}
          value={formattedOutput}
          required={required}
        />
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-start rounded-xl border-slate-200 bg-white px-3 text-left text-sm font-normal text-slate-900 shadow-none hover:bg-slate-50 focus:border-slate-400",
              !activeDate && "text-slate-400",
              buttonClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">
              {activeDate ? (
                withTime ? (
                  format(activeDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                ) : (
                  format(activeDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                )
              ) : (
                placeholder
              )}
            </span>
            {clearable && activeDate && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="ml-auto rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Limpar data"
              >
                <XIcon className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={activeDate}
            onSelect={handleSelectDay}
            defaultMonth={activeDate}
          />
          {withTime && (
            <div className="flex items-center justify-between border-t border-slate-100 p-3 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-600">Horário:</span>
              <input
                type="time"
                value={time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Exportação solicitada explicitamente no prompt
export function DatePickerSimple() {
  const [date, setDate] = React.useState<Date>();

  return (
    <Field className="mx-auto w-44">
      <FieldLabel htmlFor="date-picker-simple">Date</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id="date-picker-simple"
              className="justify-start font-normal"
            >
              {date ? format(date, "PPP", { locale: ptBR }) : <span>Pick a date</span>}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            defaultMonth={date}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
