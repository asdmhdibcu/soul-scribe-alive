import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoldButton } from "@/components/auth/AuthShell";
import { GoldParticles } from "@/components/landing/atmos";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — ALIVE" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function complete() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase
        .from("users")
        .update({ onboarding_complete: true })
        .eq("id", u.user.id);
    }
    navigate({ to: "/today" });
  }

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-6 py-16 overflow-hidden isolate">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 30%, oklch(0.74 0.12 85 / 0.18), transparent 65%)",
        }}
      />
      <GoldParticles density={45} />

      <div className="relative max-w-xl text-center">
        <p className="text-[10px] uppercase tracking-[0.5em] text-gold/70 mb-6">
          Welcome
        </p>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight mb-6">
          You are <span className="italic text-gold-light">alive.</span>
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed mb-10">
          Tonight, we begin. Five minutes. One quiet conversation. A lifetime of
          knowing yourself.
        </p>

        <div className="mx-auto max-w-sm">
          <GoldButton type="button" loading={loading} onClick={complete}>
            Start My First Session
          </GoldButton>
        </div>
      </div>
    </div>
  );
}
