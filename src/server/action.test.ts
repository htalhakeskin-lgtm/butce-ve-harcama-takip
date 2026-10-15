import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AppError } from "@/lib/result";
import type { RequestContext } from "@/server/context";

const getContext = vi.fn<() => Promise<RequestContext | null>>();
const revalidatePath = vi.fn();

vi.mock("@/server/context", () => ({ getContext: () => getContext() }));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => undefined }));

const { ledgerAction } = await import("./action");

function ctx(role: RequestContext["role"]): RequestContext {
  return {
    userId: "u1",
    userName: "Test",
    email: "t@example.com",
    locale: "tr",
    timeZone: "Europe/Istanbul",
    theme: "system",
    ledgerId: "l1",
    ledgerName: "Kişisel",
    currencyCode: "TRY",
    role,
    today: "2026-10-15",
  };
}

const schema = z.object({ name: z.string().min(1, { message: "required" }) });

describe("ledgerAction (api standard, BR-SYS-002/003)", () => {
  beforeEach(() => {
    getContext.mockReset();
    revalidatePath.mockReset();
  });

  it("rejects callers without a session", async () => {
    getContext.mockResolvedValue(null);
    const action = ledgerAction({ name: "t", schema, minRole: "viewer" }, async () => "ok");
    expect(await action({ name: "x" })).toEqual({ ok: false, error: { code: "unauthenticated" } });
  });

  it("BR-SYS-003: a viewer cannot run an editor action", async () => {
    getContext.mockResolvedValue(ctx("viewer"));
    const handler = vi.fn();
    const action = ledgerAction({ name: "t", schema, minRole: "editor" }, handler);
    expect(await action({ name: "x" })).toEqual({ ok: false, error: { code: "forbidden" } });
    expect(handler).not.toHaveBeenCalled();
  });

  it("maps validation issues to field errors", async () => {
    getContext.mockResolvedValue(ctx("owner"));
    const action = ledgerAction({ name: "t", schema, minRole: "editor" }, async () => "ok");
    expect(await action({ name: "" })).toEqual({
      ok: false,
      error: { code: "validation", fieldErrors: { name: ["required"] } },
    });
  });

  it("returns rule violations as their code, attached to the field", async () => {
    getContext.mockResolvedValue(ctx("editor"));
    const action = ledgerAction({ name: "t", schema, minRole: "editor" }, async () => {
      throw new AppError("BR-ACC-005", { field: "name" });
    });
    expect(await action({ name: "x" })).toEqual({
      ok: false,
      error: { code: "BR-ACC-005", fieldErrors: { name: ["BR-ACC-005"] } },
    });
  });

  it("hides unexpected errors behind an error id", async () => {
    getContext.mockResolvedValue(ctx("editor"));
    const action = ledgerAction({ name: "t", schema, minRole: "editor" }, async () => {
      throw new Error("database exploded");
    });
    const result = await action({ name: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unexpected");
      expect(result.error.errorId).toMatch(/^[0-9a-f-]{36}$/);
      expect(JSON.stringify(result)).not.toContain("exploded");
    }
  });

  it("refreshes screens after a write but not after a read", async () => {
    getContext.mockResolvedValue(ctx("editor"));
    await ledgerAction({ name: "w", schema, minRole: "editor" }, async () => 1)({ name: "x" });
    await ledgerAction({ name: "r", schema, minRole: "viewer", readOnly: true }, async () => 1)({ name: "x" });
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});
