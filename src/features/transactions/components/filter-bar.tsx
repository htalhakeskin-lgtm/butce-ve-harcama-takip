"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { ColorDot } from "@/components/category-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Checkbox, Input, Select } from "@/components/ui/input";
import type { AccountView } from "@/features/accounts/server";
import type { CategoryView } from "@/features/categories/server";
import { TRANSACTION_TYPES, type TransactionType } from "@/lib/domain-constants";

import { activeFilterCount, buildSearch, RANGE_CHOICES, type RangeChoice, type UrlFilters } from "../url-filters";

type Props = { filters: UrlFilters; accounts: AccountView[]; categories: CategoryView[] };

/** UC-09: date range always visible; categories, accounts, types and amounts in a panel; active filters as chips. */
export function FilterBar({ filters, accounts, categories }: Props) {
  const t = useTranslations("transactions");
  const tf = useTranslations("transactions.filters");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<UrlFilters>(filters);

  function apply(next: UrlFilters) {
    startTransition(() => router.push(`${pathname}${buildSearch(next)}`, { scroll: false }));
  }

  const toggle = <T extends string>(values: T[], value: T): T[] =>
    values.includes(value) ? values.filter((v) => v !== value) : [...values, value];

  const byId = new Map(categories.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const parents = categories.filter((c) => !c.parentId && !c.archived);
  const count = activeFilterCount(filters);

  const chips: { key: string; label: string; remove: UrlFilters }[] = [
    ...filters.types.map((type) => ({
      key: `type-${type}`,
      label: t(`types.${type}`),
      remove: { ...filters, types: filters.types.filter((x) => x !== type) },
    })),
    ...filters.categoryIds.map((id) => ({
      key: `cat-${id}`,
      label: byId.get(id)?.name ?? "—",
      remove: { ...filters, categoryIds: filters.categoryIds.filter((x) => x !== id) },
    })),
    ...filters.accountIds.map((id) => ({
      key: `acc-${id}`,
      label: accountById.get(id)?.name ?? "—",
      remove: { ...filters, accountIds: filters.accountIds.filter((x) => x !== id) },
    })),
    ...(filters.min ? [{ key: "min", label: `≥ ${filters.min}`, remove: { ...filters, min: "" } }] : []),
    ...(filters.max ? [{ key: "max", label: `≤ ${filters.max}`, remove: { ...filters, max: "" } }] : []),
  ];

  return (
    <div className="mb-4 flex flex-col gap-3" aria-busy={pending}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 sm:flex-none">
          <label htmlFor="range" className="sr-only">
            {tf("range")}
          </label>
          <Select
            id="range"
            value={filters.range}
            onChange={(e) => apply({ ...filters, range: e.target.value as RangeChoice })}
          >
            {RANGE_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {choice === "all" ? tc("all") : tf(choice)}
              </option>
            ))}
          </Select>
        </div>
        {filters.range === "custom" ? (
          <>
            <Input
              type="date"
              aria-label={tf("from")}
              value={filters.from}
              onChange={(e) => apply({ ...filters, from: e.target.value })}
              className="w-auto"
            />
            <Input
              type="date"
              aria-label={tf("to")}
              value={filters.to}
              onChange={(e) => apply({ ...filters, to: e.target.value })}
              className="w-auto"
            />
          </>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => {
            setDraft(filters);
            setOpen(true);
          }}
        >
          <SlidersHorizontal /> {tf("title")}
          {count > 0 ? (
            <span className="rounded-full bg-accent px-1.5 text-xs text-accent-foreground">{count}</span>
          ) : null}
        </Button>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => apply(chip.remove)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-surface px-3 text-sm hover:bg-surface-muted"
              aria-label={`${chip.label} ×`}
            >
              {chip.label}
              <X aria-hidden className="size-3.5" />
            </button>
          ))}
          <Button
            variant="link"
            size="sm"
            onClick={() => apply({ ...filters, categoryIds: [], accountIds: [], types: [], min: "", max: "" })}
          >
            {tf("clear")}
          </Button>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        {open ? (
          <DialogContent
            title={tf("title")}
            closeLabel={tc("close")}
            footer={
              <>
                <Button
                  variant="ghost"
                  onClick={() => setDraft({ ...draft, categoryIds: [], accountIds: [], types: [], min: "", max: "" })}
                >
                  {tf("clear")}
                </Button>
                <Button
                  onClick={() => {
                    setOpen(false);
                    apply(draft);
                  }}
                >
                  {tc("apply")}
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-6">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">{tf("types")}</legend>
                <div className="flex flex-wrap gap-2">
                  {TRANSACTION_TYPES.map((type: TransactionType) => (
                    <label
                      key={type}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm"
                    >
                      <Checkbox
                        checked={draft.types.includes(type)}
                        onChange={() => setDraft({ ...draft, types: toggle(draft.types, type) })}
                      />
                      {t(`types.${type}`)}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold">{tf("categories")}</legend>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {(["expense", "income"] as const).map((kind) => (
                    <div key={kind} className="mb-3">
                      <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {t(`types.${kind}`)}
                      </p>
                      {parents
                        .filter((p) => p.kind === kind)
                        .map((parent) => (
                          <div key={parent.id}>
                            <label className="flex min-h-10 items-center gap-2 text-sm">
                              <Checkbox
                                checked={draft.categoryIds.includes(parent.id)}
                                onChange={() =>
                                  setDraft({ ...draft, categoryIds: toggle(draft.categoryIds, parent.id) })
                                }
                              />
                              <ColorDot color={parent.color} />
                              {parent.name}
                            </label>
                            {categories
                              .filter((c) => c.parentId === parent.id && !c.archived)
                              .map((child) => (
                                <label key={child.id} className="ml-7 flex min-h-10 items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={
                                      draft.categoryIds.includes(child.id) || draft.categoryIds.includes(parent.id)
                                    }
                                    disabled={draft.categoryIds.includes(parent.id)}
                                    onChange={() =>
                                      setDraft({ ...draft, categoryIds: toggle(draft.categoryIds, child.id) })
                                    }
                                  />
                                  {child.name}
                                </label>
                              ))}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold">{tf("accounts")}</legend>
                <div className="flex flex-col">
                  {accounts.map((account) => (
                    <label key={account.id} className="flex min-h-10 items-center gap-2 text-sm">
                      <Checkbox
                        checked={draft.accountIds.includes(account.id)}
                        onChange={() => setDraft({ ...draft, accountIds: toggle(draft.accountIds, account.id) })}
                      />
                      {account.name}
                      {account.archived ? <span className="text-muted-foreground">({tc("archived")})</span> : null}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <Field id="amount-min" label={tf("amountMin")}>
                  <Input
                    id="amount-min"
                    inputMode="decimal"
                    value={draft.min}
                    onChange={(e) => setDraft({ ...draft, min: e.target.value })}
                  />
                </Field>
                <Field id="amount-max" label={tf("amountMax")}>
                  <Input
                    id="amount-max"
                    inputMode="decimal"
                    value={draft.max}
                    onChange={(e) => setDraft({ ...draft, max: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
