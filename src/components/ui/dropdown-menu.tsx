"use client";

import { DropdownMenu as Primitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuSeparator = ({ className, ...props }: ComponentProps<typeof Primitive.Separator>) => (
  <Primitive.Separator className={cn("my-1 h-px bg-border", className)} {...props} />
);

export function DropdownMenuContent({ className, align = "end", ...props }: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 min-w-48 rounded-lg border border-border bg-surface p-1 text-foreground shadow-lg",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  tone,
  ...props
}: ComponentProps<typeof Primitive.Item> & { tone?: "danger" }) {
  return (
    <Primitive.Item
      className={cn(
        "flex min-h-10 cursor-default items-center gap-2 rounded-md px-3 text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-muted [&_svg]:size-4",
        tone === "danger" && "text-danger",
        className,
      )}
      {...props}
    />
  );
}
