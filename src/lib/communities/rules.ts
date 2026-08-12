import type { CommunityRole } from "./schema";

export function leaveBlockedReason(
  role: CommunityRole,
  adminCount: number,
): string | null {
  if (role === "admin" && adminCount <= 1) {
    return "The last host cannot leave this community.";
  }
  return null;
}
