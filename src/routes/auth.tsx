import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRecoveryCode, deriveKeys } from "@/lib/crypto";
import {
  provisionKeys,
  signInAndUnlock,
  recoverWithCode,
  finishRecovery,
} from "@/lib/vault-session";
import {
  AuthShell,
  AuthField,
  authInputClass,
  GoldButton,
  InlineError,
} from "@/components/auth/AuthShell";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "recover"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — ALIVE" },
      {
        name: "description",
        content: "Sign in to ALIVE — your private, end-to-end encrypted diary.",
      },
      { property: "og:title", content: "Sign in — ALIVE" },
      {
        property: "og:description",
        content: "Sign in to ALIVE — your private, end-to-end encrypted diary.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const EMAIL_TAKEN =
  "An account with this email already exists. Sign in instead, or use your recovery code.";

/** Turns Supabase auth errors into plain messages. */
function friendlyAuthError(message: string, invalidCredentials = "Email or password is incorrect.") {
  if (/invalid login credentials/i.test(message)) return invalidCredentials;
  if (/already registered|already exists/i.test(message)) return EMAIL_TAKEN;
  if (/email not confirmed/i.test(message)) return "Check your inbox to confirm your email first.";
  return message;
}

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
  const mode = search.mode ?? "signin";
  const go = (m: "signin" | "signup" | "recover") =>
    navigate({ to: "/auth", search: { mode: m } });

  if (mode === "signup") return <SignUpForm onSwitch={() => go("signin")} />;
  if (mode === "recover") return <RecoverForm onSwitch={() => go("signin")} />;
  return <SignInForm onSwitch={() => go("signup")} onRecover={() => go("recover")} />;
}

/* =================== SIGN IN =================== */

function SignInForm({ onSwitch, onRecover }: { onSwitch: () => void; onRecover: () => void }) {
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
      const user = await signInAndUnlock(email, password);
      const to = await routeAfterAuth(user.id);
      navigate({ to });
    } catch (e) {
      setError(e instanceof Error ? friendlyAuthError(e.message) : "Could not sign in.");
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
          <button
            type="button"
            onClick={onRecover}
            className="text-xs text-gold hover:text-gold-light tracking-wider"
          >
            Forgot password? Use your recovery code
          </button>
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
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      // Derived on-device. The typed password never leaves this browser.
      const { authPassword } = await deriveKeys(email, password);

      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password: authPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { name: name.trim() },
        },
      });
      if (err) throw new Error(friendlyAuthError(err.message));
      // Supabase hides existing emails: it returns a user with no identities.
      if (data.user && data.user.identities?.length === 0) throw new Error(EMAIL_TAKEN);

      let userId = data.user?.id ?? null;
      if (!data.session) {
        const { data: signedIn, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: authPassword,
        });
        if (signInErr) throw new Error(friendlyAuthError(signInErr.message, EMAIL_TAKEN));
        userId = signedIn.user?.id ?? userId;
      }
      if (!userId) throw new Error("Could not create account.");

      const { recoveryCode: code } = await provisionKeys(email, password, userId);
      setRecoveryCode(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  if (recoveryCode) {
    return (
      <RecoveryCodeStep code={recoveryCode} onDone={() => navigate({ to: "/onboarding" })} />
    );
  }

  return (
    <AuthShell
      title="Begin your story"
      subtitle="Encrypted on this device before it ever leaves."
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
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
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={authInputClass()}
          />
        </AuthField>

        <InlineError message={error} />

        <GoldButton loading={loading}>Begin My Story</GoldButton>
      </form>
    </AuthShell>
  );
}

/* =================== RECOVERY CODE STEP =================== */

function RecoveryCodeStep({ code, onDone }: { code: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const formatted = formatRecoveryCode(code);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-[14px] border border-gold/30 bg-card p-8 sm:p-10">
        <h1 className="font-display text-3xl text-gold-light">Your recovery code</h1>
        <p className="mt-3 text-muted-foreground">
          This is the only other way into your diary. Write it down somewhere safe.
        </p>

        <div className="mt-8 rounded-[14px] border border-gold/40 bg-background/60 p-6">
          <p className="font-mono text-lg sm:text-xl tracking-[0.18em] text-gold-light break-all text-center">
            {formatted}
          </p>
        </div>

        <button
          type="button"
          onClick={copy}
          className="mt-4 inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy code"}
        </button>

        <p className="mt-8 text-base leading-relaxed text-foreground/90">
          If you lose both your password and this code, your entries cannot be recovered by anyone,
          including us.
        </p>

        <label className="mt-8 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#C9A84C]"
          />
          <span className="text-sm text-foreground/90">I have saved my recovery code</span>
        </label>

        <div className="mt-8">
          <button
            type="button"
            disabled={!saved}
            onClick={onDone}
            className="w-full rounded-[14px] bg-gold px-6 py-3 font-display tracking-wide text-background transition-opacity disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

/* =================== RECOVERY SIGN-IN =================== */

function RecoverForm({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"code" | "password">("code");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recovery, setRecovery] = useState<{ masterKey: CryptoKey; verifier: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // No session needed: the code itself proves ownership.
      setRecovery(await recoverWithCode(email, code));
      setStep("password");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That recovery code did not work.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");
    if (newPassword !== confirm) return setError("Passwords do not match.");
    if (!recovery) return setError("Recovery session expired. Start again.");
    setLoading(true);
    try {
      const user = await finishRecovery(email, newPassword, recovery.masterKey, recovery.verifier);
      navigate({ to: await routeAfterAuth(user.id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set a new password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={step === "code" ? "Recovery code" : "Choose a new password"}
      subtitle={
        step === "code"
          ? "Your code unwraps the key to your diary."
          : "Your diary will be re-sealed with this password."
      }
      footer={
        <button
          type="button"
          onClick={onSwitch}
          className="text-gold hover:text-gold-light underline-offset-4 hover:underline transition-colors"
        >
          ← Back to sign in
        </button>
      }
    >
      {step === "code" ? (
        <form onSubmit={onSubmitCode} className="space-y-6">
          <AuthField label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={authInputClass()}
            />
          </AuthField>
          <AuthField label="Recovery code">
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              className={authInputClass("font-mono tracking-widest")}
            />
          </AuthField>
          <InlineError message={error} />
          <GoldButton loading={loading}>Unlock My Diary</GoldButton>
        </form>
      ) : (
        <form onSubmit={onSubmitPassword} className="space-y-6">
          <AuthField label="New password">
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={authInputClass()}
            />
          </AuthField>
          <AuthField label="Confirm password">
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={authInputClass()}
            />
          </AuthField>
          <InlineError message={error} />
          <GoldButton loading={loading}>Save New Password</GoldButton>
        </form>
      )}
    </AuthShell>
  );
}

/** Route away if a session already exists and the vault is unlocked. */
export function useRedirectIfSignedIn() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const to = await routeAfterAuth(data.session.user.id);
        navigate({ to });
      }
    });
  }, [navigate]);
}
