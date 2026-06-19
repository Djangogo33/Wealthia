import { useTranslation } from "@/lib/strings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STRIPE_PRICES, type PlanTier } from "@/lib/stripe-constants";
import { Check, Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  requiredPlan?: PlanTier;
};

const PLAN_LINES: Record<PlanTier, string[]> = {
  free: ["1 compte manuel", "Export CSV"],
  pro: ["Comptes illimités", "Open Banking", "Export PDF / XLSX / JSON", "Budgets partagés (2 pers.)", "Coffre-fort 500 Mo", "Multi-devises"],
  max: ["Tout Pro", "IA patrimoniale", "Immobilier & emprunts", "Budgets partagés (6 pers.)", "Coffre-fort illimité"],
};

export function PaywallModal({ open, onOpenChange, requiredPlan = "pro" }: Props) {
  const { t } = useTranslation();
  async function checkout(priceId: string) {
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch (e) {
      console.error(e);
    }
  }
  const planLabel = t(`paywall.${requiredPlan}`);
  const monthlyPrice = requiredPlan === "max" ? STRIPE_PRICES.MAX_MONTHLY : STRIPE_PRICES.PRO_MONTHLY;
  const yearlyPrice = requiredPlan === "max" ? STRIPE_PRICES.MAX_YEARLY : STRIPE_PRICES.PRO_YEARLY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="card-surface max-w-md border-0">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[var(--gold)]">
            <Sparkles className="h-4 w-4" /><span className="label-caps text-[var(--gold)]">{planLabel}</span>
          </div>
          <DialogTitle className="text-2xl font-semibold">{t("paywall.title")}</DialogTitle>
          <DialogDescription className="text-[var(--muted-foreground)]">{t("paywall.subtitle")}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 py-2">
          {PLAN_LINES[requiredPlan].map((l) => (
            <li key={l} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-[var(--success)]" /> {l}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => checkout(monthlyPrice)} className="bg-[var(--gold)] text-[var(--primary-foreground)] hover:opacity-90">
            {t("paywall.upgrade", { plan: planLabel })} {t("paywall.monthly")}
          </Button>
          <Button variant="outline" onClick={() => checkout(yearlyPrice)} className="border-[var(--border)]">
            {t("paywall.upgrade", { plan: planLabel })} {t("paywall.yearly")}
          </Button>
          <button onClick={() => onOpenChange(false)} className="mt-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            {t("paywall.later")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
