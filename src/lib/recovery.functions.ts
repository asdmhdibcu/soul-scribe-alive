import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recoveryVerifierMatches, toBase64 } from "@/lib/crypto";

/**
 * Recovery for a person who has forgotten their password and has no session.
 *
 * The server never sees the recovery code, the password or any key. It sees:
 *  - a verifier derived from the code (checked against a stored SHA-256 hash),
 *  - the new *derived* auth password,
 *  - the master key re-wrapped on the device with the new password.
 */

const Email = z.string().trim().toLowerCase().email();

async function findAccount(email: string) {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!user) return null;
  const { data: keys } = await supabaseAdmin
    .from("user_keys")
    .select(
      "kdf_salt, kdf_iterations, wrapped_by_password, wrapped_by_recovery, recovery_verifier_hash",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  return keys ? { userId: user.id, keys } : null;
}

/** Deterministic decoy salt so unknown emails look like real ones. */
async function decoySalt(email: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "alive-decoy";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`salt:${email}`));
  return toBase64(new Uint8Array(mac).slice(0, 16));
}

const NOT_VERIFIED = "That email and recovery code do not match.";

/** Step 1: the salt needed to derive keys from the recovery code. */
export const getRecoveryParams = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ email: Email }).parse(data))
  .handler(async ({ data }) => {
    const account = await findAccount(data.email);
    if (!account) return { kdfSalt: await decoySalt(data.email), kdfIterations: 600_000 };
    return { kdfSalt: account.keys.kdf_salt, kdfIterations: account.keys.kdf_iterations };
  });

/** Step 2: prove the code; receive the master key wrapped by the code. */
export const beginRecovery = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: Email, verifier: z.string().min(40).max(64) }).parse(data),
  )
  .handler(async ({ data }) => {
    const account = await findAccount(data.email);
    if (!account || !account.keys.recovery_verifier_hash) {
      // Unknown email, or an account created before recovery verifiers existed.
      // Same message either way so this does not reveal which emails exist.
      throw new Error(NOT_VERIFIED);
    }
    if (!(await recoveryVerifierMatches(account.keys.recovery_verifier_hash, data.verifier))) {
      throw new Error(NOT_VERIFIED);
    }
    return { wrappedByRecovery: account.keys.wrapped_by_recovery };
  });

/** Step 3: set the new password and store the master key re-wrapped with it. */
export const completeRecovery = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        email: Email,
        verifier: z.string().min(40).max(64),
        newAuthPassword: z.string().min(40).max(64),
        wrappedByPassword: z.string().min(40).max(64),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const account = await findAccount(data.email);
    if (
      !account ||
      !(await recoveryVerifierMatches(account.keys.recovery_verifier_hash, data.verifier))
    ) {
      throw new Error(NOT_VERIFIED);
    }
    // Save the re-wrapped key first. If the password change then fails, put
    // the old wrapping back so the old password keeps working. The recovery
    // wrapping is never touched, so the code always works for another try.
    const { error: keyErr } = await supabaseAdmin
      .from("user_keys")
      .update({ wrapped_by_password: data.wrappedByPassword })
      .eq("user_id", account.userId);
    if (keyErr) throw new Error("Could not save your new key. Try again.");
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(account.userId, {
      password: data.newAuthPassword,
    });
    if (authErr) {
      await supabaseAdmin
        .from("user_keys")
        .update({ wrapped_by_password: account.keys.wrapped_by_password })
        .eq("user_id", account.userId);
      throw new Error("Could not set the new password. Try again.");
    }
    return { ok: true };
  });
