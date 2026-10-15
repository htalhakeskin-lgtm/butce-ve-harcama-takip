import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}

export function FormAlert({ tone = "danger", children }: { tone?: "danger" | "info" | "success"; children: ReactNode }) {
  const classes = {
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`mb-4 rounded-md px-3 py-2.5 text-sm ${classes}`}>
      {children}
    </div>
  );
}
