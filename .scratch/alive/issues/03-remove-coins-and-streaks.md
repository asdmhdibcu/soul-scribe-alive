# 03: Remove coins and streaks

**What to build:** Every signed-in page loads. Coins, the marketplace, achievements and streaks are gone from the app and landing page, replaced by "You've written X of the last 30 days", computed from moments. After this ticket, republish the live site.

**Blocked by:** 02

**Status:** done

- [ ] No reference remains to coins, coins_history, marketplace, achievements, streak or longest_streak
- [ ] coins.functions.ts is deleted
- [ ] Insights, Onboarding, Today, Life Book and the landing page load without errors
- [ ] "Written X of the last 30 days" matches the number of days with at least one moment
- [ ] No streak-break or guilt language anywhere
