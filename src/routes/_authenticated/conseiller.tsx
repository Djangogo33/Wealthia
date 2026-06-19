import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/strings";

export const Route = createFileRoute("/_authenticated/conseiller")({
  component: () => {
    const { t } = useTranslation();
    return (
      <div className="mx-auto max-w-3xl px-5 pt-8">
        <h1 className="text-4xl font-semibold tracking-tight">Conseiller IA</h1>
        <div className="card-surface mt-6 p-6">
          <div className="label-caps">{t("stub.soon")}</div>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t("stub.soonDesc")}</p>
        </div>
      </div>
    );
  },
});
