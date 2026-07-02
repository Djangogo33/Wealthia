import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/strings";

const STORAGE_KEY = "wealthia_analytics_consent";

export function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const choice = window.localStorage.getItem(STORAGE_KEY);
    if (!choice) setVisible(true);
  }, []);

  function decide(v: "accepted" | "refused") {
    window.localStorage.setItem(STORAGE_KEY, v);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 bottom-20 left-3 right-3 lg:left-auto lg:right-6 lg:bottom-6 lg:max-w-sm rounded-2xl border p-4 shadow-2xl"
      style={{ background: "#131A10", borderColor: "var(--gold)" }}
      role="dialog"
      aria-live="polite"
    >
      <div className="flex gap-2 text-sm text-[var(--foreground)]">
        <span aria-hidden>🍪</span>
        <div>
          <div className="font-medium">{t("legal.cookieTitle")}</div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            {t("legal.cookieBody")}{" "}
            <Link to="/legal/confidentialite" className="text-[var(--gold)] underline">
              {t("legal.cookieLearnMore")}
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => decide("refused")}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          {t("legal.cookieRefuse")}
        </button>
        <button
          onClick={() => decide("accepted")}
          className="rounded-lg bg-[var(--gold)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)]"
        >
          {t("legal.cookieAccept")}
        </button>
      </div>
    </div>
  );
}
