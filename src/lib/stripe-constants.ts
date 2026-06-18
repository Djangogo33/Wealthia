// Placeholder Stripe price IDs — replace with real IDs once a Stripe account is connected.
export const STRIPE_PRICES = {
  PRO_MONTHLY: "price_pro_monthly",
  PRO_YEARLY: "price_pro_yearly",
  MAX_MONTHLY: "price_max_monthly",
  MAX_YEARLY: "price_max_yearly",
} as const;

export type PlanTier = "free" | "pro" | "max";

export const PLAN_FEATURES: Record<
  string,
  { free: string; pro: string; max: string }
> = {
  manual_accounts: { free: "1", pro: "∞", max: "∞" },
  export_csv: { free: "✓", pro: "✓", max: "✓" },
  export_pdf_xlsx_json: { free: "—", pro: "✓", max: "✓" },
  open_banking: { free: "—", pro: "✓", max: "✓" },
  shared_budgets: { free: "—", pro: "2 pers.", max: "6 pers." },
  vault: { free: "—", pro: "500 Mo", max: "Illimité" },
  multi_currency: { free: "—", pro: "✓", max: "✓" },
  ai_advisor: { free: "—", pro: "—", max: "✓" },
  real_estate: { free: "—", pro: "—", max: "✓" },
};

// Locked features → minimum plan required
export const FEATURE_MIN_PLAN: Record<string, PlanTier> = {
  unlimited_accounts: "pro",
  export_pdf: "pro",
  export_xlsx: "pro",
  export_json: "pro",
  open_banking: "pro",
  shared_budgets: "pro",
  vault: "pro",
  multi_currency: "pro",
  ai_advisor: "max",
  real_estate: "max",
};

export const PLAN_RANK: Record<PlanTier, number> = { free: 0, pro: 1, max: 2 };
