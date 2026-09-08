"use client";
import { startTransition, useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FormState = { message?: string; success?: boolean };
export function ActionForm({
  action,
  children,
  label = "Save",
  preserveInput = false,
  className = "space-y-4",
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  children: React.ReactNode;
  label?: string;
  preserveInput?: boolean;
  className?: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form
      action={submit}
      onSubmit={(event) => {
        if (!preserveInput) return;
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => submit(data));
      }}
      className={className}
    >
      <fieldset disabled={pending} className="space-y-4">
        {children}
        <Button disabled={pending}>{pending ? "Saving…" : label}</Button>
      </fieldset>
      {state.message ? (
        <p
          role={state.success ? "status" : "alert"}
          className={
            state.success
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
export function FormSelect({
  id: providedId,
  name,
  label,
  options,
  defaultValue,
  placeholder,
  required,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: {
  id?: string;
  name: string;
  label?: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <div>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
      ) : null}
      <Select
        name={name}
        defaultValue={defaultValue ?? options[0]?.value}
        required={required}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className={label ? "mt-2" : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DateTimeField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  // An explicit UTC field avoids interpreting browser-local input in the server's time zone.
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label} (UTC)
      </label>
      <Input
        id={id}
        type="datetime-local"
        required
        value={value.slice(0, 16)}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2"
      />
      <input
        type="hidden"
        name={name}
        value={value ? `${value.slice(0, 16)}:00.000Z` : ""}
      />
    </div>
  );
}
