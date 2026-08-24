"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  createCommunity,
  getCommunityBySlug,
  joinCommunityPublic,
  joinCommunityWithInvite,
  leaveCommunity,
  rotateCommunityInviteCode,
  searchCommunityMembersForAdmin,
  setCommunityImageUrl,
  setCommunityLiveScoresVisibleFrom,
  setCommunityMemberRole,
  setCommunityOpenInvites,
  setLiveRankingsEnabled,
  setLiveRankingsLocked,
  updateCommunityIdentity,
} from "@/lib/communities/service";
import {
  banCommunityMember,
  removeCommunityMember,
  requestCommunityDeletion,
  unbanCommunityMember,
} from "@/lib/communities/moderation";
import { SOCIAL_LINK_KEYS } from "@/lib/profile/social-links";
import { COMMUNITY_ROLES } from "@/lib/communities/schema";
import {
  AVATAR_MAX_BYTES,
  BANNER_MAX_BYTES,
  deleteCommunityImageObjects,
  readR2AvatarConfigFromEnv,
  uploadCommunityImageObject,
  type CommunityImageKind,
} from "@/lib/profile/avatar-upload";
import {
  addEditionCategory,
  editionCategoriesWriteBlockedReason,
  removeEditionCategory,
  searchSiteAwardCategories,
  setCommunityEditionCategories,
} from "@/lib/communities/edition-categories";
import {
  createCommunityEdition,
  deleteCommunityEdition,
  getEditionByCommunityYear,
  setCommunityEditionRankMode,
  setCommunityEditionSchedule,
  setCommunityEditionTimestampNow,
} from "@/lib/communities/editions";
import { computeEditionStatus } from "@/lib/communities/edition-status";
import { canManageCommunity } from "@/lib/communities/rules";
import { communitySettingsHref } from "@/lib/communities/community-settings-href";
import { editionHostSettingsHref } from "@/lib/communities/edition-results-href";
import { upsertEditionBallot } from "@/lib/communities/ballots";
import { saveEditionBallotInputSchema } from "@/lib/communities/ballot-schema";
import {
  searchEditionHostMembers,
  setEditionVoice,
} from "@/lib/communities/voices";
import {
  listCurrentCommunityHosts,
  promoteCommunityHost,
  retireCommunityHost,
  searchCommunityMembersForHost,
} from "@/lib/communities/community-hosts";

async function requireProfile() {
  const user = await getRequestSessionUser();
  if (!user?.id) {
    return { ok: false as const, error: "Sign in to continue." };
  }
  const profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile) {
    return {
      ok: false as const,
      error: "Create a profile before joining a community.",
    };
  }
  return { ok: true as const, profile };
}

function revalidateCommunity(slug: string, username?: string) {
  revalidatePath("/communities");
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/live`);
  revalidatePath(`/communities/${slug}/live`, "layout");
  revalidatePath(`/communities/${slug}/settings`);
  revalidatePath(`/communities/${slug}/members`);
  revalidatePath(`/communities/${slug}/edition`);
  revalidatePath(`/communities/${slug}/edition`, "layout");
  revalidatePath(`/communities/${slug}/ballot`);
  revalidatePath(`/communities/${slug}/results`);
  if (username) revalidatePath(`/u/${username}`);
}

export type SaveEditionBallotState = {
  error?: string;
  saved?: boolean;
} | null;

export async function saveEditionBallotAction(
  _prev: SaveEditionBallotState,
  formData: FormData,
): Promise<SaveEditionBallotState> {
  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  let itemsJson: unknown = [];
  let categoryVotesJson: unknown = [];
  try {
    itemsJson = JSON.parse(String(formData.get("itemsJson") ?? "[]"));
    categoryVotesJson = JSON.parse(
      String(formData.get("categoryVotesJson") ?? "[]"),
    );
  } catch {
    return { error: "Could not save the ballot." };
  }

  const parsed = saveEditionBallotInputSchema.safeParse({
    slug: String(formData.get("slug") ?? ""),
    year: formData.get("year"),
    items: itemsJson,
    categoryVotes: categoryVotesJson,
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Could not save the ballot.",
    };
  }

  const result = await upsertEditionBallot({
    slug: parsed.data.slug,
    year: parsed.data.year,
    profileId: gate.profile.id,
    items: parsed.data.items,
    categoryVotes: parsed.data.categoryVotes,
  });
  if ("error" in result) return { error: result.error };

  const slug = parsed.data.slug.trim().toLowerCase();
  const year = parsed.data.year;
  revalidateCommunity(slug, gate.profile.username);
  revalidatePath(`/communities/${slug}/edition/${year}`);
  return { saved: true };
}

export async function createCommunityAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await createCommunity(gate.profile.id, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    visibility: String(formData.get("visibility") ?? "private"),
  });
  if ("error" in result) return { error: result.error };

  revalidateCommunity(result.slug, gate.profile.username);
  redirect(`/communities/${result.slug}`);
}

export async function joinCommunityAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "That invite is not valid." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await joinCommunityWithInvite(code, gate.profile.id);
  if ("error" in result) return { error: result.error };

  revalidateCommunity(result.slug, gate.profile.username);
  redirect(`/communities/${result.slug}`);
}

export async function joinCommunityPublicAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await joinCommunityPublic(slug, gate.profile.id);
  if ("error" in result) return { error: result.error };

  revalidateCommunity(result.slug, gate.profile.username);
  redirect(`/communities/${result.slug}`);
}

export async function rotateCommunityInviteCodeAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await rotateCommunityInviteCode(slug, gate.profile.id);
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug);
  return null;
}

export async function setCommunityOpenInvitesAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };
  const enabled = String(formData.get("enabled") ?? "") === "true";

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await setCommunityOpenInvites(slug, gate.profile.id, enabled);
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug);
  return null;
}

export async function uploadCommunityImageAction(
  formData: FormData,
): Promise<{
  error?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const kindRaw = String(formData.get("kind") ?? "").trim();
  const kind: CommunityImageKind | null =
    kindRaw === "avatar" || kindRaw === "banner" ? kindRaw : null;
  if (!slug) return { error: "Community not found." };
  if (!kind) return { error: "Choose a photo or banner." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const community = await getCommunityBySlug(slug, gate.profile.id);
  if (!community) return { error: "Community not found." };
  if (!canManageCommunity(community.viewerRole)) {
    return { error: "Only admins can update community images." };
  }

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: kind === "avatar" ? "Choose a photo to upload." : "Choose a banner to upload." };
  }
  const maxBytes = kind === "avatar" ? AVATAR_MAX_BYTES : BANNER_MAX_BYTES;
  if (file.size > maxBytes) {
    return {
      error:
        kind === "avatar"
          ? "Photo must be 2MB or smaller."
          : "Banner must be 3MB or smaller.",
    };
  }

  const config = readR2AvatarConfigFromEnv();
  if (!config) {
    return { error: "Image upload is not available right now." };
  }

  try {
    const body = await file.arrayBuffer();
    const { imageUrl } = await uploadCommunityImageObject(config, {
      communityId: community.id,
      kind,
      body,
    });
    const result = await setCommunityImageUrl(slug, gate.profile.id, {
      kind,
      imageUrl,
    });
    if ("error" in result) return { error: result.error };
    revalidateCommunity(slug);
    return {
      avatarUrl: result.avatarUrl,
      bannerUrl: result.bannerUrl,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Image could not be saved.",
    };
  }
}

export async function removeCommunityImageAction(
  formData: FormData,
): Promise<{
  error?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const kindRaw = String(formData.get("kind") ?? "").trim();
  const kind: CommunityImageKind | null =
    kindRaw === "avatar" || kindRaw === "banner" ? kindRaw : null;
  if (!slug) return { error: "Community not found." };
  if (!kind) return { error: "Choose a photo or banner." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const community = await getCommunityBySlug(slug, gate.profile.id);
  if (!community) return { error: "Community not found." };
  if (!canManageCommunity(community.viewerRole)) {
    return { error: "Only admins can update community images." };
  }

  const config = readR2AvatarConfigFromEnv();
  if (config) {
    await deleteCommunityImageObjects(config, community.id, kind);
  }

  const result = await setCommunityImageUrl(slug, gate.profile.id, {
    kind,
    imageUrl: null,
  });
  if ("error" in result) return { error: result.error };
  revalidateCommunity(slug);
  return {
    avatarUrl: result.avatarUrl,
    bannerUrl: result.bannerUrl,
  };
}

export async function leaveCommunityAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await leaveCommunity(slug, gate.profile.id);
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  if (String(formData.get("from") ?? "") === "settings") {
    redirect(`/communities/${slug}`);
  }
  return null;
}

export async function setCommunityMemberRoleAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const profileId = String(formData.get("profileId") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim();
  const nextRole = COMMUNITY_ROLES.find((role) => role === roleRaw);
  if (!slug) return { error: "Community not found." };
  if (!profileId) return { error: "Choose a member." };
  if (!nextRole) return { error: "Choose a valid role." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await setCommunityMemberRole(
    slug,
    gate.profile.id,
    profileId,
    nextRole,
  );
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return null;
}

export async function updateCommunityIdentityAction(
  _prev: { error: string } | { ok: true } | null,
  formData: FormData,
): Promise<{ error: string } | { ok: true } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const socialLinks = Object.fromEntries(
    SOCIAL_LINK_KEYS.map((key) => [
      key,
      String(formData.get(`social_${key}`) ?? ""),
    ]),
  );

  const result = await updateCommunityIdentity(slug, gate.profile.id, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    visibility: String(formData.get("visibility") ?? "private"),
    socialLinks,
  });
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return { ok: true };
}

export async function searchCommunityMembersForAdminAction(input: {
  slug: string;
  q: string;
}): Promise<
  | {
      ok: true;
      results: Array<{
        profileId: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        role: "admin" | "member";
      }>;
    }
  | { error: string }
> {
  const slug = input.slug.trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const community = await getCommunityBySlug(slug, gate.profile.id);
  if (!community) return { error: "Community not found." };
  if (!canManageCommunity(community.viewerRole)) {
    return { error: "Only admins can search members." };
  }

  const results = await searchCommunityMembersForAdmin(community.id, {
    q: input.q,
  });
  return { ok: true, results };
}

export async function removeCommunityMemberAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const profileId = String(formData.get("profileId") ?? "").trim();
  if (!slug) return { error: "Community not found." };
  if (!profileId) return { error: "Choose a member." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await removeCommunityMember(
    slug,
    gate.profile.id,
    profileId,
  );
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return null;
}

export async function banCommunityMemberAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const profileId = String(formData.get("profileId") ?? "").trim();
  if (!slug) return { error: "Community not found." };
  if (!profileId) return { error: "Choose a member." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await banCommunityMember(slug, gate.profile.id, profileId);
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return null;
}

export async function unbanCommunityMemberAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const profileId = String(formData.get("profileId") ?? "").trim();
  if (!slug) return { error: "Community not found." };
  if (!profileId) return { error: "Choose a member." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await unbanCommunityMember(slug, gate.profile.id, profileId);
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return null;
}

export async function requestCommunityDeletionAction(
  _prev: { error: string } | { ok: true; alreadyPending?: boolean } | null,
  formData: FormData,
): Promise<{ error: string } | { ok: true; alreadyPending?: boolean } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const confirmName = String(formData.get("confirmName") ?? "");
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await requestCommunityDeletion(
    slug,
    gate.profile.id,
    confirmName,
  );
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return { ok: true, alreadyPending: result.alreadyPending };
}

export async function setLiveRankingsEnabledAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };
  const enabled = String(formData.get("enabled") ?? "") === "true";

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await setLiveRankingsEnabled(slug, gate.profile.id, enabled);
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return null;
}

export async function setLiveRankingsLockedAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };
  const locked = String(formData.get("locked") ?? "") === "true";

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await setLiveRankingsLocked(slug, gate.profile.id, locked);
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return null;
}

export async function setCommunityLiveScoresVisibleFromAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const mode = String(formData.get("mode") ?? "").trim();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  let input:
    | { mode: "hide" }
    | { mode: "now" }
    | { mode: "date"; date: string };
  if (mode === "hide") {
    input = { mode: "hide" };
  } else if (mode === "now") {
    input = { mode: "now" };
  } else if (mode === "date") {
    input = { mode: "date", date: String(formData.get("date") ?? "") };
  } else {
    return { error: "Choose how to update scores." };
  }

  const result = await setCommunityLiveScoresVisibleFrom(
    slug,
    gate.profile.id,
    input,
  );
  if ("error" in result) return { error: result.error };

  const year = new Date().getUTCFullYear();
  revalidatePath(`/communities/${slug}/live/${year}`);
  revalidateCommunity(slug, gate.profile.username);
  return null;
}

export async function createCommunityEditionAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await createCommunityEdition(slug, gate.profile.id, {
    year: formData.get("year"),
    opensAt: String(formData.get("opensAt") ?? ""),
    closesAt: String(formData.get("closesAt") ?? ""),
    publishesAt: String(formData.get("publishesAt") ?? ""),
    rankMode: String(formData.get("rankMode") ?? ""),
  });
  if ("error" in result) return { error: result.error };

  const categoryIds = formData
    .getAll("categoryIds")
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (categoryIds.length > 0) {
    const categories = await setCommunityEditionCategories(
      slug,
      gate.profile.id,
      { year: result.year, categoryIds },
    );
    if ("error" in categories) return { error: categories.error };
  }

  revalidateCommunity(slug, gate.profile.username);
  redirect(editionHostSettingsHref(slug, result.year));
}

export async function deleteCommunityEditionAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const year = formData.get("year");
  const result = await deleteCommunityEdition(slug, gate.profile.id, {
    year,
    confirmYear: formData.get("confirmYear"),
  });
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  if (Number.isFinite(Number(year))) {
    revalidatePath(`/communities/${slug}/edition/${Math.floor(Number(year))}`);
  }
  redirect(communitySettingsHref(slug, { tab: "events" }));
}

export async function setCommunityEditionScheduleAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await setCommunityEditionSchedule(slug, gate.profile.id, {
    year: formData.get("year"),
    opensAt: String(formData.get("opensAt") ?? ""),
    closesAt: String(formData.get("closesAt") ?? ""),
    publishesAt: String(formData.get("publishesAt") ?? ""),
  });
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return null;
}

/** Schedule + categories + tie numbering — one Save on Edition settings. */
export async function saveEditionSettingsAction(
  _prev: { error: string } | { ok: true } | null,
  formData: FormData,
): Promise<{ error: string } | { ok: true } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const yearRaw = formData.get("year");
  const year = Number(yearRaw);
  if (!Number.isFinite(year)) return { error: "Choose a valid year." };

  const detail = await getCommunityBySlug(slug, gate.profile.id);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can update editions." };
  }

  const edition = await getEditionByCommunityYear(detail.id, Math.floor(year));
  if (!edition) return { error: "Event not found." };

  // Apply category edits against the current status (before schedule may close voting).
  const status = computeEditionStatus(edition);
  if (!editionCategoriesWriteBlockedReason(status)) {
    const categoryIds = formData
      .getAll("categoryIds")
      .map((v) => String(v).trim())
      .filter(Boolean);
    const categories = await setCommunityEditionCategories(
      slug,
      gate.profile.id,
      { year: yearRaw, categoryIds },
    );
    if ("error" in categories) return { error: categories.error };
  }

  const schedule = await setCommunityEditionSchedule(slug, gate.profile.id, {
    year: yearRaw,
    opensAt: String(formData.get("opensAt") ?? ""),
    closesAt: String(formData.get("closesAt") ?? ""),
    publishesAt: String(formData.get("publishesAt") ?? ""),
  });
  if ("error" in schedule) return { error: schedule.error };

  const rank = await setCommunityEditionRankMode(slug, gate.profile.id, {
    year: yearRaw,
    rankMode: String(formData.get("rankMode") ?? ""),
  });
  if ("error" in rank) return { error: rank.error };

  revalidateEditionCategories(slug, Math.floor(year));
  return { ok: true };
}

export async function setCommunityEditionTimestampNowAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const fieldRaw = String(formData.get("field") ?? "");
  if (!slug) return { error: "Community not found." };
  if (
    fieldRaw !== "opensAt" &&
    fieldRaw !== "closesAt" &&
    fieldRaw !== "publishesAt"
  ) {
    return { error: "Choose which time to update." };
  }

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await setCommunityEditionTimestampNow(slug, gate.profile.id, {
    year: formData.get("year"),
    field: fieldRaw,
  });
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return null;
}

export async function setCommunityEditionRankModeAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await setCommunityEditionRankMode(slug, gate.profile.id, {
    year: formData.get("year"),
    rankMode: String(formData.get("rankMode") ?? ""),
  });
  if ("error" in result) return { error: result.error };

  const year = Number(formData.get("year"));
  revalidateCommunity(slug, gate.profile.username);
  if (Number.isFinite(year)) {
    revalidatePath(`/communities/${slug}/edition/${Math.floor(year)}`);
  }
  return null;
}

export async function setCommunityEditionCategoriesAction(
  _prev: { error: string } | { ok: true } | null,
  formData: FormData,
): Promise<{ error: string } | { ok: true } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const categoryIds = formData
    .getAll("categoryIds")
    .map((v) => String(v).trim())
    .filter(Boolean);

  const result = await setCommunityEditionCategories(slug, gate.profile.id, {
    year: formData.get("year"),
    categoryIds,
  });
  if ("error" in result) return { error: result.error };

  const year = Number(formData.get("year"));
  revalidateCommunity(slug, gate.profile.username);
  if (Number.isFinite(year)) {
    revalidatePath(`/communities/${slug}/edition/${Math.floor(year)}`);
  }
  return { ok: true };
}

function revalidateEditionCategories(slug: string, year: number) {
  // Keep this narrow — full community revalidation makes add/remove feel multi-second.
  revalidatePath(`/communities/${slug}/settings`);
  revalidatePath(`/communities/${slug}/edition/${year}`);
}

export async function searchEditionCategoriesAction(input: {
  slug: string;
  year: number;
  q: string;
  excludeIds?: string[];
}): Promise<
  | { ok: true; results: Array<{ id: string; label: string; description: string | null }> }
  | { error: string }
> {
  const slug = input.slug.trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const detail = await getCommunityBySlug(slug, gate.profile.id);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can edit event categories." };
  }

  const results = await searchSiteAwardCategories({
    q: input.q,
    excludeIds: input.excludeIds,
    limit: 20,
  });
  return { ok: true, results };
}

export async function addEditionCategoryAction(
  _prev: { error: string } | { ok: true } | null,
  formData: FormData,
): Promise<{ error: string } | { ok: true } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const year = Number(formData.get("year"));
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const result = await addEditionCategory(slug, gate.profile.id, {
    year,
    categoryId,
  });
  if ("error" in result) return { error: result.error };

  if (Number.isFinite(year)) {
    revalidateEditionCategories(slug, Math.floor(year));
  }
  return { ok: true };
}

export async function removeEditionCategoryAction(
  _prev: { error: string } | { ok: true } | null,
  formData: FormData,
): Promise<{ error: string } | { ok: true } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const year = Number(formData.get("year"));
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const result = await removeEditionCategory(slug, gate.profile.id, {
    year,
    categoryId,
  });
  if ("error" in result) return { error: result.error };

  if (Number.isFinite(year)) {
    revalidateEditionCategories(slug, Math.floor(year));
  }
  return { ok: true };
}

export async function setEditionVoiceAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const year = Number(formData.get("year"));
  const profileId = String(formData.get("profileId") ?? "").trim();
  const isVoice = String(formData.get("isVoice") ?? "") === "1";
  if (!slug) return { error: "Community not found." };
  if (!Number.isFinite(year)) return { error: "Pick a valid year." };
  if (!profileId) return { error: "Choose a member." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await setEditionVoice(
    slug,
    Math.floor(year),
    gate.profile.id,
    profileId,
    isVoice,
  );
  if ("error" in result) return { error: result.error };

  revalidatePath(`/communities/${slug}/edition/${Math.floor(year)}`);
  return null;
}

export async function searchEditionHostMembersAction(input: {
  slug: string;
  year: number;
  q: string;
}): Promise<
  | {
      ok: true;
      results: Array<{
        profileId: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        role: "admin" | "member";
        isVoice: boolean;
      }>;
    }
  | { error: string }
> {
  const slug = input.slug.trim().toLowerCase();
  if (!slug) return { error: "Community not found." };
  if (!Number.isFinite(input.year)) return { error: "Pick a valid year." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const detail = await getCommunityBySlug(slug, gate.profile.id);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can edit the Hosts roster." };
  }

  const edition = await getEditionByCommunityYear(
    detail.id,
    Math.floor(input.year),
  );
  if (!edition) return { error: "Event not found." };

  const results = await searchEditionHostMembers(detail.id, edition.id, {
    q: input.q,
  });
  return { ok: true, results };
}

export async function promoteCommunityHostAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const profileId = String(formData.get("profileId") ?? "").trim();
  if (!slug) return { error: "Community not found." };
  if (!profileId) return { error: "Choose a member." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await promoteCommunityHost(slug, gate.profile.id, profileId);
  if ("error" in result) return { error: result.error };
  revalidatePath(`/communities/${slug}/settings`);
  revalidatePath(`/communities/${slug}`);
  return null;
}

export async function retireCommunityHostAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const profileId = String(formData.get("profileId") ?? "").trim();
  if (!slug) return { error: "Community not found." };
  if (!profileId) return { error: "Choose a member." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await retireCommunityHost(slug, gate.profile.id, profileId);
  if ("error" in result) return { error: result.error };
  revalidatePath(`/communities/${slug}/settings`);
  revalidatePath(`/communities/${slug}`);
  return null;
}

export async function searchCommunityMembersForHostAction(input: {
  slug: string;
  q: string;
}): Promise<
  | {
      ok: true;
      results: Awaited<ReturnType<typeof listCurrentCommunityHosts>>;
    }
  | { error: string }
> {
  const slug = input.slug.trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const detail = await getCommunityBySlug(slug, gate.profile.id);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only admins can edit the Hosts roster." };
  }

  const results = await searchCommunityMembersForHost(detail.id, {
    q: input.q,
  });
  return { ok: true, results };
}
