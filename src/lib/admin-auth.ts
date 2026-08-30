import { cache } from "react";
import { notFound } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { countSiteOperators } from "@/lib/site-ops/service";

export function adminSecretConfigured(): boolean {
  return Boolean(process.env.ADMIN_SYNC_SECRET);
}

export const getRequestSiteAdminProfile = cache(async () => {
  const user = await getRequestSessionUser();
  if (!user?.id) return null;
  const profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile?.isSiteAdmin) return null;
  return profile;
});

export async function isAdminAuthorized(): Promise<boolean> {
  return (await getRequestSiteAdminProfile()) != null;
}

export async function requireSiteAdminPage(): Promise<void> {
  if (!(await isAdminAuthorized())) notFound();
}

export async function canClaimFirstSiteAdmin(): Promise<boolean> {
  if (!adminSecretConfigured()) return false;
  const user = await getRequestSessionUser();
  if (!user?.id) return false;
  const profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile || profile.isSiteAdmin) return false;
  return (await countSiteOperators()) === 0;
}
