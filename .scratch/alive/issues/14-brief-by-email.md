# 14: Brief by email

**What to build:** An hourly job finds people whose local time matches their brief hour and emails them the brief, when brief email is on. Settings let them choose the hour and switch email on or off.

**Blocked by:** 13

**Status:** built; needs RESEND_API_KEY, BRIEF_FROM_EMAIL, CRON_SECRET and an hourly caller (see README)

- [ ] The email arrives within the chosen hour in the person's time zone
- [ ] Switching email off stops it
- [ ] Email content matches the home-screen brief
