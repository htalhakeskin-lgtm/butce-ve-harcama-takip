"use client";

import { Pencil, Plus, TriangleAlert, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { BudgetBar } from "@/components/budget-bar";
import { ColorIcon } from "@/components/category-badge";
import { useLedger } from "@/components/ledger-context";
import { MoneyText } from "@/components/money-text";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import type { CategoryView } from "@/features/categories/server";
import { cn } from "@/lib/cn";
import type { IsoMonth } from "@/lib/dates";
import { formatMoney, parseMoney, toInputString } from "@/lib/money";
import { can } from "@/lib/permissions";
import { useErrorText } from "@/lib/use-error-text";

import { setBudgetLimitAction } from "../actions";
import type { BudgetOverview, CategoryBudgetRow } from "../server";

type Editing = { categoryId: string | null; current: number | null } | { pickCategory: true };

/** UC-13: overall and category budgets for a month (BR-BUD-001…006). */
export function BudgetsManager({ overview, categories }: { overview: BudgetOverview; categories: CategoryView[] }) {
  const t = useTranslations("budgets");
  const errorText = useErrorText();
  const locale = useLocale();
  const { role, currencyCode } = useLedger();
  const canEdit = can.edit(role);
  const [editing, setEditing] = useState<Editing | null>(null);
  const { overall } = overview;

  async function remove(categoryId: string | null) {
    const result = await setBudgetLimitAction({
      categoryId,
      month: overview.month,
      amountMinor: null,
      scope: "fromNow",
    });
    if (!result.ok) toast.error(errorText(result.error.code));
    else toast.success(t("removed"));
  }

  const budgeted = new Set(overview.categories.map((c) => c.categoryId));
  const available = categories.filter((c) => c.kind === "expense" && !c.archived && !budgeted.has(c.id));

  return (
    <div className="flex flex-col gap-4">
      {overview.childSumWarnings.map((w) => (
        <div
          key={w.categoryId}
          role="status"
          className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-warning"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("childSumWarning", {
            sum: formatMoney(w.childSumMinor, currencyCode, locale),
            name: w.name,
            limit: formatMoney(w.limitMinor, currencyCode, locale),
          })}
        </div>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>{t("overall")}</CardTitle>
          {canEdit && overall ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("editLimit")}
                onClick={() => setEditing({ categoryId: null, current: overall.limitMinor })}
              >
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("removeLimit")} onClick={() => void remove(null)}>
                <X />
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardBody>
          {overall ? (
            <>
              <Figures row={overall} />
              <div className="mt-3">
                <BudgetBar
                  spentMinor={overall.spentMinor}
                  plannedMinor={overall.plannedMinor}
                  limitMinor={overall.limitMinor}
                  status={overall.status}
                  label={t("overall")}
                />
              </div>
              {overall.carriedOver ? <p className="mt-2 text-xs text-muted-foreground">{t("carriedOver")}</p> : null}
            </>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">{t("overallHint")}</p>
              {canEdit ? (
                <Button onClick={() => setEditing({ categoryId: null, current: null })}>
                  <Plus /> {t("setOverall")}
                </Button>
              ) : null}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("categoryBudgets")}</CardTitle>
          {canEdit && available.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => setEditing({ pickCategory: true })}>
              <Plus /> {t("addCategoryBudget")}
            </Button>
          ) : null}
        </CardHeader>
        <CardBody>
          {overview.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyCategories")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {overview.categories.map((row) => (
                <li key={row.categoryId} className="py-3 first:pt-0 last:pb-0">
                  <div className="mb-2 flex items-center gap-2">
                    <ColorIcon icon={row.icon} color={row.color} size="sm" />
                    <span className={cn("min-w-0 flex-1 truncate font-medium", row.parentId && "font-normal")}>
                      {row.name}
                    </span>
                    {canEdit ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${row.name}: ${t("editLimit")}`}
                          onClick={() => setEditing({ categoryId: row.categoryId, current: row.limitMinor })}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${row.name}: ${t("removeLimit")}`}
                          onClick={() => void remove(row.categoryId)}
                        >
                          <X />
                        </Button>
                      </>
                    ) : null}
                  </div>
                  <Figures row={row} />
                  <div className="mt-2">
                    <BudgetBar
                      spentMinor={row.spentMinor}
                      plannedMinor={row.plannedMinor}
                      limitMinor={row.limitMinor}
                      status={row.status}
                      label={row.name}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {editing ? (
        <LimitDialog
          month={overview.month}
          editing={editing}
          categories={available}
          allCategories={categories}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function Figures({
  row,
}: {
  row: Pick<CategoryBudgetRow, "limitMinor" | "spentMinor" | "plannedMinor" | "remainingMinor">;
}) {
  const t = useTranslations("budgets");
  const over = row.remainingMinor < 0;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-muted-foreground">{t("limit")}</dt>
        <dd className="font-medium">
          <MoneyText minor={row.limitMinor} />
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t("spent")}</dt>
        <dd className="font-medium">
          <MoneyText minor={row.spentMinor} />
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t("planned")}</dt>
        <dd className="font-medium">
          <MoneyText minor={row.plannedMinor} />
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t("remaining")}</dt>
        <dd className={cn("font-semibold", over && "text-danger")}>
          <MoneyText minor={row.remainingMinor} />
        </dd>
      </div>
    </dl>
  );
}

function LimitDialog({
  month,
  editing,
  categories,
  allCategories,
  onClose,
}: {
  month: IsoMonth;
  editing: Editing;
  categories: CategoryView[];
  allCategories: CategoryView[];
  onClose: () => void;
}) {
  const t = useTranslations("budgets");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const locale = useLocale();
  const picking = "pickCategory" in editing;
  const [categoryId, setCategoryId] = useState<string | null>(
    picking ? (categories[0]?.id ?? null) : editing.categoryId,
  );
  const [amount, setAmount] = useState(!picking && editing.current ? toInputString(editing.current, locale) : "");
  const [scope, setScope] = useState<"fromNow" | "thisMonth">("fromNow");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const label = (c: CategoryView) => {
    const parent = allCategories.find((p) => p.id === c.parentId);
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };
  const name = categoryId ? (allCategories.find((c) => c.id === categoryId)?.name ?? "") : t("overallTitle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amountMinor = parseMoney(amount);
    if (amountMinor === null || amountMinor <= 0) {
      setError(errorText(amountMinor === null ? "invalidAmount" : "BR-BUD-001"));
      return;
    }
    setPending(true);
    const result = await setBudgetLimitAction({ categoryId, month, amountMinor, scope });
    setPending(false);
    if (!result.ok) {
      setError(errorText(result.error.code));
      return;
    }
    toast.success(t("saved"));
    onClose();
  }

  const formId = "budget-form";
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={picking ? t("addCategoryBudget") : `${t("setLimitTitle")}: ${name}`}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form={formId} loading={pending}>
              {tc("save")}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
          {picking ? (
            <Field id="budget-category" label={t("category")}>
              <Select id="budget-category" value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {label(c)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field id="budget-amount" label={t("amount")} error={error ?? undefined}>
            <Input
              id="budget-amount"
              inputMode="decimal"
              placeholder="0,00"
              autoFocus
              value={amount}
              aria-invalid={!!error}
              aria-describedby={describedBy("budget-amount", error ?? undefined)}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("scope")}</legend>
            <div className="flex flex-col gap-2">
              {(["fromNow", "thisMonth"] as const).map((value) => (
                <label key={value} className="flex min-h-10 items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="scope"
                    value={value}
                    checked={scope === value}
                    onChange={() => setScope(value)}
                    className="size-5 accent-[var(--accent)]"
                  />
                  {value === "fromNow" ? t("scopeFromNow") : t("scopeThisMonth")}
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
