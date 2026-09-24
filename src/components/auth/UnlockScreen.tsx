import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { clearMasterKey } from "@/lib/crypto";
import { unlockWithPassword } from "@/lib/vault-session";
import { AuthShell, AuthField, authInputClass, GoldButton, InlineError } from "./AuthShell";

/**
 * Shown when the session is still signed in but the master key is not in
 * memory (page reload, new tab). The diary stays sealed until the password
 * is entered on this device.
 */
export function UnlockScreen({ email }: { email: string }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await unlockWithPassword(email, password);
    } catch {
      setError("That password did not unlock your diary.");
    } finally {
      setLoading(false);
    }
  }

  async function useRecoveryCode() {
    clearMasterKey();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "recover" } });
  }

  return (
    <AuthShell
      title="Your diary is locked"
      subtitle="Enter your password to unlock it on this device."
      footer={
        <button
          type="button"
          onClick={useRecoveryCode}
          className="text-gold hover:text-gold-light underline-offset-4 hover:underline transition-colors"
        >
          Forgot password? Use your recovery code
        </button>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <p className="text-sm text-muted-foreground">{email}</p>
        <AuthField label="Password">
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass()}
          />
        </AuthField>
        <InlineError message={error} />
        <GoldButton loading={loading}>Unlock</GoldButton>
      </form>
    </AuthShell>
  );
}
