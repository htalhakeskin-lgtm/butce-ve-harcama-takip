import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { notFound } from "next/navigation";

import { serverEnv } from "@/env";
import { DEV_MAIL_DIR } from "@/server/email/transport";

type Mail = { to: string; subject: string; text: string; sentAt: string; kind: string };

/**
 * Local mailbox for EMAIL_TRANSPORT=file (K-18: development works without a mail provider).
 * Never available in production.
 */
export default async function DevMailPage() {
  if (process.env.NODE_ENV === "production" || serverEnv().EMAIL_TRANSPORT !== "file") notFound();
  const files = (await readdir(DEV_MAIL_DIR).catch(() => [] as string[]))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, 30);
  const mails = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(DEV_MAIL_DIR, f), "utf8")) as Mail),
  );
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Geliştirme e-posta kutusu</h1>
      <p className="mt-1 text-sm text-muted-foreground">EMAIL_TRANSPORT=file · son 30 e-posta</p>
      <ul className="mt-6 flex flex-col gap-4">
        {mails.map((mail) => (
          <li key={mail.sentAt + mail.to} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm text-muted-foreground">
              {mail.sentAt} · {mail.to}
            </div>
            <div className="font-semibold">{mail.subject}</div>
            <pre className="mt-2 text-sm break-words whitespace-pre-wrap">
              {mail.text.split(/(https?:\/\/\S+)/).map((part, i) =>
                /^https?:\/\//.test(part) ? (
                  <a key={i} href={part} className="text-accent underline">
                    {part}
                  </a>
                ) : (
                  part
                ),
              )}
            </pre>
          </li>
        ))}
      </ul>
    </main>
  );
}
