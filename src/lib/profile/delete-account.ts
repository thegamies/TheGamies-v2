import type { EditionStatus } from "@/lib/communities/edition-status";

export const FORMER_MEMBER_DISPLAY_NAME = "Former member";

export function tombstoneUsername(profileId: string): string {
  const hex = profileId.replace(/-/g, "").slice(0, 23);
  return `d${hex}`.slice(0, 24);
}

export function anonymizedVoterUsername(profileId: string): string {
  const hex = profileId.replace(/-/g, "").slice(0, 12);
  return `former_${hex}`;
}

export function deletedAuthUserIdSentinel(profileId: string): string {
  return `deleted:${profileId}`;
}

export function isAnonymizedVoter(voter: {
  displayName: string;
  username: string;
}): boolean {
  return (
    voter.displayName === FORMER_MEMBER_DISPLAY_NAME ||
    voter.username.startsWith("former_")
  );
}

export function isDeletedProfile(profile: { deletedAt?: Date | null }): boolean {
  return profile.deletedAt != null;
}

/** Closed and published ceremonies keep ballots; open/upcoming ones do not. */
export function shouldKeepEditionBallot(status: EditionStatus): boolean {
  return status === "closed" || status === "published";
}

export function lastHostAccountDeleteMessage(communityNames: string[]): string | null {
  if (communityNames.length === 0) return null;
  if (communityNames.length === 1) {
    const name = communityNames[0];
    return `Add another host to ${name}, or delete that community, before deleting your account.`;
  }
  const listed = communityNames.join(", ");
  return `Add another host to ${listed}, or delete those communities, before deleting your account.`;
}

export function tombstoneProfileFields(profileId: string, now: Date) {
  return {
    displayName: FORMER_MEMBER_DISPLAY_NAME,
    username: tombstoneUsername(profileId),
    bio: null as string | null,
    avatarUrl: null as string | null,
    socialLinks: null as Record<string, string> | null,
    visibility: "private" as const,
    authUserId: deletedAuthUserIdSentinel(profileId),
    deletedAt: now,
    updatedAt: now,
  };
}
