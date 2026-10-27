# Self-hosted Better Auth spike

Spike to run Better Auth **in the OpenNext Worker** instead of Neon Managed Auth.

## Enable

Set:

- `BETTER_AUTH_SECRET` — 32+ chars (preview CI reuses `NEON_AUTH_COOKIE_SECRET`)
- `NEXT_PUBLIC_SELF_HOSTED_AUTH=1` — client uses `better-auth/react`
- `BETTER_AUTH_URL` — absolute app origin for email links (preview CI sets after deploy)
- `DATABASE_URL` — auth tables `auth_user` / `auth_session` / `auth_account` / `auth_verification`
- Optional Google: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`  
  Redirect URI: `{app origin}/api/auth/callback/google`  
  (Add the preview Worker origin in Google Cloud when testing Continue with Google.)

When `BETTER_AUTH_SECRET` is set, the app prefers self-hosted over `NEON_AUTH_*`.

**CI (preview, staging, production):** reuses the env’s cookie secret as `BETTER_AUTH_SECRET`, sets `NEXT_PUBLIC_SELF_HOSTED_AUTH=1`, sets `BETTER_AUTH_URL` from the app origin (`STAGING_CF_APP_URL` / `PRODUCTION_CF_APP_URL` / preview Worker URL), and forwards shared `GOOGLE_CLIENT_*` when present. No separate Better Auth secret is required.

Google Cloud redirect URIs to keep on the Web client:

- Preview: `https://thegamies-v2-pr-<n>.….workers.dev/api/auth/callback/google`
- Staging: `{STAGING_CF_APP_URL}/api/auth/callback/google`
- Production: `{PRODUCTION_CF_APP_URL}/api/auth/callback/google`

## In this spike

- Email/password sign-up, verification email (Worker `EMAIL`), confirm via `/auth/confirmed`
- Sign-in, sign-out, session
- Forgot / reset password (recovery mail → `/auth/reset-password?token=`)
- Signed-in change password (existing client → Better Auth)
- Account delete (`auth_*` SQL + Better Auth `deleteUser`)
- Google OAuth when Google secrets are set (complete-profile; session cookie already on this origin — no Neon verifier)
- Local `next dev` still skips verification when `skipEmailVerification()` is true (marks `auth_user.emailVerified`)

## Out / follow-ups

- Drop Neon Auth proxy, CI Auth domain/webhook registration, `@neondatabase/auth`
- Staging/production cutover decision in `docs/decisions.md`
- QA fixture scripts that still assume `neon_auth` when self-hosted is on lasting envs
