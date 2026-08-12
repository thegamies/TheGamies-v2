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
  setLiveRankingsEnabled,
} from "@/lib/communities/service";

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
  if (username) revalidatePath(`/u/${username}`);
}

export async function createCommunityAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const gate = await requireProfile();
  if (!gate.ok) return { error: gate.error };

  const result = await createCommunity(gate.profile.id, {
    slug: String(formData.get("slug") ?? ""),
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
