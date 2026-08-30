# Auth email templates

Branded transactional mail for Neon Auth, sent from the **Cloudflare Worker**. Neon cannot host HTML templates; when a webhook is subscribed, Neon skips its default mail and calls us instead.

## Templates (ported from the prior Gamies)

| Kind | Subject | When |
|---|---|---|
| Password reset | Reset your The Gamies password | Forgot password (`send.magic_link`, `forget-password`) |
| Confirm account | Confirm your The Gamies account | Email verification (`email-verification`) |
| Email change | Confirm your email change for The Gamies | Verification payload includes current + new email |
| Sign in | Sign in to The Gamies | Magic link / OTP sign-in |

Copy and layout live in [`src/lib/email/templates.ts`](../src/lib/email/templates.ts). Palette matches the site (`--paper` / `--panel` / `--ink` / `--muted` / `--line` / `--accent`). Header is **The Gamies** as text (no logo image). No em dashes. Validity copy uses webhook `expires_at` when present, otherwise Neon defaults: password reset / confirm / email change **15 minutes**, sign-in magic link **5 minutes**.

## Send path

1. User requests a reset (or other Auth email).
2. Neon Auth POSTs to `/api/webhooks/neon-auth-email` on the **Cloudflare** origin.
3. The handler verifies the Ed25519 webhook signature against Auth JWKS.
4. The Worker `EMAIL` binding (`send_email`) sends HTML + plain text.

Point the Neon webhook at the Worker URL only.

## Cloudflare

Email Routing on `thegamies.gg` covers inbound mail. Outbound Auth mail uses **Email Sending** on the Workers paid plan:

1. Cloudflare dashboard → Email Service / Email Sending: enable sending for `thegamies.gg`.
2. From address: `The Gamies <noreply@thegamies.gg>` (override with `AUTH_EMAIL_FROM`).
3. Worker binding is in [`wrangler.jsonc`](../wrangler.jsonc) (`send_email` → `EMAIL`).
4. Deploy the Worker (staging: `thegamies-v2-develop`, production: `thegamies-v2`).

Local `pnpm preview:cf` / `next dev` (OpenNext Cloudflare proxy) logs simulated sends unless the binding is `remote: true`.

## Neon Console

Auth email webhooks are **per database branch**. CI wires them:

| Environment | Neon branch | Cloudflare Worker | Webhook |
|---|---|---|---|
| Production | production (manual) | `thegamies-v2` | Set once in Console or after a production deploy |
| Staging | `develop` | `thegamies-v2-develop` | Staging workflow |
| PR preview | `preview/pr-<n>` | `thegamies-v2-pr-<n>` | Preview workflow |
| Manual deploy | `preview/manual-<slug>` | `thegamies-v2-manual-<slug>` | Branch-deploy workflow |

Local `dev_personal` Neon branch: run `scripts/ci/register-neon-auth-email-webhook.sh <branch_id> <https-origin>` after `pnpm preview:cf`, or set the webhook in Console. `next dev` on Node cannot send via the `EMAIL` binding, so **local laptop sign-up only** skips confirm-email (marks the Neon Auth user verified in `neon_auth`). Pull-request previews, develop/staging, and production still require the confirmation link.

**No mail after sign-up:** Neon skips its default sender once `send.otp` / `send.magic_link` is subscribed. The webhook URL must be that **same** Neon branch’s Cloudflare Worker (JWKS comes from that Worker’s `NEON_AUTH_BASE_URL`). A 401/503 in Worker logs means the code never left. Check spam for `noreply@thegamies.gg`. Confirmation uses Neon **Verification link**: branded mail’s **Confirm email** button is rewritten to `/auth/confirmed?token=` on this Worker. The page verifies through `/api/auth` so a session cookie can be stored, then continues to `next` or `/account`. Unverified sign-in goes to `/auth/verify-email` and can send another link. Do not wrap OTP codes in a site URL.

On each lasting Auth environment, also set Application name to **The Gamies**. Trusted domains must include the app origins so reset links land on `/auth/reset-password`.

## Secrets

Optional `AUTH_EMAIL_FROM` in Doppler / GitHub (Worker secret bulk on staging, previews, and production Cloudflare).
