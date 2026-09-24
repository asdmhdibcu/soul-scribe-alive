# 02: Vault and Timeline read the new data

**What to build:** The Vault and Timeline list the person's encrypted moments from the new schema instead of the deleted diary table, decrypted on the device.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Vault and Timeline load with no runtime error when unlocked
- [ ] Entries shown are decrypted moments, newest first
- [ ] An entry that fails to decrypt shows "This entry could not be decrypted", never blank
- [ ] No code path reads the deleted diary table from these pages
