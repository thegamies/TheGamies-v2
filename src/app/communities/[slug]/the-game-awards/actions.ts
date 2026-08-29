"use server";

import { revalidatePath } from "next/cache";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { canManageCommunity } from "@/lib/communities/rules";
import type { CommunityRole } from "@/lib/communities/schema";
import { getCommunityBySlug } from "@/lib/communities/service";
import { setCommunityTgaOptIn } from "@/lib/tga-pickem/service";
import {
  searchTgaCommunityHostMembers,
  setTgaCommunityHost,
} from "@/lib/tga-pickem/community-hosts";
import {
  getSiteSheet,
  importSiteSheetToCommunity,
  saveCommunitySheet,
  saveSiteSheet,
} from "@/lib/tga-pickem/sheets";

type MemberAuth =
  | { error: string }
  | {
      profileId: string;
      communityId: string;
      slug: string;
      viewerRole: CommunityRole;
    };

async function requireMember(slug: string): Promise<MemberAuth> {
  const user = await getRequestSessionUser();
  if (!user?.id) return { error: "Sign in to continue." };
  const profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile) return { error: "Finish your profile first." };
  const community = await getCommunityBySlug(slug, profile.id).catch(() => null);
  if (!community?.viewerRole) return { error: "Join this community first." };
  return {
    profileId: profile.id,
    communityId: community.id,
    slug: community.slug,
    viewerRole: community.viewerRole,
  };
}

export async function setCommunityTgaOptInAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "");
  const year = Number(formData.get("year"));
  const enabled = String(formData.get("enabled")) === "true";
  const auth = await requireMember(slug);
  if ("error" in auth) return auth;
  if (!canManageCommunity(auth.viewerRole)) {
    return { error: "Only community admins can change this." };
  }
  const result = await setCommunityTgaOptIn(auth.communityId, year, enabled);
  if ("error" in result) return { error: result.error };
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/settings`);
  revalidatePath(`/communities/${slug}/the-game-awards`);
  return null;
}

export async function saveCommunityTgaSheetAction(
  slug: string,
  year: number,
  input: { picks: Record<string, string>; worldPremieresGuess: number },
) {
  const auth = await requireMember(slug);
  if ("error" in auth) return auth;
  const result = await saveCommunitySheet(
    auth.communityId,
    auth.profileId,
    year,
    input,
  );
  if ("error" in result) return result;
  const site = await getSiteSheet(auth.profileId, year);
  const promptGlobal =
    site.worldPremieresGuess == null && Object.keys(site.picks).length === 0;
  revalidatePath(`/communities/${slug}/the-game-awards`);
  revalidatePath(`/communities/${slug}/the-game-awards/${year}`);
  return { ok: true as const, promptGlobal };
}

export async function saveCommunityPicksToSiteAction(
  slug: string,
  year: number,
  input: { picks: Record<string, string>; worldPremieresGuess: number },
) {
  const auth = await requireMember(slug);
  if ("error" in auth) return auth;
  const result = await saveSiteSheet(auth.profileId, year, input);
  if ("error" in result) return result;
  revalidatePath(`/the-game-awards/${year}`);
  return { ok: true as const };
}

export async function importSiteTgaSheetAction(slug: string, year: number) {
  const auth = await requireMember(slug);
  if ("error" in auth) return auth;
  const result = await importSiteSheetToCommunity(
    auth.communityId,
    auth.profileId,
    year,
  );
  if ("error" in result) return result;
  revalidatePath(`/communities/${slug}/the-game-awards`);
  revalidatePath(`/communities/${slug}/the-game-awards/${year}`);
  return result;
}

export async function setTgaCommunityHostAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const year = Number(formData.get("year"));
  const profileId = String(formData.get("profileId") ?? "").trim();
  const isHost = String(formData.get("isHost") ?? "") === "1";
  if (!slug) return { error: "Community not found." };
  if (!Number.isFinite(year)) return { error: "Pick a valid year." };
  if (!profileId) return { error: "Choose a member." };

  const auth = await requireMember(slug);
  if ("error" in auth || !auth.profileId) {
    return {
      error:
        "error" in auth
          ? (auth.error ?? "Sign in to continue.")
          : "Sign in to continue.",
    };
  }
  const result = await setTgaCommunityHost(
    slug,
    Math.floor(year),
    auth.profileId,
    profileId,
    isHost,
  );
  if ("error" in result) return { error: result.error };
  revalidatePath(`/communities/${slug}/settings`);
  revalidatePath(`/communities/${slug}/the-game-awards/${Math.floor(year)}`);
  return null;
}

export async function searchTgaCommunityHostMembersAction(input: {
  slug: string;
  year: number;
  q: string;
}): Promise<
  | {
      ok: true;
      results: Awaited<ReturnType<typeof searchTgaCommunityHostMembers>>;
    }
  | { error: string }
> {
  const slug = input.slug.trim().toLowerCase();
  if (!slug) return { error: "Community not found." };
  if (!Number.isFinite(input.year)) return { error: "Pick a valid year." };

  const auth = await requireMember(slug);
  if ("error" in auth || !auth.communityId) {
    return {
      error:
        "error" in auth
          ? (auth.error ?? "Sign in to continue.")
          : "Sign in to continue.",
    };
  }
  if (!canManageCommunity(auth.viewerRole)) {
    return { error: "Only admins can edit the Hosts roster." };
  }

  const results = await searchTgaCommunityHostMembers(
    auth.communityId,
    Math.floor(input.year),
    { q: input.q },
  );
  return { ok: true, results };
}
