# Alive

A private AI diary you never have to organise. Drop in anything, at any time, in any language: text, voice notes, photos, work files. Alive encrypts it on your device, keeps it in one stream, and hands it back with your own words and dates.

Live: https://soul-scribe-alive.lovable.app

## Rules the product follows

1. **Quote or stay silent.** AI output only includes things it can quote word for word from your entries, with the date. Quotes are checked on the device; any that don't match are dropped.
2. **No guilt.** No streaks, coins, due dates, checkboxes, warnings or "did you…?" questions. Progress is shown as "written X of the last 30 days".
3. **Your words are the record.** Entries are never edited by the AI. Anything the AI writes is a separate, regenerable view.
4. **No health guesses.** No medical inference, and no mood from voice tone.

## What works today

| Area | Status |
| --- | --- |
| End-to-end encryption, sign-up with recovery code, sign-in, unlock after reload | Done |
| Password reset with the recovery code (no session needed) | Done |
| Vault and Timeline reading encrypted entries; search and filters on the device | Done |
| Capture button on every page: text, up to 3 photos, any files, voice notes | Done |
| Voice notes transcribed on the device (Whisper in the browser, any language) | Done, not yet tested on a real iPhone |
| Offline capture: queued on the device, syncs when back online | Done |
| Bring your own AI key (OpenAI, Anthropic, Google) or use Alive's AI on a paid plan | Done |
| Today home: morning brief, today's moments | Done |
| Legacy letters and family capsules (Family plan) | Later |
| Six-step reflection session (Reflect tab), Insights, "Who you are becoming" | Working on the new data |
| Sorting into topics and intentions (What's alive page) | Done |
| Reading text from attached PDFs, Word files and text files | Done (images are not read) |
| Ask from the capture sheet, with dates linking to that day | Done |
| Morning brief on the home screen | Done |
| Brief reminder email | Built; needs email set up (below) |
| Evening review ("Anything to add?") on Today | Done |
| Coach tab, plus at most one Coach line in the brief | Done |
| Two-minute sign-up profile and "tell me about yesterday" | Done |
| Import from files, pasted text and Day One | Done |
| Free / Soul plans and limits, /transparency page | Done (no real billing yet) |

## Privacy model

- A master key is created on your device at sign-up (or at the first sign-in after you confirm your email). It is wrapped twice: by a key derived from your password, and by a key derived from a 24-character recovery code. The server stores only the wrapped keys.
- Your typed password never leaves the device. Supabase Auth receives a separate password derived from it.
- Text, photos, files, audio, file names and your own AI key are encrypted with AES-GCM before upload. The database and storage hold ciphertext only.
- Recovery: the device derives a verifier from the recovery code (a different derivation from the key that unlocks the diary). The server checks its hash, then stores the master key re-wrapped with the new password.
- If you lose both your password and your recovery code, nobody can recover your entries.
- AI features send only the dated text a request needs, over HTTPS, for that one request. Voice is transcribed on the device and never sent anywhere.

## Stack

- React 19, TanStack Start and Router, Tailwind CSS, shadcn/ui, built with Vite; started on Lovable.
- Supabase (Lovable Cloud): Postgres with row-level security, Auth, Storage (`alive-media`, private).
- Web Crypto API for all encryption; no third-party crypto libraries.
- AI via the Vercel AI SDK: the person's own key through the provider's OpenAI-compatible endpoint, or the Lovable AI gateway on paid plans.
- Speech-to-text: transformers.js running `onnx-community/whisper-base` in a Web Worker.

## Project layout

```
src/
  lib/
    crypto.ts               key derivation, wrapping, encryption, recovery verifier
    vault-session.ts        sign-up, sign-in, unlock, recovery flows
    recovery.functions.ts   server steps for recovery without a session
    moments.ts              load, save and delete entries; capture upload
    moments-model.ts        pure entry logic (decrypt mapping, filters, quote checks)
    capture-model.ts        pure capture rules (photos, files, storage limits)
    outbox.ts / outbox-model.ts   on-device queue for offline capture
    voice/                  recorder, on-device transcription worker
    ai-model.ts             pure AI routing rules
    ai-router.server.ts     picks the model for each AI request
    ai-client.ts            the person's own key (encrypted), AI access checks
    *.functions.ts          server functions (diary, Ask, Timeline, Insights…)
  routes/                   pages; signed-in pages live under _authenticated/
  components/               UI, capture sheet, session screens
supabase/migrations/        database schema, in order
tests/                      unit tests (node:test)
.scratch/alive/             tickets: one file per ticket, with status and blockers
```

## Running it locally

```sh
npm install        # or: bun install
npm run dev
npm test           # unit tests, no extra dependencies
npm run build
```

`.env` holds the Supabase URL and publishable key (safe to expose in a web app). Server functions also need `SUPABASE_SERVICE_ROLE_KEY` and, for the paid-plan AI, `LOVABLE_API_KEY`; Lovable Cloud provides both.

## Database changes

Migrations live in `supabase/migrations/` and are named by timestamp. After merging a migration, make sure it has been applied to the Lovable Cloud database before publishing.

## Turning on the brief reminder email

The brief itself is built on the person's device, so the server can't read it. The email is only a reminder with a link. To switch it on:

1. Add these secrets to the Lovable project: `RESEND_API_KEY` (from resend.com), `BRIEF_FROM_EMAIL` (for example `Alive <brief@yourdomain.com>`, on a domain verified in Resend) and `CRON_SECRET` (any long random string).
2. Call `POST /api/brief-reminders` once an hour with the header `Authorization: Bearer <CRON_SECRET>`, from any scheduler (a Supabase cron job, or a service such as cron-job.org). Each person gets at most one email per day, at their chosen hour in their own time zone.

## How work is organised

The spec is broken into tickets in `.scratch/alive/issues/`, each with what to build, what blocks it, acceptance criteria and a status. `.scratch/alive/README.md` lists them in order. Changes are made on a branch per ticket and merged into `main`, which Lovable syncs from.
