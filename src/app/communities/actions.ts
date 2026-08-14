"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  createCommunity,
  joinCommunity,
  leaveCommunity,
  setCommunityLiveScoresVisibleFrom,
  setCommunityMemberRole,
  setLiveRankingsEnabled,
  setLiveRankingsLocked,
} from "@/lib/communities/service";
import { COMMUNITY_ROLES } from "@/lib/communities/schema";
import {
  createCommunityEdition,
  deleteCommunityEdition,
  setCommunityEditionRankMode,
  setCommunityEditionSchedule,
  setCommunityEditionTimestampNow,
} from "@/lib/communities/editions";
import { communitySettingsHref } from "@/lib/communities/community-settings-href";
import { upsertEditionBallot } from "@/lib/communities/ballots";
import { saveEditionBallotInputSchema } from "@/lib/communities/ballot-schema";
import { setEditionVoice } from "@/lib/communities/voices";

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
  });
  if ("error" in result) return { error: result.error };

  revalidateCommunity(result.slug, gate.profile.username);
  redirect(`/communities/${result.slug}`);
}

export async function joinCommunityAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!slug) return { error: "Community not found." };

  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await joinCommunity(slug, gate.profile.id);
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  return null;
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
  });
  if ("error" in result) return { error: result.error };

  revalidateCommunity(slug, gate.profile.username);
  redirect(
    communitySettingsHref(slug, { tab: "events", year: result.year }),
  );
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

  revalidateCommunity(slug, gate.profile.username);
  revalidatePath(`/communities/${slug}/edition/${Math.floor(year)}`);
  return null;
}
