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
