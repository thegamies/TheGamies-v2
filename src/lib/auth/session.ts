import { cache } from "react";
import { identityFromAuthUser } from "@/lib/auth/oauth-identity";
import { getAuthOrNull } from "@/lib/auth/server";
import { getProfileByAuthUserId } from "@/lib/profile/service";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
};

/**
 * Per-request memoized session user (React `cache`).
 * Safe to call from layout + page in the same render — one auth round-trip.
 */
export const getRequestSessionUser = cache(
  async (): Promise<SessionUser | null> => {
    const auth = getAuthOrNull();
    if (!auth) return null;
    try {
      const { data: session } = await auth.getSession();
      const user = session?.user;
      if (!user?.id) return null;
      const identity = identityFromAuthUser(user);
      return {
        id: user.id,
        name: identity.name,
        email: identity.email,
        imageUrl: identity.imageUrl,
      };
    } catch {
      return null;
    }
  },
);

/**
 * Per-request memoized profile lookup by auth user id.
 * Pair with `getRequestSessionUser` from shared chrome (e.g. SiteHeader).
 */
export const getRequestProfileByAuthUserId = cache(
  async (authUserId: string) => {
    return getProfileByAuthUserId(authUserId);
  },
);
