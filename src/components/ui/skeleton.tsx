import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/** Static placeholder: no shimmer animation (ui standard §3.6). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("rounded-md bg-surface-muted", className)} {...props} />;
}
