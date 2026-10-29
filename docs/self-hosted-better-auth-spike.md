# Self-hosted Better Auth

Auth runs **in the OpenNext Worker** via Better Auth. Users and sessions live in Neon Postgres tables `auth_user`, `auth_session`, `auth_account`, and `auth_verification`. Neon Managed Auth is not used (`@neondatabase/auth`, Auth BASE_URL, Auth domains, Auth email webhook, and Managed session mint are gone).

## Required env

| Variable | Role |
|---|---|
| `BETTER_AUTH_SECRET` | Cookie / token signing. **32+ chars.** Generate: `openssl rand -base64 32` |
| `DATABASE_URL` | Neon Postgres (includes `auth_*` tables) |
| `BETTER_AUTH_URL` | Absolute app origin for email and OAuth links. Falls back to `NEXT_PUBLIC_APP_URL` |
| Worker `EMAIL` | Cloudflare Email Sending binding (`send_email`) for branded Auth mail |

Optional:

| Variable | Role |
|---|---|
| `AUTH_EMAIL_FROM` | From address (default `The Gamies <noreply@thegamies.gg>`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in. Redirect URI: `{app origin}/api/auth/callback/google` |

## CI secrets

CI may still source the secret value from GitHub secret `NEON_AUTH_COOKIE_SECRET` (legacy name; production may use `PRODUCTION_NEON_AUTH_COOKIE_SECRET`) and inject it as `BETTER_AUTH_SECRET` until the GitHub secret is renamed to `BETTER_AUTH_SECRET`. CI sets `BETTER_AUTH_URL` from the deploy origin (`STAGING_CF_APP_URL` / `PRODUCTION_CF_APP_URL` / preview Worker URL) and forwards shared `GOOGLE_CLIENT_*` when present.

Google Cloud redirect URIs on the Web client:

- Preview: `https://thegamies-v2-pr-<n>.….workers.dev/api/auth/callback/google`
- Staging: `{STAGING_CF_APP_URL}/api/auth/callback/google`
- Production: `{PRODUCTION_CF_APP_URL}/api/auth/callback/google`

## Behavior

- Email/password sign-up; verification email via Worker `EMAIL`; confirm at `/auth/confirmed`
- Sign-in, sign-out, session through same-origin `/api/auth`
- Forgot / reset password (recovery mail → `/auth/reset-password?token=`)
- Signed-in change password
- Account delete (`auth_*` SQL + Better Auth `deleteUser`) so the email can be reused
- Google OAuth when Google secrets are set (callback `/api/auth/callback/google`; `/auth/complete-profile` for new users — session cookie is already on this origin)
- Local `next dev` on localhost skips confirm-email when `skipEmailVerification()` is true (marks `auth_user.emailVerified`; Node cannot send Worker mail). Hosted deploys require verification.

## Related

- Branded mail copy/layout: [email-templates.md](./email-templates.md)
- Secrets / deploy wiring: [secrets.md](./secrets.md), [github-secrets.md](./github-secrets.md), [deployment.md](./deployment.md)
- Decision: [decisions.md](./decisions.md) (2026-10-28 Auth)
