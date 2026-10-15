"use client";

import { Archive, ArchiveRestore, ArrowDown, ArrowUp, List, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ColorIcon } from "@/components/category-badge";
import { ColorPicker } from "@/components/color-picker";
import { EmptyState } from "@/components/empty-state";
import { useLedger } from "@/components/ledger-context";
import { MoneyText } from "@/components/money-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { describedBy, Field } from "@/components/ui/field";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { ACCOUNT_TYPES, type AccountType, type PaletteColor } from "@/lib/domain-constants";
import { newId } from "@/lib/ids";
import { formatMoney, parseMoney, toInputString } from "@/lib/money";
import { can } from "@/lib/permissions";
import { useErrorText } from "@/lib/use-error-text";

import {
  archiveAccountAction,
  createAccountAction,
  deleteAccountAction,
  moveAccountAction,
  updateAccountAction,
} from "../actions";
import type { AccountView } from "../server";

type Editing = { mode: "create" } | { mode: "edit"; account: AccountView };

/** UC-11: accounts grouped by type with group totals (BR-ACC-001…004). */
export function AccountsManager({ accounts, showArchived }: { accounts: AccountView[]; showArchived: boolean }) {
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const router = useRouter();
  const { role } = useLedger();
  const canEdit = can.edit(role);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AccountView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountView | null>(null);
  const [busy, setBusy] = useState(false);
  const locale = useLocale();
  const { currencyCode } = useLedger();

  async function run<T>(
    promise: Promise<{ ok: true; data: T } | { ok: false; error: { code: string } }>,
    success: string,
  ) {
    setBusy(true);
    const result = await promise;
    setBusy(false);
    if (!result.ok) {
      toast.error(errorText(result.error.code));
      return false;
    }
    toast.success(success);
    return true;
  }

  const visible = accounts.filter((a) => showArchived || !a.archived);
  const groups = ACCOUNT_TYPES.map((type) => ({ type, items: visible.filter((a) => a.type === type) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={showArchived}
            onChange={() => router.push(showArchived ? "/accounts" : "/accounts?archived=1")}
          />
          {t("showArchived")}
        </label>
        {canEdit ? (
          <Button onClick={() => setEditing({ mode: "create" })}>
            <Plus /> {t("add")}
          </Button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => {
            const total = group.items.filter((a) => !a.archived).reduce((s, a) => s + a.balanceMinor, 0);
            return (
              <section key={group.type} aria-labelledby={`group-${group.type}`}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 id={`group-${group.type}`} className="text-sm font-semibold text-muted-foreground">
                    {t(`types.${group.type}`)}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {group.type === "credit_card" ? t("debt") : t("groupTotal")}:{" "}
                    <MoneyText
                      minor={group.type === "credit_card" ? Math.max(0, -total) : total}
                      className="font-medium text-foreground"
                    />
                  </span>
                </div>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                  {group.items.map((account) => (
                    <li key={account.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                      <ColorIcon icon={account.icon} color={account.color} />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/transactions?account=${account.id}`}
                          className="block truncate font-medium hover:text-accent"
                        >
                          {account.name}
                        </Link>
                        <div className="flex flex-wrap gap-1.5">
                          {account.archived ? <Badge>{tc("archived")}</Badge> : null}
                          {!account.includeInTotal ? <Badge>{t("notInTotal")}</Badge> : null}
                        </div>
                      </div>
                      <div className="text-right">
                        {account.type === "credit_card" ? (
                          <>
                            <div className="text-xs text-muted-foreground">{t("debt")}</div>
                            <MoneyText minor={Math.max(0, -account.balanceMinor)} className="font-semibold" />
                          </>
                        ) : (
                          <MoneyText
                            minor={account.balanceMinor}
                            className={account.balanceMinor < 0 ? "font-semibold text-danger" : "font-semibold"}
                          />
                        )}
                      </div>
                      {canEdit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`${account.name}: ${tc("actions")}`}>
                              <MoreVertical />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => setEditing({ mode: "edit", account })}>
                              <Pencil /> {tc("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/transactions?account=${account.id}`}>
                                <List /> {t("transactions")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                void run(moveAccountAction({ id: account.id, direction: "up" }), t("updated"))
                              }
                            >
                              <ArrowUp /> {tc("moveUp")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                void run(moveAccountAction({ id: account.id, direction: "down" }), t("updated"))
                              }
                            >
                              <ArrowDown /> {tc("moveDown")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {account.archived ? (
                              <DropdownMenuItem
                                onSelect={() =>
                                  void run(
                                    archiveAccountAction({ id: account.id, archived: false }),
                                    t("unarchivedToast"),
                                  )
                                }
                              >
                                <ArchiveRestore /> {tc("unarchive")}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => setArchiveTarget(account)}>
                                <Archive /> {tc("archive")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem tone="danger" onSelect={() => setDeleteTarget(account)}>
                              <Trash2 /> {tc("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {editing ? <AccountFormDialog editing={editing} onClose={() => setEditing(null)} /> : null}

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`${archiveTarget?.name ?? ""}: ${tc("archive")}`}
        body={
          archiveTarget && archiveTarget.balanceMinor !== 0
            ? t("archiveNonZero", { balance: formatMoney(archiveTarget.balanceMinor, currencyCode, locale) })
            : t("notInTotal")
        }
        confirmLabel={t("archiveConfirm")}
        cancelLabel={tc("cancel")}
        tone="primary"
        loading={busy}
        onConfirm={async () => {
          if (!archiveTarget) return;
          if (await run(archiveAccountAction({ id: archiveTarget.id, archived: true }), t("archivedToast")))
            setArchiveTarget(null);
        }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        loading={busy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const ok = await run(deleteAccountAction({ id: deleteTarget.id }), t("deletedToast"));
          setDeleteTarget(null);
          if (!ok) return;
        }}
      />
    </>
  );
}

type FormState = {
  name: string;
  type: AccountType;
  balance: string;
  openingOn: string;
  includeInTotal: boolean;
  color: PaletteColor;
  creditLimit: string;
};

function AccountFormDialog({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const locale = useLocale();
  const { today } = useLedger();
  const existing = editing.mode === "edit" ? editing.account : null;
  const [id] = useState(() => existing?.id ?? newId());
  const [state, setState] = useState<FormState>(() => ({
    name: existing?.name ?? "",
    type: existing?.type ?? "bank",
    balance: existing
      ? toInputString(
          existing.type === "credit_card" ? -existing.openingBalanceMinor : existing.openingBalanceMinor,
          locale,
        )
      : "",
    openingOn: existing?.openingOn ?? today,
    includeInTotal: existing?.includeInTotal ?? true,
    color: (existing?.color as PaletteColor | undefined) ?? "blue",
    creditLimit: existing?.creditLimitMinor ? toInputString(existing.creditLimitMinor, locale) : "",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "form", string>>>({});
  const [pending, setPending] = useState(false);
  const isCard = state.type === "credit_card";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    const balance = state.balance.trim() ? parseMoney(state.balance) : 0;
    const limit = state.creditLimit.trim() ? parseMoney(state.creditLimit) : null;
    if (!state.name.trim()) next.name = errorText("required");
    if (balance === null) next.balance = errorText("invalidAmount");
    if (isCard && state.creditLimit.trim() && (limit === null || limit <= 0))
      next.creditLimit = errorText("invalidAmount");
    setErrors(next);
    if (Object.keys(next).length > 0 || balance === null) return;

    const input = {
      id,
      name: state.name,
      type: state.type,
      // BR-ACC-002: a card's opening debt is stored as a negative balance.
      openingBalanceMinor: isCard ? -Math.abs(balance) : balance,
      openingOn: state.openingOn,
      includeInTotal: state.includeInTotal,
      color: state.color,
      creditLimitMinor: isCard ? limit : null,
    };
    setPending(true);
    const result = existing
      ? await updateAccountAction({ ...input, version: existing.version })
      : await createAccountAction(input);
    setPending(false);
    if (!result.ok) {
      const fieldMap: Record<string, keyof FormState> = {
        name: "name",
        openingBalanceMinor: "balance",
        openingOn: "openingOn",
        creditLimitMinor: "creditLimit",
      };
      const mapped: typeof errors = {};
      for (const [path, codes] of Object.entries(result.error.fieldErrors ?? {})) {
        const field = fieldMap[path];
        if (field && codes[0]) mapped[field] = errorText(codes[0]);
      }
      if (Object.keys(mapped).length === 0) mapped.form = errorText(result.error.code);
      setErrors(mapped);
      return;
    }
    toast.success(existing ? t("updated") : t("created"));
    onClose();
  }

  const formId = "account-form";
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={existing ? t("editTitle") : t("newTitle")}
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
          {errors.form ? (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
              {errors.form}
            </p>
          ) : null}
          <Field id="account-name" label={t("fields.name")} error={errors.name}>
            <Input
              id="account-name"
              value={state.name}
              maxLength={60}
              autoFocus
              aria-invalid={!!errors.name}
              aria-describedby={describedBy("account-name", errors.name)}
              onChange={(e) => setState({ ...state, name: e.target.value })}
            />
          </Field>
          <Field id="account-type" label={t("fields.type")}>
            <Select
              id="account-type"
              value={state.type}
              onChange={(e) => setState({ ...state, type: e.target.value as AccountType })}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="account-balance"
              label={isCard ? t("fields.openingDebt") : t("fields.openingBalance")}
              hint={isCard ? t("openingDebtHint") : t("openingBalanceHint")}
              error={errors.balance}
            >
              <Input
                id="account-balance"
                inputMode="decimal"
                placeholder="0,00"
                value={state.balance}
                aria-invalid={!!errors.balance}
                aria-describedby={describedBy("account-balance", errors.balance, "hint")}
                onChange={(e) => setState({ ...state, balance: e.target.value })}
              />
            </Field>
            <Field id="account-opening" label={t("fields.openingOn")}>
              <Input
                id="account-opening"
                type="date"
                value={state.openingOn}
                onChange={(e) => setState({ ...state, openingOn: e.target.value })}
              />
            </Field>
          </div>
          {isCard ? (
            <Field
              id="account-limit"
              label={t("fields.creditLimit")}
              optionalLabel={tc("optional")}
              error={errors.creditLimit}
            >
              <Input
                id="account-limit"
                inputMode="decimal"
                value={state.creditLimit}
                aria-invalid={!!errors.creditLimit}
                onChange={(e) => setState({ ...state, creditLimit: e.target.value })}
              />
            </Field>
          ) : null}
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={state.includeInTotal}
              onChange={(e) => setState({ ...state, includeInTotal: e.target.checked })}
            />
            {t("fields.includeInTotal")}
          </label>
          <ColorPicker
            id="account-color"
            label={t("fields.color")}
            value={state.color}
            onChange={(color) => setState({ ...state, color })}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
