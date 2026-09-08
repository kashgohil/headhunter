"use client";

import * as React from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTH_LABELS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(2000, month, 1)),
);

function parseMonthValue(value?: string | null) {
  const match = value ? /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value) : null;
  if (!match) return undefined;
  return { year: Number(match[1]), month: Number(match[2]) - 1 };
}

export function MonthPicker({
  id,
  name,
  defaultValue,
  disabled,
  placeholder = "Pick a month",
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
  const initial = parseMonthValue(defaultValue);
  const [selected, setSelected] = React.useState(initial);
  const [viewYear, setViewYear] = React.useState(initial?.year ?? new Date().getFullYear());
  const [open, setOpen] = React.useState(false);
  const value = selected ? `${selected.year}-${String(selected.month + 1).padStart(2, "0")}` : "";
  const label = selected ? `${MONTH_LABELS[selected.month]} ${selected.year}` : placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setViewYear(selected?.year ?? new Date().getFullYear());
      }}
    >
      <input type="hidden" name={name} value={value} />
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className={cn("h-10 w-full justify-start px-3 font-normal", !selected && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="flex items-center justify-between pb-2">
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Previous year" onClick={() => setViewYear((year) => year - 1)}>
            <ChevronLeft />
          </Button>
          <span className="text-sm font-medium">{viewYear}</span>
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Next year" onClick={() => setViewYear((year) => year + 1)}>
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_LABELS.map((monthLabel, month) => {
            const active = selected?.year === viewYear && selected?.month === month;
            return (
              <Button
                key={monthLabel}
                type="button"
                variant={active ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => {
                  setSelected({ year: viewYear, month });
                  setOpen(false);
                }}
              >
                {monthLabel}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
