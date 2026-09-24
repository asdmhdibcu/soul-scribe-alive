// Run with: node --experimental-strip-types --test tests/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveKeys,
  deriveRecoveryWrappingKey,
  deriveRecoveryVerifier,
  hashRecoveryVerifier,
  recoveryVerifierMatches,
  generateMasterKey,
  generateSalt,
  wrapKey,
  unwrapKey,
  encrypt,
  decrypt,
  formatRecoveryCode,
  normalizeRecoveryCode,
} from "../src/lib/crypto.ts";

const ITER = 1000; // fast for tests; production uses KDF_ITERATIONS
const CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ";

// What sign-up stores for a new account.
async function provision(email: string, password: string) {
  const masterKey = await generateMasterKey();
  const salt = generateSalt();
  const { wrappingKey } = await deriveKeys(email, password);
  const recoveryKey = await deriveRecoveryWrappingKey(CODE, salt, ITER);
  const verifier = await deriveRecoveryVerifier(CODE, salt, ITER);
  return {
    masterKey,
    row: {
      kdf_salt: salt,
      kdf_iterations: ITER,
      wrapped_by_password: await wrapKey(masterKey, wrappingKey),
      wrapped_by_recovery: await wrapKey(masterKey, recoveryKey),
      recovery_verifier_hash: await hashRecoveryVerifier(verifier),
    },
  };
}

test("the recovery code, typed as displayed, proves ownership", async () => {
  const { row } = await provision("a@b.com", "old password");
  const typed = formatRecoveryCode(CODE).toLowerCase(); // "abcd-efgh-…"
  const verifier = await deriveRecoveryVerifier(normalizeRecoveryCode(typed), row.kdf_salt, ITER);
  assert.equal(await recoveryVerifierMatches(row.recovery_verifier_hash, verifier), true);
});

test("a wrong recovery code does not prove ownership", async () => {
  const { row } = await provision("a@b.com", "old password");
  const verifier = await deriveRecoveryVerifier("ZZZZZZZZZZZZZZZZZZZZZZZZ", row.kdf_salt, ITER);
  assert.equal(await recoveryVerifierMatches(row.recovery_verifier_hash, verifier), false);
});

test("after recovery with a new password, old entries still decrypt", async () => {
  const { masterKey, row } = await provision("a@b.com", "old password");
  const entry = await encrypt("I need to call the bank", masterKey);

  // Recovery: unwrap with the code, re-wrap with the new password.
  const recovered = await unwrapKey(
    row.wrapped_by_recovery,
    await deriveRecoveryWrappingKey(CODE, row.kdf_salt, ITER),
  );
  const { wrappingKey: newWrap } = await deriveKeys("a@b.com", "new password");
  const rewrapped = await wrapKey(recovered, newWrap);

  // Next sign-in uses only the new password.
  const { wrappingKey } = await deriveKeys("a@b.com", "new password");
  const key = await unwrapKey(rewrapped, wrappingKey);
  assert.equal(await decrypt(entry, key), "I need to call the bank");
});

test("the verifier sent to the server cannot unwrap the diary", async () => {
  const { row } = await provision("a@b.com", "old password");
  const verifier = await deriveRecoveryVerifier(CODE, row.kdf_salt, ITER);
  // Treat the verifier as if it were a recovery code: it must not open the key.
  await assert.rejects(
    unwrapKey(
      row.wrapped_by_recovery,
      await deriveRecoveryWrappingKey(verifier, row.kdf_salt, ITER),
    ),
  );
  assert.notEqual(verifier, CODE);
});
