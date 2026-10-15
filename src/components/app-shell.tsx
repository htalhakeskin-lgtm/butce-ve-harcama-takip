"use client";

import {
  ArrowLeftRight,
  ChartPie,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  Settings,
  Tags,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";

import { useTransactionDialog } from "@/features/transactions/components/transaction-dialog";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import type { Theme } from "@/lib/domain-constants";

import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type NavItem = { href: string; label: string; icon: LucideIcon };

function useNav(): { primary: NavItem[]; secondary: NavItem[] } {
  const t = useTranslations("nav");
  return {
    primary: [
      { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
      { href: "/transactions", label: t("transactions"), icon: ArrowLeftRight },
      { href: "/accounts", label: t("accounts"), icon: Wallet },
      { href: "/budgets", label: t("budgets"), icon: PiggyBank },
      { href: "/reports", label: t("reports"), icon: ChartPie },
    ],
    secondary: [
      { href: "/categories", label: t("categories"), icon: Tags },
      { href: "/settings", label: t("settings"), icon: Settings },
    ],
  };
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Applies the theme stored on the account when it differs from this browser's (UC-37). */
function ThemeSync({ theme }: { theme: Theme }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);
  return null;
}

export function AppShell({
  demo = false,
  appName,
  userName,
  email,
  theme,
  children,
}: {
  /** Demo server: a thin strip tells visitors the data is sample data. */
  demo?: boolean;
  appName: string;
  userName: string;
  email: string;
  theme: Theme;
  children: ReactNode;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const tDemo = useTranslations("demo");
  const pathname = usePathname();
  const router = useRouter();
  const { primary, secondary } = useNav();
  const { openNew, canEdit } = useTransactionDialog();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const navLink = (item: NavItem, onClick?: () => void) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
          active
            ? "bg-accent-soft text-foreground"
            : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        )}
      >
        <item.icon aria-hidden className={cn("size-5", active && "text-accent")} />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-dvh lg:pl-64">
      <ThemeSync theme={theme} />
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {tc("skipToContent")}
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="px-5 py-5 text-lg font-bold tracking-tight">{appName}</div>
        {canEdit ? (
          <div className="px-3 pb-3">
            <Button className="w-full" onClick={() => openNew()}>
              <Plus /> {t("addTransaction")}
            </Button>
          </div>
        ) : null}
        <nav aria-label={t("mainNavigation")} className="flex flex-1 flex-col gap-1 px-3">
          {primary.map((item) => navLink(item))}
          <div className="my-2 h-px bg-border" />
          {secondary.map((item) => navLink(item))}
        </nav>
        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-muted"
              aria-label={t("userMenu")}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {userName.slice(0, 1).toLocaleUpperCase("tr-TR")}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{userName}</span>
                <span className="block truncate text-xs text-muted-foreground">{email}</span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings /> {t("settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                <LogOut /> {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <span className="text-base font-bold tracking-tight">{appName}</span>
      </header>

      {demo ? (
        <div role="note" className="bg-info-soft px-4 py-2 text-center text-xs font-medium text-info sm:text-sm">
          {tDemo("banner")}
        </div>
      ) : null}
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-4 pb-28 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
        {children}
      </main>

      {/* Mobile bottom navigation (NFR-03) */}
      <nav
        aria-label={t("mainNavigation")}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {[primary[0]!, primary[1]!].map((item) => (
          <BottomLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <div className="flex items-center justify-center">
          {canEdit ? (
            <button
              type="button"
              onClick={() => openNew()}
              aria-label={t("addTransaction")}
              className="-mt-5 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg"
            >
              <Plus className="size-7" />
            </button>
          ) : null}
        </div>
        <BottomLink item={primary[4]!} active={isActive(pathname, primary[4]!.href)} />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
        >
          <Menu aria-hidden className="size-5" />
          {t("menu")}
        </button>
      </nav>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        {menuOpen ? (
          <DialogContent title={t("menu")} closeLabel={tc("close")}>
            <nav aria-label={t("mainNavigation")} className="flex flex-col gap-1">
              {[primary[2]!, primary[3]!, ...secondary].map((item) => navLink(item, () => setMenuOpen(false)))}
              <div className="my-2 h-px bg-border" />
              <div className="px-3 py-2 text-sm">
                <div className="font-medium">{userName}</div>
                <div className="text-muted-foreground">{email}</div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <LogOut aria-hidden className="size-5" /> {t("signOut")}
              </button>
            </nav>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-16 flex-col items-center justify-center gap-1 text-xs",
        active ? "font-medium text-accent" : "text-muted-foreground",
      )}
    >
      <item.icon aria-hidden className="size-5" />
      {item.label}
    </Link>
  );
}
