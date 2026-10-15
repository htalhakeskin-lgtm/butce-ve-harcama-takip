"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Checkbox } from "./ui/input";

/**
 * Checkbox whose value lives in the URL. It flips immediately and then navigates,
 * so the click is acknowledged before the server answers (ui standard §2, principle 1).
 */
export function UrlToggle({
  checked,
  label,
  hrefOn,
  hrefOff,
}: {
  checked: boolean;
  label: string;
  hrefOn: string;
  hrefOff: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(checked);
  const [pending, startTransition] = useTransition();
  const [previous, setPrevious] = useState(checked);
  if (previous !== checked) {
    setPrevious(checked);
    setValue(checked);
  }
  return (
    <label className="flex items-center gap-2 text-sm" aria-busy={pending}>
      <Checkbox
        checked={value}
        onChange={(event) => {
          const next = event.target.checked;
          setValue(next);
          startTransition(() => router.push(next ? hrefOn : hrefOff, { scroll: false }));
        }}
      />
      {label}
    </label>
  );
}
