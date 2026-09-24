# 01: Safe sign-in

**What to build:** A person can never lock themselves out of their diary, and signed-in pages never break because the vault is locked. The forgot-password and reset-password pages are removed; "Forgot password?" leads to recovery-code sign-in, which sets a new password and re-wraps the master key. After a page reload, signed-in pages show an unlock screen asking for the password instead of throwing VAULT_LOCKED.

**Blocked by:** None (can start immediately)

**Status:** done

- [ ] No route changes the auth password without re-wrapping the master key
- [ ] "Forgot password?" opens recovery-code sign-in
- [ ] Recovery-code sign-in followed by a new password still decrypts existing entries
- [ ] Reloading any signed-in page shows the unlock screen; entering the password restores the page
- [ ] The typed password appears in no network request
