"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children, nonce }: { children: ReactNode; nonce?: string | undefined }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...(nonce ? { nonce } : {})}
    >
      {children}
      <Toaster
        position="top-center"
        closeButton
        toastOptions={{
          classNames: {
            toast: "!bg-surface !text-foreground !border-border",
            description: "!text-muted-foreground",
            actionButton: "!bg-accent !text-accent-foreground",
          },
        }}
      />
    </ThemeProvider>
  );
}
