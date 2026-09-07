"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseDateValue(value?: string | null) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export function DatePicker({
  id,
  name,
  defaultValue,
  disabled,
  placeholder = "Pick a date",
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: {
  id?: string;
  name: string;
  defaultValue?: string | null;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [date, setDate] = React.useState<Date | undefined>(() => parseDateValue(defaultValue));
  const [open, setOpen] = React.useState(false);
  const value = date ? format(date, "yyyy-MM-dd") : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className={cn("h-10 w-full justify-start px-3 font-normal", !date && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-4" />
          {date ? format(date, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={(next) => {
            setDate(next);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
