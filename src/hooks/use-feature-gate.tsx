import { useState, useCallback } from "react";
import { useAuth } from "./use-auth";
import { FEATURE_MIN_PLAN, PLAN_RANK, type PlanTier } from "@/lib/stripe-constants";

export function useFeatureGate(feature: keyof typeof FEATURE_MIN_PLAN) {
  const { profile } = useAuth();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const required: PlanTier = FEATURE_MIN_PLAN[feature] ?? "pro";
  const current: PlanTier = profile?.plan ?? "free";
  const allowed = PLAN_RANK[current] >= PLAN_RANK[required];

  const check = useCallback(() => {
    if (!allowed) {
      setPaywallOpen(true);
      return false;
    }
    return true;
  }, [allowed]);

  return { allowed, check, paywallOpen, setPaywallOpen, required };
}
