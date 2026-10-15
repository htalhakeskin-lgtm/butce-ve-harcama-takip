"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ColorIcon } from "@/components/category-badge";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useLedger } from "@/components/ledger-context";
import type { AccountView } from "@/features/accounts/server";
import type { CategoryView } from "@/features/categories/server";
import { addMonths } from "@/lib/dates";
import { cn } from "@/lib/cn";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_FUTURE_YEARS,
  MAX_NOTE_LENGTH,
  type TransactionType,
} from "@/lib/domain-constants";
import { newId } from "@/lib/ids";
import { parseMoney, toInputString } from "@/lib/money";
import type { ActionError } from "@/lib/result";
import { useErrorText } from "@/lib/use-error-text";

import { createTransactionAction, getTransactionAction, updateTransactionAction } from "../actions";
import { createTransactionSchema } from "../schemas";
import type { TransactionDetail } from "../server";

export type FormValues = {
  type: TransactionType;
  amount: string;
  occurredOn: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  description: string;
  note: string;
};

export type FormReferenceData = {
  accounts: AccountView[];
  categories: CategoryView[];
  recent: { expense: string[]; income: string[] };
  defaultAccountId: string | null;
};

type Props = {
  data: FormReferenceData;
  mode: "create" | "edit";
  initial: TransactionDetail | null;
  /** Values for a copy or a preset (e.g. type) in create mode. */
  preset?: Partial<FormValues>;
  onDone: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onDelete?: (id: string) => void;
  onCopy?: (values: FormValues) => void;
  formId: string;
};

const FIELD_FOR_PATH: Record<string, keyof FormValues> = {
  amountMinor: "amount",
  "lines.0.categoryId": "categoryId",
  "lines.0.amountMinor": "amount",
  lines: "categoryId",
  occurredOn: "occurredOn",
  accountId: "accountId",
  toAccountId: "toAccountId",
  description: "description",
  note: "note",
};

function valuesFrom(
  detail: TransactionDetail | null,
  data: FormReferenceData,
  today: string,
  locale: string,
  preset?: Partial<FormValues>,
): FormValues {
  if (detail) {
    return {
      type: detail.type,
      amount: toInputString(detail.amountMinor, locale),
      occurredOn: detail.occurredOn,
      accountId: detail.accountId,
      toAccountId: detail.toAccountId ?? "",
      categoryId: detail.lines[0]?.categoryId ?? "",
      description: detail.description,
      note: detail.note,
    };
  }
  const active = data.accounts.filter((a) => !a.archived);
  const accountId =
    data.defaultAccountId && active.some((a) => a.id === data.defaultAccountId)
      ? data.defaultAccountId
      : (active[0]?.id ?? "");
  return {
    type: "expense",
    amount: "",
    occurredOn: today,
    accountId,
    toAccountId: active.find((a) => a.id !== accountId)?.id ?? "",
    categoryId: "",
    description: "",
    note: "",
    ...preset,
  };
}

export function TransactionForm({
  data,
  mode,
  initial,
  preset,
  onDone,
  onDirtyChange,
  onDelete,
  onCopy,
  formId,
}: Props) {
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const { today } = useLedger();
  const locale = useLocale();
  const [detail, setDetail] = useState(initial);
  const idRef = useRef(initial?.id ?? newId());
  const [formError, setFormError] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(Boolean(initial?.note));
  const submitModeRef = useRef<"close" | "new">("close");

  const form = useForm<FormValues>({ defaultValues: valuesFrom(initial, data, today, locale, preset) });
  const { register, handleSubmit, control, setValue, setError, reset, formState } = form;
  const { errors, isSubmitting, isDirty } = formState;
  const type = useWatch({ control, name: "type" });
  const categoryId = useWatch({ control, name: "categoryId" });
  const accountId = useWatch({ control, name: "accountId" });
  const toAccountId = useWatch({ control, name: "toAccountId" });
  const isSplit = (detail?.lines.length ?? 0) > 1;

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const categoryOptions = useMemo(() => {
    if (type === "transfer") return [];
    const usable = data.categories.filter(
      (c) => c.kind === type && (!c.archived || c.id === initial?.lines[0]?.categoryId),
    );
    const parents = usable.filter((c) => !c.parentId);
    const options: { id: string; label: string }[] = [];
    for (const parent of parents) {
      options.push({ id: parent.id, label: parent.name });
      for (const child of usable.filter((c) => c.parentId === parent.id)) {
        options.push({ id: child.id, label: `${parent.name} › ${child.name}` });
      }
    }
    return options;
  }, [data.categories, type, initial]);

  const recent = useMemo(() => {
    if (type === "transfer") return [];
    const ids = data.recent[type];
    const byId = new Map(data.categories.map((c) => [c.id, c]));
    return ids.map((id) => byId.get(id)).filter((c): c is CategoryView => Boolean(c && !c.archived));
  }, [data, type]);

  const accountOptions = (current: string) =>
    data.accounts.filter(
      (a) => !a.archived || a.id === current || a.id === initial?.accountId || a.id === initial?.toAccountId,
    );

  function applyError(error: ActionError) {
    let mapped = false;
    for (const [path, codes] of Object.entries(error.fieldErrors ?? {})) {
      const field = FIELD_FOR_PATH[path];
      const code = codes[0];
      if (field && code) {
        setError(field, { message: errorText(code === "validation" ? "required" : code) });
        mapped = true;
      }
    }
    if (!mapped)
      setFormError(
        errorText(error.code, error.params) + (error.errorId ? ` ${tc("errorId", { id: error.errorId })}` : ""),
      );
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const amountMinor = parseMoney(values.amount);
    if (amountMinor === null || amountMinor <= 0) {
      setError("amount", { message: errorText(amountMinor === null ? "invalidAmount" : "BR-SYS-007") });
      return;
    }
    const lines =
      values.type === "transfer"
        ? []
        : isSplit && detail && amountMinor === detail.amountMinor
          ? detail.lines
          : [{ categoryId: values.categoryId, amountMinor }];
    const input = {
      id: idRef.current,
      type: values.type,
      accountId: values.accountId,
      toAccountId: values.type === "transfer" ? values.toAccountId || null : null,
      amountMinor,
      occurredOn: values.occurredOn,
      description: values.description,
      note: values.note,
      lines,
    };
    if (values.type !== "transfer" && !values.categoryId) {
      setError("categoryId", { message: errorText("required") });
      return;
    }
    const parsed = createTransactionSchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = FIELD_FOR_PATH[issue.path.map(String).join(".")];
        if (field) setError(field, { message: errorText(issue.message) });
      }
      return;
    }

    const result =
      mode === "edit" && detail
        ? await updateTransactionAction({ ...parsed.data, version: detail.version })
        : await createTransactionAction(parsed.data);

    if (!result.ok) {
      if (result.error.code === "conflict" && detail) {
        const fresh = await getTransactionAction({ id: detail.id });
        if (fresh.ok) {
          setDetail(fresh.data);
          reset(valuesFrom(fresh.data, data, today, locale));
        }
      }
      applyError(result.error);
      return;
    }

    toast.success(mode === "edit" ? t("updated") : t("created", { type: t(`types.${values.type}`) }));
    if (mode === "create" && submitModeRef.current === "new") {
      idRef.current = newId();
      reset({
        ...values,
        amount: "",
        description: "",
        note: "",
        categoryId: values.type === "transfer" ? "" : values.categoryId,
      });
      setShowNote(false);
      document.getElementById(`${formId}-amount`)?.focus();
      return;
    }
    onDone();
  }

  const fieldId = (name: string) => `${formId}-${name}`;
  const typeTabs: TransactionType[] = ["expense", "income", "transfer"];

  return (
    <form
      id={formId}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      noValidate
      className="flex flex-col gap-4"
    >
      {formError ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div
        role="radiogroup"
        aria-label={t("fields.type")}
        className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1"
      >
        {typeTabs.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            disabled={isSplit}
            onClick={() => {
              setValue("type", value, { shouldDirty: true });
              setValue("categoryId", "", { shouldDirty: true });
            }}
            className={cn(
              "h-10 rounded-md text-sm font-medium transition-colors duration-150",
              type === value ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`types.${value}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id={fieldId("amount")} label={t("fields.amount")} error={errors.amount?.message}>
          <Input
            id={fieldId("amount")}
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            placeholder="0,00"
            className="tabular h-12 text-xl font-semibold"
            autoFocus
            aria-invalid={!!errors.amount}
            aria-describedby={describedBy(fieldId("amount"), errors.amount?.message)}
            {...register("amount", { required: errorText("required") })}
          />
        </Field>
        <Field id={fieldId("date")} label={t("fields.date")} error={errors.occurredOn?.message}>
          <Input
            id={fieldId("date")}
            type="date"
            min="2000-01-01"
            max={addMonths(today, MAX_FUTURE_YEARS * 12)}
            className="h-12"
            aria-invalid={!!errors.occurredOn}
            aria-describedby={describedBy(fieldId("date"), errors.occurredOn?.message)}
            {...register("occurredOn", { required: errorText("invalidDate") })}
          />
        </Field>
      </div>

      {type === "transfer" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id={fieldId("from")} label={t("fields.fromAccount")} error={errors.accountId?.message}>
            <Select
              id={fieldId("from")}
              aria-invalid={!!errors.accountId}
              {...register("accountId", { required: errorText("required") })}
            >
              {accountOptions(accountId).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field id={fieldId("to")} label={t("fields.toAccount")} error={errors.toAccountId?.message}>
            <Select
              id={fieldId("to")}
              aria-invalid={!!errors.toAccountId}
              {...register("toAccountId", { required: errorText("required") })}
            >
              <option value="" disabled>
                —
              </option>
              {accountOptions(toAccountId).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : (
        <>
          <Field id={fieldId("category")} label={t("fields.category")} error={errors.categoryId?.message}>
            {recent.length > 0 && !isSplit ? (
              <div className="mb-1 flex flex-wrap gap-2" aria-label={t("recentCategories")}>
                {recent.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setValue("categoryId", c.id, { shouldDirty: true, shouldValidate: true })}
                    aria-pressed={categoryId === c.id}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border pr-3 pl-1 text-sm transition-colors duration-150",
                      categoryId === c.id
                        ? "border-accent bg-accent-soft text-foreground"
                        : "border-border hover:bg-surface-muted",
                    )}
                  >
                    <ColorIcon icon={c.icon} color={c.color} size="sm" />
                    {c.name}
                  </button>
                ))}
              </div>
            ) : null}
            {isSplit ? (
              <p className="text-sm text-muted-foreground">{detail?.lines.length} kategori</p>
            ) : (
              <Select
                id={fieldId("category")}
                aria-invalid={!!errors.categoryId}
                aria-describedby={describedBy(fieldId("category"), errors.categoryId?.message)}
                {...register("categoryId")}
              >
                <option value="">{tc("select")}</option>
                {categoryOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id={fieldId("account")} label={t("fields.account")} error={errors.accountId?.message}>
            <Select
              id={fieldId("account")}
              aria-invalid={!!errors.accountId}
              {...register("accountId", { required: errorText("required") })}
            >
              {accountOptions(accountId).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}

      <Field
        id={fieldId("description")}
        label={t("fields.description")}
        optionalLabel={tc("optional")}
        error={errors.description?.message}
      >
        <Input
          id={fieldId("description")}
          maxLength={MAX_DESCRIPTION_LENGTH}
          placeholder={t("fields.descriptionPlaceholder")}
          autoComplete="off"
          {...register("description")}
        />
      </Field>

      {showNote ? (
        <Field
          id={fieldId("note")}
          label={t("fields.note")}
          optionalLabel={tc("optional")}
          error={errors.note?.message}
        >
          <Textarea id={fieldId("note")} maxLength={MAX_NOTE_LENGTH} rows={3} {...register("note")} />
        </Field>
      ) : (
        <Button type="button" variant="link" className="self-start" onClick={() => setShowNote(true)}>
          + {t("fields.note")}
        </Button>
      )}

      <FormActions
        mode={mode}
        formId={formId}
        pending={isSubmitting}
        onSaveNew={() => (submitModeRef.current = "new")}
        onSave={() => (submitModeRef.current = "close")}
        onDelete={detail && onDelete ? () => onDelete(detail.id) : undefined}
        onCopy={onCopy ? () => onCopy(form.getValues()) : undefined}
      />
    </form>
  );
}

function FormActions({
  mode,
  formId,
  pending,
  onSave,
  onSaveNew,
  onDelete,
  onCopy,
}: {
  mode: "create" | "edit";
  formId: string;
  pending: boolean;
  onSave: () => void;
  onSaveNew: () => void;
  onDelete: (() => void) | undefined;
  onCopy: (() => void) | undefined;
}) {
  const tc = useTranslations("common");
  return (
    <div className="sticky bottom-0 -mx-4 mt-2 flex flex-wrap items-center gap-2 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-5 sm:px-5">
      {mode === "edit" ? (
        <>
          {onDelete ? (
            <Button type="button" variant="danger-ghost" onClick={onDelete} disabled={pending}>
              {tc("delete")}
            </Button>
          ) : null}
          {onCopy ? (
            <Button type="button" variant="ghost" onClick={onCopy} disabled={pending}>
              {tc("copy")}
            </Button>
          ) : null}
        </>
      ) : (
        <Button type="submit" form={formId} variant="secondary" onClick={onSaveNew} disabled={pending}>
          {tc("saveAndNew")}
        </Button>
      )}
      <Button type="submit" form={formId} className="ml-auto min-w-28" onClick={onSave} loading={pending}>
        {pending ? tc("saving") : tc("save")}
      </Button>
    </div>
  );
}
