"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

import type { ActionError } from "./result";

/**
 * Turns an error code into user-facing Turkish text (api standard: the server sends codes only).
 * "tooLong|60" → errors.field.tooLong with {max: 60}; "BR-TRX-004" → errors.BR-TRX-004.
 */
export function useErrorText() {
  const t = useTranslations("errors");
  return useCallback(
    (code: string, params?: Record<string, string | number>): string => {
      const [key = code, arg] = code.split("|");
      const fieldKey = `field.${key}`;
      if (t.has(fieldKey)) return t(fieldKey, { max: Number(arg), min: Number(arg), ...params });
      if (t.has(key)) return t(key, params);
      return t("unexpected");
    },
    [t],
  );
}

/** Field path → first translated message, for react-hook-form setError. */
export function fieldMessages(error: ActionError, translate: (code: string) => string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, codes] of Object.entries(error.fieldErrors ?? {})) {
    const first = codes[0];
    if (first) result[field] = translate(first);
  }
  return result;
}
