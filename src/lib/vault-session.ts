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
  KDF_ITERATIONS,
} from "@/lib/crypto";

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

/** Signs in with the derived auth password and unlocks the vault. */
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
  if (!keys) throw new Error("No encryption key found for this account.");
  const masterKey = await unwrapKey(keys.wrapped_by_password, wrappingKey);
  setMasterKey(masterKey);
  return user;
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

/** Recovery-code unlock. Returns the unwrapped key handling to the caller. */
export async function unlockWithRecoveryCode(
  email: string,
  recoveryCode: string,
  keys: UserKeysRow,
) {
  const recoveryWrappingKey = await deriveRecoveryWrappingKey(
    recoveryCode,
    keys.kdf_salt,
    keys.kdf_iterations,
  );
  const masterKey = await unwrapKey(keys.wrapped_by_recovery, recoveryWrappingKey);
  setMasterKey(masterKey);
  void email;
  return masterKey;
}

/** After recovery: set a brand new password and re-wrap the master key. */
export async function resetPasswordWithMasterKey(
  email: string,
  newPassword: string,
  masterKey: CryptoKey,
  recoveryCode: string,
) {
  const { authPassword, wrappingKey } = await deriveKeys(email, newPassword);
  const { error } = await supabase.auth.updateUser({ password: authPassword });
  if (error) throw error;

  const kdfSalt = generateSalt();
  const recoveryWrappingKey = await deriveRecoveryWrappingKey(recoveryCode, kdfSalt, KDF_ITERATIONS);
  const wrapped_by_password = await wrapKey(masterKey, wrappingKey);
  const wrapped_by_recovery = await wrapKey(masterKey, recoveryWrappingKey);

  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in.");
  await supabase.from("user_keys").update({
    wrapped_by_password,
    wrapped_by_recovery,
    kdf_salt: kdfSalt,
    kdf_iterations: KDF_ITERATIONS,
  }).eq("user_id", u.user.id);
}

/** Creates the master key material for a brand new account. */
export async function provisionKeys(email: string, password: string, userId: string) {
  const { wrappingKey } = await deriveKeys(email, password);
  const { generateMasterKey } = await import("@/lib/crypto");
  const masterKey = await generateMasterKey();
  const kdfSalt = generateSalt();
  const recoveryCode = generateRecoveryCode();
  const recoveryWrappingKey = await deriveRecoveryWrappingKey(recoveryCode, kdfSalt, KDF_ITERATIONS);

  const wrapped_by_password = await wrapKey(masterKey, wrappingKey);
  const wrapped_by_recovery = await wrapKey(masterKey, recoveryWrappingKey);

  const { error } = await supabase.from("user_keys").insert({
    user_id: userId,
    wrapped_by_password,
    wrapped_by_recovery,
    kdf_salt: kdfSalt,
    kdf_iterations: KDF_ITERATIONS,
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
