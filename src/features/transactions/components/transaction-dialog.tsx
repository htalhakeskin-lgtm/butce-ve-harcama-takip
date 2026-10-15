"use client";

import { useTranslations } from "next-intl";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLedger } from "@/components/ledger-context";
import { UNDO_WINDOW_MS } from "@/lib/domain-constants";
import { can } from "@/lib/permissions";
import { useErrorText } from "@/lib/use-error-text";

import { deleteTransactionAction, getTransactionAction, restoreTransactionAction } from "../actions";
import type { TransactionDetail } from "../server";
import { TransactionForm, type FormReferenceData, type FormValues } from "./transaction-form";

type OpenState =
  | { kind: "closed" }
  | { kind: "create"; preset?: Partial<FormValues>; key: number }
  | { kind: "edit"; detail: TransactionDetail; key: number };

type Api = {
  openNew: (preset?: Partial<FormValues>) => void;
  openEdit: (id: string) => Promise<void>;
  deleteWithUndo: (id: string) => Promise<void>;
  canEdit: boolean;
};

const TransactionDialogContext = createContext<Api | null>(null);

export function useTransactionDialog(): Api {
  const api = use(TransactionDialogContext);
  if (!api) throw new Error("useTransactionDialog must be used inside TransactionDialogProvider");
  return api;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * One transaction dialog for the whole app (UC-06, UC-07, UC-08). Opened by the quick-add button,
 * the N shortcut (FR-TRX-05) and list rows.
 */
export function TransactionDialogProvider({ data, children }: { data: FormReferenceData; children: ReactNode }) {
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const { role } = useLedger();
  const canEdit = can.edit(role);
  const [state, setState] = useState<OpenState>({ kind: "closed" });
  const [confirmClose, setConfirmClose] = useState(false);
  const dirtyRef = useRef(false);
  const keyRef = useRef(0);

  const openNew = useCallback(
    (preset?: Partial<FormValues>) => {
      if (!canEdit) return;
      dirtyRef.current = false;
      setState({ kind: "create", ...(preset ? { preset } : {}), key: ++keyRef.current });
    },
    [canEdit],
  );

  const openEdit = useCallback(
    async (id: string) => {
      const result = await getTransactionAction({ id });
      if (!result.ok) {
        toast.error(errorText(result.error.code));
        return;
      }
      dirtyRef.current = false;
      setState({ kind: "edit", detail: result.data, key: ++keyRef.current });
    },
    [errorText],
  );

  const deleteWithUndo = useCallback(
    async (id: string) => {
      const result = await deleteTransactionAction({ id });
      if (!result.ok) {
        toast.error(errorText(result.error.code));
        return;
      }
      // BR-TRX-008: no confirmation for a single delete; "Undo" for 10 seconds instead.
      toast(t("deleted"), {
        duration: UNDO_WINDOW_MS,
        action: {
          label: tc("undo"),
          onClick: () => {
            void restoreTransactionAction({ id }).then((restored) => {
              if (restored.ok) toast.success(t("restored"));
              else toast.error(errorText(restored.error.code));
            });
          },
        },
      });
    },
    [errorText, t, tc],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "n" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || state.kind !== "closed") return;
      event.preventDefault();
      openNew();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNew, state.kind]);

  const close = useCallback(() => {
    dirtyRef.current = false;
    setConfirmClose(false);
    setState({ kind: "closed" });
  }, []);

  const api = useMemo(
    () => ({ openNew, openEdit, deleteWithUndo, canEdit }),
    [openNew, openEdit, deleteWithUndo, canEdit],
  );
  const open = state.kind !== "closed";

  return (
    <TransactionDialogContext value={api}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) return;
          if (dirtyRef.current) setConfirmClose(true);
          else close();
        }}
      >
        {open ? (
          <DialogContent
            title={state.kind === "edit" ? t("editTitle") : t("newTitle")}
            closeLabel={tc("close")}
            onOpenAutoFocus={(event) => {
              // Let the amount field's autoFocus win over Radix's default focus.
              event.preventDefault();
            }}
          >
            <TransactionForm
              key={state.key}
              formId={`transaction-form-${state.key}`}
              data={data}
              mode={state.kind === "edit" ? "edit" : "create"}
              initial={state.kind === "edit" ? state.detail : null}
              {...(state.kind === "create" && state.preset ? { preset: state.preset } : {})}
              onDone={close}
              onDirtyChange={(dirty) => {
                dirtyRef.current = dirty;
              }}
              {...(state.kind === "edit"
                ? {
                    onDelete: (id: string) => {
                      close();
                      void deleteWithUndo(id);
                    },
                    onCopy: (values: FormValues) => {
                      const { occurredOn: _ignored, ...rest } = values;
                      dirtyRef.current = false;
                      setState({ kind: "create", preset: rest, key: ++keyRef.current });
                    },
                  }
                : {})}
            />
          </DialogContent>
        ) : null}
      </Dialog>
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title={t("unsavedTitle")}
        body={t("unsavedBody")}
        confirmLabel={t("discard")}
        cancelLabel={t("keepEditing")}
        onConfirm={close}
      />
    </TransactionDialogContext>
  );
}
