import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthShell,
  AuthField,
  authInputClass,
  GoldButton,
  InlineError,
} from "@/components/auth/AuthShell";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — ALIVE" },
      {
        name: "description",
        content: "Sign in to ALIVE — your daily ritual of self-reflection.",
      },
    ],
  }),
  component: AuthPage,
});

async function routeAfterAuth(userId: string) {
  const { data } = await supabase
    .from("users")
    .select("onboarding_complete")
    .eq("id", userId)
    .maybeSingle();
  return data?.onboarding_complete ? "/today" : "/onboarding";
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");

  useEffect(() => {
    setMode(search.mode ?? "signin");
  }, [search.mode]);

  // If already signed in, route them onward.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const to = await routeAfterAuth(data.session.user.id);
        navigate({ to });
      }
    });
  }, [navigate]);

  return mode === "signin" ? (
    <SignInForm onSwitch={() => navigate({ to: "/auth", search: { mode: "signup" } })} />
  ) : (
    <SignUpForm onSwitch={() => navigate({ to: "/auth", search: { mode: "signin" } })} />
  );
}

/* =================== SIGN IN =================== */

function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      if (data.user) {
        const to = await routeAfterAuth(data.user.id);
        navigate({ to });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Continue where you left off."
      footer={
        <>
          New here?{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="text-gold hover:text-gold-light underline-offset-4 hover:underline transition-colors"
          >
            Start Your Story
          </button>
        </>
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

        <AuthField label="Password">
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={authInputClass("pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-gold transition-colors"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </AuthField>

        <div className="flex justify-end -mt-2">
          <Link
            to="/forgot-password"
            className="text-xs text-gold hover:text-gold-light tracking-wider"
          >
            Forgot password?
          </Link>
        </div>

        <InlineError message={error} />

        <GoldButton loading={loading}>Come Back Home</GoldButton>
      </form>
    </AuthShell>
  );
}

/* =================== SIGN UP =================== */

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { name: name.trim() },
        },
      });
      if (err) throw err;

      // If email confirmation is required, no session is returned.
      if (!data.session) {
        setSentMessage(
          "Check your inbox to confirm your email. Your story is waiting.",
        );
        return;
      }

      // Session exists → defaults already set by handle_new_user trigger.
      navigate({ to: "/onboarding" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  if (sentMessage) {
    return (
      <AuthShell title="One last thing" subtitle="A note has been sent your way.">
        <p className="font-display text-xl text-foreground/90 leading-relaxed">
          {sentMessage}
        </p>
        <div className="mt-8">
          <button
            type="button"
            onClick={onSwitch}
            className="text-sm text-gold hover:text-gold-light tracking-wider"
          >
            ← Back to sign in
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Begin your story"
      subtitle="Every life deserves to be remembered."
      footer={
        <>
          Already alive?{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="text-gold hover:text-gold-light underline-offset-4 hover:underline transition-colors"
          >
            Sign In
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <AuthField label="Full name">
          <input
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={authInputClass()}
          />
        </AuthField>

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

        <AuthField label="Password">
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className={authInputClass("pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-gold transition-colors"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </AuthField>

        <AuthField label="Confirm password">
          <input
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={authInputClass()}
          />
        </AuthField>

        <p className="text-xs text-muted-foreground italic leading-relaxed">
          By continuing you agree that your diary is yours — and ours to protect.
        </p>

        <InlineError message={error} />

        <GoldButton loading={loading}>Begin My Story</GoldButton>
      </form>
    </AuthShell>
  );
}
