import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { LEGAL_CONTENT, LEGAL_UPDATED, type LegalDoc } from "@/features/legal/content";
import { formatDay } from "@/lib/dates";

const DOCS: LegalDoc[] = ["privacy", "terms", "cookies"];

function isDoc(value: string): value is LegalDoc {
  return (DOCS as string[]).includes(value);
}

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isDoc(doc)) return {};
  const t = await getTranslations("legal");
  return { title: t(`${doc}Title`) };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isDoc(doc)) notFound();
  const t = await getTranslations("legal");
  const locale = await getLocale();
  return (
    <article className="w-full max-w-2xl rounded-xl border border-border bg-surface p-5 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t(`${doc}Title`)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("updated", { date: formatDay(LEGAL_UPDATED, locale, "long") })}
      </p>
      <p role="note" className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
        {t("draftNotice")}
      </p>
      {LEGAL_CONTENT[doc].map((section) => (
        <section key={section.heading} className="mt-6">
          <h2 className="text-lg font-semibold">{section.heading}</h2>
          {section.paragraphs.map((p) => (
            <p key={p} className="mt-2 leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
