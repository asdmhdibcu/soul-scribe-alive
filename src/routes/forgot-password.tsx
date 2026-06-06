import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthShell,
  AuthField,
  authInputClass,
  GoldButton,
  InlineError,
} from "@/components/auth/AuthShell";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — ALIVE" },
      { name: "description", content: "Send a reset link for your ALIVE account." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send reset link.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="A note has been sent"
        subtitle="The path back is in your inbox."
        footer={
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="text-gold hover:text-gold-light"
          >
            ← Back to sign in
          </Link>
        }
      >
        <p className="font-display text-xl text-foreground/90 leading-relaxed">
          Check your inbox.
          <br />
          <span className="italic text-muted-foreground">Your story is waiting.</span>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Find your way back"
      subtitle="We'll send a reset link to your email."
      footer={
        <Link
          to="/auth"
          search={{ mode: "signin" }}
          className="text-gold hover:text-gold-light"
        >
          ← Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <AuthField label="Email">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={authInputClass()}
          />
        </AuthField>

        <InlineError message={error} />

        <GoldButton loading={loading}>Send Reset Link</GoldButton>
      </form>
    </AuthShell>
  );
}
