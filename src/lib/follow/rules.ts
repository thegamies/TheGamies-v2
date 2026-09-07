import { showDesignSystemNav } from "@/lib/site-nav";

export function allowFollowSeedAccounts(viewer?: {
  isSiteAdmin?: boolean;
}): boolean {
  if (viewer?.isSiteAdmin) return true;
  return showDesignSystemNav({
    nodeEnv: process.env.NODE_ENV,
    showDesignSystem: process.env.SHOW_DESIGN_SYSTEM,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
}

export function followDeniedReason(
  followerId: string,
  target: {
    id: string;
    visibility: string;
    deletedAt: Date | null;
    isSeed: boolean;
  },
  opts: { allowSeedFollow?: boolean } = {},
): string | null {
  if (followerId === target.id) return "You cannot follow yourself.";
  if (target.deletedAt) return "Profile not found.";
  if (target.isSeed && !opts.allowSeedFollow) {
    return "This profile cannot be followed.";
  }
  if (target.visibility !== "public") {
    return "You can only follow public profiles.";
  }
  return null;
}
