import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "@/lib/strings";
import { LegalFooter } from "@/components/legal-footer";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[720px] px-5 pt-6 pb-4">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--gold)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("legal.back")}
        </Link>
        <h1 className="mb-2 text-2xl font-semibold text-[var(--gold)]">{title}</h1>
        <p className="mb-8 text-xs text-[var(--muted-foreground)]">{t("legal.lastUpdated")}</p>
        <div className="legal-prose space-y-6 text-sm leading-relaxed text-[var(--foreground)]/90">
          {children}
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--gold)]">
        {title}
      </h2>
      <div className="space-y-2 whitespace-pre-line">{children}</div>
    </section>
  );
}
