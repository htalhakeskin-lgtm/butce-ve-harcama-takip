import { headers } from "next/headers";

import { exportUserData } from "@/features/settings/server";
import { todayIn } from "@/lib/dates";
import { getAuth } from "@/server/auth";
import { getDb } from "@/server/db";
import { logger } from "@/server/logger";

/**
 * UC-35 "Verilerimi indir". POST with the current password (BR-AUTH-006: sensitive actions ask for it again).
 * Responds with a JSON file.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = getAuth();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return Response.json({ error: { code: "unauthenticated" } }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  try {
    const { status } = await auth.api.verifyPassword({ body: { password }, headers: requestHeaders });
    if (!status) throw new Error("invalid password");
  } catch {
    return Response.json({ error: { code: "wrongPassword" } }, { status: 403 });
  }

  const timeZone = typeof session.user.timeZone === "string" ? session.user.timeZone : "Europe/Istanbul";
  const today = todayIn(timeZone);
  const data = await exportUserData(getDb(), session.user.id, today);
  logger.info("privacy.export", { userId: session.user.id });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="butce-verilerim-${today}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
