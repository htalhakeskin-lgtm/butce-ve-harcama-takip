"use client";

import { ArrowLeftRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ColorIcon } from "@/components/category-badge";
import { useLedger } from "@/components/ledger-context";
import { MoneyText } from "@/components/money-text";
import { addDays, formatDay } from "@/lib/dates";

import type { TransactionListItem } from "../server";
import { useTransactionDialog } from "./transaction-dialog";

function dayLabel(day: string, today: string, locale: string, t: (key: string) => string): string {
  if (day === today) return t("today");
  if (day === addDays(today, -1)) return t("yesterday");
  return formatDay(day, locale, "long");
}

/** Transactions grouped under date headings (ui standard §8). Each row opens the edit dialog. */
export function TransactionRows({ items, grouped = true }: { items: TransactionListItem[]; grouped?: boolean }) {
  const locale = useLocale();
  const tc = useTranslations("common");
  const { today } = useLedger();

  if (!grouped) {
    return (
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id}>
            <Row item={item} showDate />
          </li>
        ))}
      </ul>
    );
  }

  const groups: { day: string; items: TransactionListItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.day === item.occurredOn) last.items.push(item);
    else groups.push({ day: item.occurredOn, items: [item] });
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.day} aria-label={dayLabel(group.day, today, locale, tc)}>
          <h3 className="px-1 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {dayLabel(group.day, today, locale, tc)}
            {group.day > today ? ` · ${formatDay(group.day, locale, "short")}` : ""}
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {group.items.map((item) => (
              <li key={item.id}>
                <Row item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ item, showDate = false }: { item: TransactionListItem; showDate?: boolean }) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const { openEdit } = useTransactionDialog();
  const isTransfer = item.type === "transfer";
  const categoryLabel = item.category
    ? item.category.parentName
      ? `${item.category.parentName} › ${item.category.name}`
      : item.category.name
    : "";
  const title = isTransfer
    ? t("transferLabel", { from: item.account.name, to: item.toAccount?.name ?? "" })
    : item.description || categoryLabel;
  const subtitle = isTransfer
    ? item.description || t("types.transfer")
    : [
        item.description && item.description !== categoryLabel ? categoryLabel : null,
        item.lineCount > 1 ? `+${item.lineCount - 1}` : null,
        item.account.name,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <button
      type="button"
      onClick={() => void openEdit(item.id)}
      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-150 hover:bg-surface-muted sm:px-4"
    >
      {isTransfer ? (
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground"
        >
          <ArrowLeftRight className="size-4" />
        </span>
      ) : (
        <ColorIcon icon={item.category?.icon ?? "tag"} color={item.category?.color ?? "slate"} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {showDate ? `${formatDay(item.occurredOn, locale, "short")} · ` : ""}
          {subtitle}
        </span>
      </span>
      <MoneyText
        minor={item.amountMinor}
        kind={item.type === "income" ? "income" : item.type === "expense" ? "expense" : "neutral"}
        className="font-semibold"
      />
    </button>
  );
}
