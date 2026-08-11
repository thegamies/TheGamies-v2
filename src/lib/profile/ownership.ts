/** True when the session user owns this profile row. */
export function ownsProfile(
  profile: { authUserId: string },
  authUserId: string | null | undefined,
): boolean {
  return Boolean(authUserId && profile.authUserId === authUserId);
}
