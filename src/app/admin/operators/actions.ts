"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/admin-auth";
import {
  searchProfilesForSiteOps,
  setSiteOperator,
} from "@/lib/site-ops/service";

async function requireAdmin() {
  if (!(await isAdminAuthorized())) {
    return { error: "Unauthorized." } as const;
  }
  return null;
}

export async function searchSiteOperatorsAction(input: {
  q: string;
}): Promise<
  | {
      results: Array<{
        profileId: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        isSiteAdmin: boolean;
      }>;
    }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const results = await searchProfilesForSiteOps(input.q);
  return { results };
}

export async function setSiteOperatorAction(input: {
  profileId: string;
  isSiteAdmin: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await setSiteOperator(input);
  if ("error" in result) return result;
  revalidatePath("/admin/operators");
  revalidatePath("/admin");
  return { ok: true };
}
