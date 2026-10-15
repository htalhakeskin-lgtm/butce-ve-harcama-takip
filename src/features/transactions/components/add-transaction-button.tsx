"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, type ButtonProps } from "@/components/ui/button";

import { useTransactionDialog } from "./transaction-dialog";

export function AddTransactionButton(props: Omit<ButtonProps, "onClick">) {
  const t = useTranslations("nav");
  const { openNew, canEdit } = useTransactionDialog();
  if (!canEdit) return null;
  return (
    <Button onClick={() => openNew()} {...props}>
      <Plus /> {t("addTransaction")}
    </Button>
  );
}
