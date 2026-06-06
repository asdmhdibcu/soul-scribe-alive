import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Plan = "free" | "soul" | "family" | "legacy";

export const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  soul: 1,
  family: 2,
  legacy: 3,
};

export function hasPlan(current: Plan | null | undefined, required: Plan) {
  if (!current) return false;
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

export type FeatureKey =
  | "memory_search"
  | "becoming"
  | "timeline"
  | "weekly_reports"
  | "future_self"
  | "unlimited_vault"
  | "unlimited_media"
  | "family"
  | "legacy_letters"
  | "life_book";

export const FEATURE_REQUIRES: Record<FeatureKey, Plan> = {
  memory_search: "soul",
  becoming: "soul",
  timeline: "soul",
  weekly_reports: "soul",
  future_self: "soul",
  unlimited_vault: "soul",
  unlimited_media: "soul",
  family: "family",
  legacy_letters: "family",
  life_book: "legacy",
};

// Free plan storage limits
export const FREE_LIMITS = {
  vault_days: 90,
  photos: 50,
  voice: 20,
};

export function usePlan() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (!cancelled) {
          setPlan(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("plan")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (!cancelled) {
        setPlan(((data?.plan as Plan) ?? "free") as Plan);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { plan, loading, can: (f: FeatureKey) => hasPlan(plan, FEATURE_REQUIRES[f]) };
}
