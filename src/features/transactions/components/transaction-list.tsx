"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/use-error-text";

import { loadTransactionsAction } from "../actions";
import type { TransactionFilters } from "../schemas";
import type { TransactionListItem } from "../server";
import { TransactionRows } from "./transaction-rows";

/**
 * Paged list (NFR-23): the first page is rendered on the server, more pages load on demand.
 * The parent remounts this component (key) whenever the filters change.
 */
export function TransactionList({
  initialItems,
  initialCursor,
  filters,
}: {
  initialItems: TransactionListItem[];
  initialCursor: string | null;
  filters: TransactionFilters;
}) {
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  // After a change elsewhere (edit, delete, undo) the server sends a fresh first page.
  const [previous, setPrevious] = useState(initialItems);
  if (previous !== initialItems) {
    setPrevious(initialItems);
    setItems(initialItems);
    setCursor(initialCursor);
  }

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    const result = await loadTransactionsAction({ filters, cursor });
    setLoading(false);
    if (!result.ok) {
      toast.error(errorText(result.error.code));
      return;
    }
    setItems((current) => [...current, ...result.data.items]);
    setCursor(result.data.nextCursor);
  }

  return (
    <div className="flex flex-col gap-4">
      <TransactionRows items={items} />
      {cursor ? (
        <Button variant="secondary" className="self-center" onClick={loadMore} loading={loading}>
          {loading ? tc("loading") : tc("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
