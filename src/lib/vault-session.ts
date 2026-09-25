import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  deriveKeys,
  deriveRecoveryWrappingKey,
  hasMasterKey,
  onMasterKeyChange,
  setMasterKey,
  unwrapKey,
  wrapKey,
  generateSalt,
  generateRecoveryCode,
  deriveRecoveryVerifier,
  hashRecoveryVerifier,
  normalizeRecoveryCode,
  KDF_ITERATIONS,
} from "@/lib/crypto";
import { getRecoveryParams, beginRecovery, completeRecovery } from "@/lib/recovery.functions";

export type UserKeysRow = {
  wrapped_by_password: string;
  wrapped_by_recovery: string;
  kdf_salt: string;
  kdf_iterations: number;
};

export async function fetchUserKeys(userId: string): Promise<UserKeysRow | null> {
  const { data } = await supabase
    .from("user_keys")
    .select("wrapped_by_password, wrapped_by_recovery, kdf_salt, kdf_iterations")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as UserKeysRow | null) ?? null;
}

/**
 * Signs in with the derived auth password and unlocks the vault.
 * If the account has no key yet (it was created while email confirmation
 * was pending, so sign-up could not store one), the key is created now and
 * the new recovery code is returned so the person can save it.
 */
export async function signInAndUnlock(email: string, password: string) {
  const { authPassword, wrappingKey } = await deriveKeys(email, password);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: authPassword,
  });
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error("Could not sign in.");
  const keys = await fetchUserKeys(user.id);
  if (!keys) {
    const { recoveryCode } = await provisionKeys(email, password, user.id);
    return { user, recoveryCode };
  }
  const masterKey = await unwrapKey(keys.wrapped_by_password, wrappingKey);
  setMasterKey(masterKey);
  return { user, recoveryCode: null as string | null };
}

/** Unlock an already-authenticated session (page refresh). */
export async function unlockWithPassword(email: string, password: string) {
  const { wrappingKey } = await deriveKeys(email, password);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in.");
  const keys = await fetchUserKeys(u.user.id);
  if (!keys) throw new Error("No encryption key found for this account.");
  const masterKey = await unwrapKey(keys.wrapped_by_password, wrappingKey);
  setMasterKey(masterKey);
}

/**
 * Recovery for someone who has forgotten their password (no session needed).
 * Step 1: prove the code and unwrap the master key on this device.
 */
export async function recoverWithCode(email: string, recoveryCode: string) {
  const code = normalizeRecoveryCode(recoveryCode);
  const { kdfSalt, kdfIterations } = await getRecoveryParams({ data: { email } });
  const verifier = await deriveRecoveryVerifier(code, kdfSalt, kdfIterations);
  const { wrappedByRecovery } = await beginRecovery({ data: { email, verifier } });
  const recoveryWrappingKey = await deriveRecoveryWrappingKey(code, kdfSalt, kdfIterations);
  const masterKey = await unwrapKey(wrappedByRecovery, recoveryWrappingKey);
  return { masterKey, verifier };
}

/**
 * Step 2: choose a new password. The master key is re-wrapped on this device;
 * the server only receives the derived auth password and the wrapped key.
 */
export async function finishRecovery(
  email: string,
  newPassword: string,
  masterKey: CryptoKey,
  verifier: string,
) {
  const { authPassword, wrappingKey } = await deriveKeys(email, newPassword);
  const wrappedByPassword = await wrapKey(masterKey, wrappingKey);
  await completeRecovery({
    data: { email, verifier, newAuthPassword: authPassword, wrappedByPassword },
  });
  const { user } = await signInAndUnlock(email, newPassword);
  return user;
}

/** Creates the master key material for a brand new account. */
export async function provisionKeys(email: string, password: string, userId: string) {
  const { wrappingKey } = await deriveKeys(email, password);
  const { generateMasterKey } = await import("@/lib/crypto");
  const masterKey = await generateMasterKey();
  const kdfSalt = generateSalt();
  const recoveryCode = generateRecoveryCode();
  const recoveryWrappingKey = await deriveRecoveryWrappingKey(
    recoveryCode,
    kdfSalt,
    KDF_ITERATIONS,
  );

  const wrapped_by_password = await wrapKey(masterKey, wrappingKey);
  const wrapped_by_recovery = await wrapKey(masterKey, recoveryWrappingKey);
  const recovery_verifier_hash = await hashRecoveryVerifier(
    await deriveRecoveryVerifier(recoveryCode, kdfSalt, KDF_ITERATIONS),
  );

  const { error } = await supabase.from("user_keys").insert({
    user_id: userId,
    wrapped_by_password,
    wrapped_by_recovery,
    kdf_salt: kdfSalt,
    kdf_iterations: KDF_ITERATIONS,
    recovery_verifier_hash,
  });
  if (error) throw error;

  await supabase.from("user_prefs").insert({ user_id: userId });
  setMasterKey(masterKey);
  return { recoveryCode };
}

/** Reactive "is the vault unlocked" flag. */
export function useVaultUnlocked() {
  const [unlocked, setUnlocked] = useState(() => hasMasterKey());
  useEffect(() => {
    setUnlocked(hasMasterKey());
    return onMasterKeyChange(() => setUnlocked(hasMasterKey()));
  }, []);
  return unlocked;
}
