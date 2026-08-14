import type { CommunityRole } from "./schema";

export const LAST_ADMIN_LEAVE_NOTE =
  "You are an admin of this community. The last admin cannot leave.";

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

/** Internal admin role. Settings → Community says Admin; event boards still say Host. */
export function canManageCommunity(role: CommunityRole | null): boolean {
  return role === "admin";
}
