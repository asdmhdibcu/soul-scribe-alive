import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { GoldParticles } from "@/components/landing/atmos";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — ALIVE" },
      {
        name: "description",
        content:
          "ALIVE is a Life Archive for individuals and families. Choose a plan to preserve and understand your life.",
      },
      { property: "og:title", content: "Pricing — ALIVE" },
      {
        property: "og:description",
        content: "A system for preserving and understanding a life.",
      },
    ],
  }),
  component: PricingPage,
});

type Tier = {
  id: "free" | "soul" | "family";
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  badge?: string;
  features: string[];
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "Free forever",
    tagline: "Everything you write, kept.",
    features: [
      "Unlimited writing, your whole history",
      "Voice notes transcribed on your device",
      "500 MB for photos, files and recordings",
      "Search your entries",
      "All AI features with your own AI key",
      "End-to-end encryption",
    ],
  },
  {
    id: "soul",
    name: "Soul",
    price: "$9",
    cadence: "per month",
    tagline: "The AI, with nothing to set up.",
    badge: "Most Popular",
    highlight: true,
    features: [
      "Everything in Free",
      "AI included: no key needed",
      "Morning brief, Ask, Coach, Timeline, Insights",
      "20 GB of storage",
    ],
  },
  {
    id: "family",
    name: "Family",
    price: "$19",
    cadence: "per month · coming later",
    tagline: "A life remembered together.",
    features: ["Everything in Soul", "Legacy letters", "Family capsules"],
  },
];

function PricingPage() {
  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-foreground overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 10%, oklch(0.74 0.12 85 / 0.10), transparent 65%), radial-gradient(ellipse 100% 80% at 50% 110%, oklch(0 0 0 / 0.9), transparent 60%)",
        }}
      />
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-60">
        <GoldParticles density={28} />
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <div className="text-center max-w-2xl mx-auto">
          <Link to="/" className="font-display text-lg tracking-[0.4em] text-gold">
            ALIVE
          </Link>
          <p className="mt-8 text-[10px] uppercase tracking-[0.5em] text-gold/70">A Life Archive</p>
          <h1 className="mt-4 font-display text-4xl md:text-5xl text-gold-light tracking-tight">
            Preserve and understand a life.
          </h1>
          <p
            className="mt-5 text-base md:text-lg text-muted-foreground italic"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Not a journal. Not a productivity app. A system for the life you're actually living —
            and the one you'll one day leave behind.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 * i }}
              className="relative rounded-[20px] p-7 flex flex-col"
              style={{
                background: tier.highlight
                  ? "linear-gradient(180deg, rgba(40,32,12,0.95), rgba(20,18,12,0.95))"
                  : "linear-gradient(180deg, rgba(24,24,32,0.9), rgba(14,14,20,0.9))",
                border: tier.highlight
                  ? "1px solid rgba(240,201,106,0.55)"
                  : "1px solid rgba(255,255,255,0.06)",
                boxShadow: tier.highlight
                  ? "0 30px 80px -30px rgba(240,201,106,0.4)"
                  : "0 20px 60px -30px rgba(0,0,0,0.6)",
              }}
            >
              {tier.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.3em] bg-gradient-gold text-primary-foreground"
                  style={{ boxShadow: "0 10px 30px -10px rgba(240,201,106,0.6)" }}
                >
                  {tier.badge}
                </div>
              )}
              <h3 className="font-display text-2xl text-gold-light">{tier.name}</h3>
              <p
                className="mt-1 text-sm text-muted-foreground italic"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {tier.tagline}
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-4xl text-gold-light">{tier.price}</span>
                <span className="text-xs text-muted-foreground">{tier.cadence}</span>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm text-foreground/85 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 text-gold-light shrink-0" strokeWidth={2} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-sm font-medium tracking-wide opacity-80 cursor-not-allowed"
                style={
                  tier.highlight
                    ? {
                        background:
                          "linear-gradient(135deg, oklch(0.83 0.13 88), oklch(0.74 0.12 85))",
                        color: "#0A0A0F",
                      }
                    : {
                        border: "1px solid rgba(240,201,106,0.35)",
                        color: "oklch(0.92 0.06 88)",
                      }
                }
              >
                <Sparkles className="h-4 w-4" />
                {tier.id === "free" ? "Current plan" : "Coming soon"}
              </button>
            </motion.div>
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground tracking-wide">
          Billing opens soon. Every plan keeps your story private and yours.{" "}
          <Link to="/transparency" className="underline underline-offset-4 hover:text-gold-light">
            How your data is handled
          </Link>
        </p>
      </div>
    </div>
  );
}
