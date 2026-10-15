"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Combine,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ColorIcon } from "@/components/category-badge";
import { ColorPicker } from "@/components/color-picker";
import { EmptyState } from "@/components/empty-state";
import { ICON_NAMES, Icon } from "@/components/icon";
import { useLedger } from "@/components/ledger-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/cn";
import type { CategoryKind, PaletteColor } from "@/lib/domain-constants";
import { newId } from "@/lib/ids";
import { can } from "@/lib/permissions";
import { useErrorText } from "@/lib/use-error-text";

import {
  archiveCategoryAction,
  categoryUsageAction,
  createCategoryAction,
  deleteCategoryAction,
  mergeCategoryAction,
  moveCategoryAction,
  updateCategoryAction,
} from "../actions";
import type { CategoryView } from "../server";

type Editing = { mode: "create"; parentId: string | null } | { mode: "edit"; category: CategoryView };

type Result = { ok: true } | { ok: false; error: { code: string } };

/** UC-10: two-level category tree per kind (BR-CAT-001…007). */
export function CategoriesManager({
  categories,
  kind,
  showArchived,
}: {
  categories: CategoryView[];
  kind: CategoryKind;
  showArchived: boolean;
}) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const router = useRouter();
  const { role } = useLedger();
  const canEdit = can.edit(role);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryView | null>(null);
  const [mergeSource, setMergeSource] = useState<CategoryView | null>(null);

  const ofKind = categories.filter((c) => c.kind === kind && (showArchived || !c.archived));
  const parents = ofKind.filter((c) => !c.parentId);

  async function run(promise: Promise<Result | { ok: true; data: unknown }>, success: string): Promise<boolean> {
    const result = await promise;
    if (!result.ok) {
      toast.error(errorText(result.error.code));
      return false;
    }
    toast.success(success);
    return true;
  }

  async function askDelete(category: CategoryView) {
    const usage = await categoryUsageAction({ id: category.id });
    if (!usage.ok) {
      toast.error(errorText(usage.error.code));
      return;
    }
    if (usage.data.children > 0) {
      toast.error(errorText("BR-CAT-004-hasChildren"));
      return;
    }
    if (usage.data.lines > 0) {
      // BR-CAT-004: a used category is merged instead of deleted.
      toast.info(errorText("BR-CAT-004"));
      setMergeSource(category);
      return;
    }
    setDeleteTarget(category);
  }

  const query = (k: CategoryKind, archived: boolean) => `/categories?kind=${k}${archived ? "&archived=1" : ""}`;

  const row = (category: CategoryView, isChild: boolean) => (
    <div className={cn("flex items-center gap-3 px-3 py-2.5 sm:px-4", isChild && "pl-10 sm:pl-14")}>
      <ColorIcon icon={category.icon} color={category.color} size={isChild ? "sm" : "md"} />
      <Link
        href={`/transactions?range=thisYear&category=${category.id}`}
        className={cn("min-w-0 flex-1 truncate hover:text-accent", !isChild && "font-medium")}
      >
        {category.name}
      </Link>
      {category.archived ? <Badge>{tc("archived")}</Badge> : null}
      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`${category.name}: ${tc("actions")}`}>
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setEditing({ mode: "edit", category })}>
              <Pencil /> {tc("edit")}
            </DropdownMenuItem>
            {!isChild && !category.archived ? (
              <DropdownMenuItem onSelect={() => setEditing({ mode: "create", parentId: category.id })}>
                <Plus /> {t("addSub")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href={`/transactions?range=thisYear&category=${category.id}`}>
                <List /> {t("viewTransactions")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void run(moveCategoryAction({ id: category.id, direction: "up" }), t("updated"))}
            >
              <ArrowUp /> {t("moveUp")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void run(moveCategoryAction({ id: category.id, direction: "down" }), t("updated"))}
            >
              <ArrowDown /> {t("moveDown")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setMergeSource(category)}>
              <Combine /> {t("merge")}
            </DropdownMenuItem>
            {category.archived ? (
              <DropdownMenuItem
                onSelect={() =>
                  void run(archiveCategoryAction({ id: category.id, archived: false }), t("unarchivedToast"))
                }
              >
                <ArchiveRestore /> {tc("unarchive")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() =>
                  void run(archiveCategoryAction({ id: category.id, archived: true }), t("archivedToast"))
                }
              >
                <Archive /> {tc("archive")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem tone="danger" onSelect={() => void askDelete(category)}>
              <Trash2 /> {tc("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("title")} className="inline-flex rounded-lg bg-surface-muted p-1">
          {(["expense", "income"] as const).map((k) => (
            <Link
              key={k}
              href={query(k, showArchived)}
              role="tab"
              aria-selected={kind === k}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-4 text-sm font-medium",
                kind === k ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`kinds.${k}`)}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showArchived} onChange={() => router.push(query(kind, !showArchived))} />
            {t("showArchived")}
          </label>
          {canEdit ? (
            <Button onClick={() => setEditing({ mode: "create", parentId: null })}>
              <Plus /> {t("add")}
            </Button>
          ) : null}
        </div>
      </div>

      {parents.length === 0 ? (
        <EmptyState title={t("emptyTitle")} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {parents.map((parent) => (
            <li key={parent.id}>
              {row(parent, false)}
              {ofKind
                .filter((c) => c.parentId === parent.id)
                .map((child) => (
                  <div key={child.id} className="border-t border-border/60">
                    {row(child, true)}
                  </div>
                ))}
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <CategoryFormDialog editing={editing} kind={kind} categories={categories} onClose={() => setEditing(null)} />
      ) : null}
      {mergeSource ? (
        <MergeDialog source={mergeSource} categories={categories} onClose={() => setMergeSource(null)} />
      ) : null}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await run(deleteCategoryAction({ id: deleteTarget.id }), t("deletedToast"));
          setDeleteTarget(null);
        }}
      />
    </>
  );
}

function CategoryFormDialog({
  editing,
  kind,
  categories,
  onClose,
}: {
  editing: Editing;
  kind: CategoryKind;
  categories: CategoryView[];
  onClose: () => void;
}) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const existing = editing.mode === "edit" ? editing.category : null;
  const [id] = useState(() => existing?.id ?? newId());
  const initialParent = existing ? existing.parentId : editing.mode === "create" ? editing.parentId : null;
  const parentCategory = categories.find((c) => c.id === initialParent);
  const [name, setName] = useState(existing?.name ?? "");
  const [parentId, setParentId] = useState<string | null>(initialParent);
  const [color, setColor] = useState<PaletteColor>(
    (existing?.color ?? parentCategory?.color ?? "blue") as PaletteColor,
  );
  const [icon, setIcon] = useState(existing?.icon ?? parentCategory?.icon ?? "tag");
  const [errors, setErrors] = useState<{ name?: string; parentId?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const categoryKind = existing?.kind ?? kind;
  const hasChildren = existing ? categories.some((c) => c.parentId === existing.id) : false;
  const parentOptions = categories.filter(
    (c) => c.kind === categoryKind && !c.parentId && !c.archived && c.id !== existing?.id,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setErrors({ name: errorText("required") });
      return;
    }
    setPending(true);
    const result = existing
      ? await updateCategoryAction({ id, version: existing.version, name, parentId, color, icon })
      : await createCategoryAction({ id, kind: categoryKind, name, parentId, color, icon });
    setPending(false);
    if (!result.ok) {
      const fields = result.error.fieldErrors ?? {};
      const next: typeof errors = {};
      if (fields.name?.[0]) next.name = errorText(fields.name[0]);
      if (fields.parentId?.[0]) next.parentId = errorText(fields.parentId[0]);
      if (!next.name && !next.parentId) next.form = errorText(result.error.code);
      setErrors(next);
      return;
    }
    toast.success(existing ? t("updated") : t("created"));
    onClose();
  }

  const formId = "category-form";
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
          <Field id="category-name" label={t("fields.name")} error={errors.name}>
            <Input
              id="category-name"
              value={name}
              maxLength={40}
              autoFocus
              aria-invalid={!!errors.name}
              aria-describedby={describedBy("category-name", errors.name)}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field id="category-parent" label={t("fields.parent")} error={errors.parentId}>
            <Select
              id="category-parent"
              value={parentId ?? ""}
              disabled={hasChildren}
              onChange={(e) => setParentId(e.target.value || null)}
            >
              <option value="">{t("fields.noParent")}</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <ColorPicker id="category-color" label={t("fields.color")} value={color} onChange={setColor} />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{t("fields.icon")}</legend>
            <div role="radiogroup" aria-label={t("fields.icon")} className="grid grid-cols-6 gap-2 sm:grid-cols-10">
              {ICON_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={icon === name}
                  aria-label={name}
                  onClick={() => setIcon(name)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-md border",
                    icon === name
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-muted-foreground hover:bg-surface-muted",
                  )}
                >
                  <Icon name={name} className="size-4" />
                </button>
              ))}
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MergeDialog({
  source,
  categories,
  onClose,
}: {
  source: CategoryView;
  categories: CategoryView[];
  onClose: () => void;
}) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const targets = categories.filter(
    (c) => c.kind === source.kind && c.id !== source.id && !c.archived && c.parentId !== source.id,
  );
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const label = (c: CategoryView) => {
    const parent = categories.find((p) => p.id === c.parentId);
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };

  async function merge() {
    setPending(true);
    const result = await mergeCategoryAction({ sourceId: source.id, targetId });
    setPending(false);
    if (!result.ok) {
      toast.error(errorText(result.error.code));
      return;
    }
    toast.success(t("mergedToast"));
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={t("mergeTitle")}
        description={t("mergeHint", { name: source.name })}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button variant="danger" onClick={merge} loading={pending} disabled={!targetId}>
              {t("mergeConfirm")}
            </Button>
          </>
        }
      >
        <Field id="merge-target" label={t("fields.target")}>
          <Select id="merge-target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            {targets.map((c) => (
              <option key={c.id} value={c.id}>
                {label(c)}
              </option>
            ))}
          </Select>
        </Field>
      </DialogContent>
    </Dialog>
  );
}
