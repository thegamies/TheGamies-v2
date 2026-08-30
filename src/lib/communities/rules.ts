import type { CommunityRole } from "./schema";

export const LAST_ADMIN_LEAVE_NOTE =
  "You are an admin of this community. The last admin cannot leave.";

export const COMMUNITY_ADMIN_ROSTER_LIMIT = 50;
export const COMMUNITY_ADMIN_SEARCH_LIMIT = 20;
export const COMMUNITY_BANS_PAGE_SIZE = 50;

export function leaveBlockedReason(
  role: CommunityRole,
  adminCount: number,
): string | null {
  if (role === "admin" && adminCount <= 1) {
    return "The last admin cannot leave this community.";
  }
  return null;
}

export function demoteHostBlockedReason(adminCount: number): string | null {
  if (adminCount <= 1) {
    return "The last admin cannot be removed.";
  }
  return null;
}

export function setCommunityRoleBlockedReason(input: {
  actorCanManage: boolean;
  targetIsMember: boolean;
  targetRole: CommunityRole;
  nextRole: CommunityRole;
  hostCount: number;
}): string | null {
  if (!input.actorCanManage) {
    return "Only admins can change community admins.";
  }
  if (!input.targetIsMember) {
    return "Only community members can be admins.";
  }
  if (input.nextRole === "member" && input.targetRole === "admin") {
    return demoteHostBlockedReason(input.hostCount);
  }
  return null;
}

/** Kick or ban: cannot target self or the last admin. */
export function removeCommunityMemberBlockedReason(input: {
  actorCanManage: boolean;
  actorProfileId: string;
  targetProfileId: string;
  targetIsMember: boolean;
  targetRole: CommunityRole;
  hostCount: number;
}): string | null {
  if (!input.actorCanManage) {
    return "Only admins can remove members.";
  }
  if (!input.targetIsMember) {
    return "That person is not a member.";
  }
  if (input.actorProfileId === input.targetProfileId) {
    return "Leave the community from Settings instead of removing yourself.";
  }
  if (input.targetRole === "admin" && input.hostCount <= 1) {
    return "The last admin cannot be removed.";
  }
  return null;
}

export function banCommunityMemberBlockedReason(input: {
  actorCanManage: boolean;
  actorProfileId: string;
  targetProfileId: string;
  targetIsMember: boolean;
  targetRole: CommunityRole;
  hostCount: number;
  alreadyBanned: boolean;
}): string | null {
  if (input.alreadyBanned) {
    return "That person is already banned.";
  }
  return removeCommunityMemberBlockedReason(input);
}

export function unbanCommunityMemberBlockedReason(input: {
  actorCanManage: boolean;
  isBanned: boolean;
}): string | null {
  if (!input.actorCanManage) {
    return "Only admins can lift bans.";
  }
  if (!input.isBanned) {
    return "That person is not banned.";
  }
  return null;
}

/** Internal admin role. Settings → Community says Admin; event boards still say Host. */
export function canManageCommunity(role: CommunityRole | null): boolean {
  return role === "admin";
}

/**
 * Admins always see Copy invite in the community header.
 * Other members see it only when open invites is on.
 */
export function canSeeCommunityInvite(
  role: CommunityRole | null,
  openInvites: boolean,
): boolean {
  if (role === "admin") return true;
  return role != null && openInvites;
}

/** Type-to-confirm community deletion request (exact trimmed name). */
export function communityDeletionRequestConfirmMatches(
  name: string,
  typed: unknown,
): boolean {
  return String(typed ?? "").trim() === name.trim();
}
