import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type FieldProps = {
  id: string;
  label: ReactNode;
  error?: string | undefined;
  hint?: ReactNode;
  optionalLabel?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Label + control + hint + error. The control must use `id`, `aria-invalid` and
 * `aria-describedby={describedBy(id, error, hint)}` so screen readers announce the error.
 */
export function Field({ id, label, error, hint, optionalLabel, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {optionalLabel ? <span className="font-normal text-muted-foreground"> ({optionalLabel})</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: ReactNode): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
