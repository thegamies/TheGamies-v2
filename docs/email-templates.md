# Auth email templates

Branded transactional mail for Better Auth, sent from the **Cloudflare Worker** `EMAIL` binding. Better Auth hooks (`sendVerificationEmail`, `sendResetPassword`) call into `src/lib/email` — there is no Neon Auth email webhook.

## Templates (ported from the prior Gamies)

| Kind | Subject | When |
|---|---|---|
| Password reset | Reset your The Gamies password | Forgot password |
| Confirm account | Confirm your The Gamies account | Email verification |
| Email change | Confirm your email change for The Gamies | Verification payload includes current + new email |
| Sign in | Sign in to The Gamies | Magic link / OTP sign-in (if enabled) |

Copy and layout live in [`src/lib/email/templates.ts`](../src/lib/email/templates.ts). Palette matches the site (`--paper` / `--panel` / `--ink` / `--muted` / `--line` / `--accent`). Header is **The Gamies** as text (no logo image). No em dashes. Validity copy uses defaults in `src/lib/email/copy.ts`: password reset / confirm / email change **15 minutes**, sign-in magic link **5 minutes**.

## Send path

1. User requests a reset (or other Auth email).
2. Better Auth (in the OpenNext Worker) runs the matching email hook.
3. The hook builds branded HTML + plain text and sends via Worker `EMAIL` (`send_email`).

Confirm links are rewritten to `/auth/confirmed?token=` so the page can verify through `/api/auth` and store a session cookie. Reset links land on `/auth/reset-password?token=`.

## Cloudflare

Email Routing on `thegamies.gg` covers inbound mail. Outbound Auth mail uses **Email Sending** on the Workers paid plan:

1. Cloudflare dashboard → Email Service / Email Sending: enable sending for `thegamies.gg`.
2. From address: `The Gamies <noreply@thegamies.gg>` (override with `AUTH_EMAIL_FROM`).
3. Worker binding is in [`wrangler.jsonc`](../wrangler.jsonc) (`send_email` → `EMAIL`).
4. Deploy the Worker (staging: `thegamies-v2-develop`, production: `thegamies-v2`).

Local `pnpm preview:cf` / `next dev` (OpenNext Cloudflare proxy) logs simulated sends unless the binding is `remote: true`.

**Local laptop:** `next dev` on Node cannot send via the `EMAIL` binding, so **localhost only** skips confirm-email (marks `auth_user.emailVerified`). Pull-request previews, develop/staging, and production require confirmation.

**No mail after sign-up:** check Worker logs for `EMAIL` / send failures, spam for `noreply@thegamies.gg`, and that `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` match the deploy origin. Undeliverable reserved domains (`example.com`, `.test`, `.invalid`, …) are skipped by `isUndeliverableEmailAddress` in `src/lib/email/send.ts`.

## Secrets

Optional `AUTH_EMAIL_FROM` in Doppler / GitHub (Worker secret bulk on staging, previews, and production Cloudflare). Auth signing secret: `BETTER_AUTH_SECRET` (CI may still read GitHub `NEON_AUTH_COOKIE_SECRET` until renamed).
