import { cn } from "@/lib/cn";

import { Icon } from "./icon";

/** Coloured round icon for a category or an account; decorative, the name is always next to it. */
export function ColorIcon({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        size === "sm" && "size-7 [&_svg]:size-3.5",
        size === "md" && "size-9 [&_svg]:size-4",
        size === "lg" && "size-11 [&_svg]:size-5",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklch, var(--cat-${color}) 16%, transparent)`,
        color: `var(--cat-${color})`,
      }}
    >
      <Icon name={icon} />
    </span>
  );
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: `var(--cat-${color})` }}
    />
  );
}
