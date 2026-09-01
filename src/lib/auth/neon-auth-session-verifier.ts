export const NEON_AUTH_SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";

export function neonAuthSessionVerifierFromSearch(
  raw: unknown,
): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value || null;
}
