# 08: AI router and bring-your-own key

**What to build:** A settings screen lets a person add their own AI provider key, stored encrypted in the vault. Every AI feature goes through one router: the person's own key if set, Alive's cloud account if they are on Soul, otherwise the feature is unavailable with a clear explanation.

**Blocked by:** 01

**Status:** done

- [ ] The own key is stored encrypted and never logged
- [ ] A free user with a key can run AI features; a free user without one sees an explanation
- [ ] Soul users use the cloud account with no key
- [ ] Text sent to providers uses zero-retention settings where available
