# Self-hosted Better Auth spike

Spike to run Better Auth **in the OpenNext Worker** instead of Neon Managed Auth, including email verification.

## Enable

Set:

- `BETTER_AUTH_SECRET` — 32+ chars (preview CI reuses `NEON_AUTH_COOKIE_SECRET`)
- `NEXT_PUBLIC_SELF_HOSTED_AUTH=1` — client uses `better-auth/react`
- `BETTER_AUTH_URL` — absolute app origin for email links (preview CI sets after deploy)
- `DATABASE_URL` — auth tables `auth_user` / `auth_session` / `auth_account` / `auth_verification`

When `BETTER_AUTH_SECRET` is set, the app prefers self-hosted over `NEON_AUTH_*`.

## In this spike

- Email/password sign-up, verification email (Worker `EMAIL`), confirm via `/auth/confirmed`, sign-in, sign-out, session
- Local `next dev` still skips verification when `skipEmailVerification()` is true (marks `auth_user.emailVerified`)

## Out / follow-ups

- Google OAuth
- Password reset / change parity
- Account delete against `auth_*` (Neon delete path still assumes `neon_auth`)
- Drop Neon Auth proxy, CI domain/webhook registration, `@neondatabase/auth`
- Staging/production cutover decision in `docs/decisions.md`
