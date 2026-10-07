import type { Profile } from "@/lib/profile/service";

export type AccountProfileFormProfile = Pick<
  Profile,
  | "avatarUrl"
  | "bannerUrl"
  | "bio"
  | "displayName"
  | "socialLinks"
  | "username"
  | "usernameChangedAt"
  | "visibility"
>;

/** Only what the account form renders goes to the browser. */
export function toAccountProfileFormProfile(
  profile: Profile,
): AccountProfileFormProfile {
  return {
    avatarUrl: profile.avatarUrl,
    bannerUrl: profile.bannerUrl,
    bio: profile.bio,
    displayName: profile.displayName,
    socialLinks: profile.socialLinks,
    username: profile.username,
    usernameChangedAt: profile.usernameChangedAt,
    visibility: profile.visibility,
  };
}
