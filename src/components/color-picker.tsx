"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import { PALETTE, type PaletteColor } from "@/lib/domain-constants";

/** Users pick from the fixed palette only (ui standard: contrast is guaranteed). */
export function ColorPicker({
  value,
  onChange,
  label,
  id,
}: {
  value: string;
  onChange: (color: PaletteColor) => void;
  label: string;
  id: string;
}) {
  const t = useTranslations("colors");
  return (
    <fieldset>
      <legend id={id} className="mb-1.5 text-sm font-medium">
        {label}
      </legend>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={value === color}
            aria-label={t(color)}
            onClick={() => onChange(color)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface",
              value === color && "ring-2 ring-foreground",
            )}
            style={{ backgroundColor: `var(--cat-${color})` }}
          >
            {value === color ? <Check aria-hidden className="size-4 text-white" /> : null}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
