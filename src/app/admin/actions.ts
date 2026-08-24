"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/admin-auth";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { claimFirstSiteAdmin } from "@/lib/site-ops/service";
import { SITE_OPS_CLAIM_FAILED_MESSAGE } from "@/lib/site-ops/rules";

export async function claimFirstSiteAdminAction(
  secret: string,
): Promise<{ ok: true } | { error: string }> {
  if (await isAdminAuthorized()) {
    return { ok: true };
  }
  const user = await getRequestSessionUser();
  if (!user?.id) {
    return { error: SITE_OPS_CLAIM_FAILED_MESSAGE };
  }
  const profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile) {
    return { error: SITE_OPS_CLAIM_FAILED_MESSAGE };
  }
  const result = await claimFirstSiteAdmin({
    profileId: profile.id,
    secret,
  });
  if ("error" in result) return result;
  revalidatePath("/admin");
  revalidatePath("/admin/operators");
  return { ok: true };
}
