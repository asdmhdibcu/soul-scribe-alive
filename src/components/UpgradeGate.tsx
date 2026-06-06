import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type { Plan } from "@/lib/plan";

const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  soul: "Soul",
  family: "Family",
  legacy: "Legacy",
};

const PLAN_PRICE: Record<Plan, string> = {
  free: "Free",
  soul: "$9/mo",
  family: "$19/mo",
  legacy: "$39/mo",
};

export function UpgradeGate({
  feature,
  required,
  description,
}: {
  feature: string;
  required: Plan;
  description?: string;
}) {
  return (
    <div className="relative min-h-[60vh] flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-md w-full rounded-[20px] p-10 text-center"
        style={{
          background:
            "linear-gradient(180deg, rgba(28,28,40,0.95), rgba(18,18,28,0.95))",
          border: "1px solid rgba(240,201,106,0.35)",
          boxShadow: "0 30px 80px -30px rgba(240,201,106,0.35)",
        }}
      >
        <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center mb-6"
          style={{ background: "rgba(240,201,106,0.12)", border: "1px solid rgba(240,201,106,0.4)" }}
        >
          <Lock className="h-6 w-6 text-gold-light" strokeWidth={1.4} />
        </div>
        <p className="text-[10px] uppercase tracking-[0.5em] text-gold/70">
          {PLAN_LABEL[required]} · {PLAN_PRICE[required]}
        </p>
        <h2 className="mt-3 font-display text-3xl text-gold-light">{feature}</h2>
        {description && (
          <p className="mt-4 text-sm text-muted-foreground italic" style={{ fontFamily: "Georgia, serif" }}>
            {description}
          </p>
        )}
        <Link
          to="/pricing"
          className="mt-8 inline-flex items-center gap-2 rounded-[14px] bg-gradient-gold px-6 py-3 font-medium text-primary-foreground tracking-wide shadow-premium hover:scale-[1.02] transition-transform"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade to {PLAN_LABEL[required]}
        </Link>
      </motion.div>
    </div>
  );
}

export function InlineLock({
  required,
  label = "Soul",
}: {
  required: Plan;
  label?: string;
}) {
  return (
    <Link
      to="/pricing"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.25em] text-gold-light"
      style={{ border: "1px solid rgba(240,201,106,0.4)", background: "rgba(240,201,106,0.06)" }}
    >
      <Lock className="h-3 w-3" strokeWidth={1.6} />
      {PLAN_LABEL[required] ?? label}
    </Link>
  );
}
