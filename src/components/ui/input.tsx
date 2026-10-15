import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export const controlClass =
  "h-11 w-full rounded-md border border-input bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground/80 transition-colors duration-150 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClass, "h-auto min-h-20 py-2", className)} {...props} />;
}

/** Native select: accessible and comfortable on phones (ui standard §7.9). */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        controlClass,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    />
  );
}

export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      className={cn("size-5 shrink-0 rounded border-input accent-[var(--accent)]", className)}
      {...props}
    />
  );
}
