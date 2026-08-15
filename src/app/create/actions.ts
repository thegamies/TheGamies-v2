"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthOrNull } from "@/lib/auth/server";
import {
  clearListEditCookie,
  readListEditCookie,
  setListEditCookie,
} from "@/lib/lists/cookies";
import {
  buildListDraftPayload,
  clearListDraftCookie,
  setListDraftCookie,
} from "@/lib/lists/draft-cookie";
import { existingGotyPreviewHref } from "@/lib/lists/existing-goty";
import {
  claimList,
  createDraft,
  getEditableList,
  getListShareTarget,
  getOwnedGotyForYear,
  hydrateGamesByIgdbIds,
  resetDraft,
  saveOwnedListFromClientDraft,
  shareListFromClientDraft,
  syncExistingSharedListFromClientDraft,
  syncLiveAggregateForOwnedList,
} from "@/lib/lists/service";
import { getProfileByAuthUserId } from "@/lib/profile/service";
import { replaceCategoryVotesForList } from "@/lib/live-aggregate/contrib";
import { replaceCategoryVotesSchema } from "@/lib/live-aggregate/schema";

async function currentProfileId(): Promise<string | null> {
  const auth = getAuthOrNull();
  if (!auth) return null;
  try {
    const { data: session } = await auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;
    const profile = await getProfileByAuthUserId(userId);
    return profile?.id ?? null;
  } catch {
    return null;
  }
}

async function accessFor(publicId: string) {
  const profileId = await currentProfileId();
  const cookie = await readListEditCookie();
  const editSecret =
    cookie?.publicId === publicId ? cookie.secret : null;
  return { profileId, editSecret };
}

export async function startGotyDraftAction(formData: FormData) {
  const year = Number(formData.get("year"));
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    redirect(`/create/goty?error=${encodeURIComponent("Pick a valid year.")}`);
  }
  const y = Math.floor(year);
  const profileId = await currentProfileId();

  if (profileId) {
    await clearListDraftCookie();
    const existing = await getOwnedGotyForYear(profileId, y);
    if (existing) {
      redirect(existingGotyPreviewHref(y));
    }
    const result = await createDraft(
      { listType: "goty", year: y },
      { profileId },
    );
    if ("error" in result) {
      redirect(`/create/goty?error=${encodeURIComponent(result.error)}`);
    }
    redirect(`/create/goty?id=${result.list.publicId}`);
  }

  redirect(`/create/goty?year=${y}`);
}

export async function startCustomDraftAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  if (!title) {
    redirect(
      `/create/custom?error=${encodeURIComponent("Give your list a title.")}`,
    );
  }
  const year = yearRaw ? Number(yearRaw) : undefined;
  if (yearRaw && !Number.isFinite(year)) {
    redirect(
      `/create/custom?error=${encodeURIComponent("Pick a valid year.")}`,
    );
  }
  const profileId = await currentProfileId();

  if (profileId) {
    await clearListDraftCookie();
    const result = await createDraft(
      {
        listType: "custom",
        title,
        year: year && Number.isFinite(year) ? Math.floor(year) : undefined,
      },
      { profileId },
    );
    if ("error" in result) {
      redirect(`/create/custom?error=${encodeURIComponent(result.error)}`);
    }
    redirect(`/create/custom?id=${result.list.publicId}`);
  }

  const params = new URLSearchParams({ title });
  if (year && Number.isFinite(year)) params.set("year", String(Math.floor(year)));
  redirect(`/create/custom?${params.toString()}`);
}

export async function discardAnonDraftAction(formData?: FormData) {
  await clearListDraftCookie();
  const cookie = await readListEditCookie();
  if (cookie) {
    const access = await accessFor(cookie.publicId);
    // Only wipe anonymous edit-cookie drafts, not owned account lists.
    if (!access.profileId) {
      await resetDraft(cookie.publicId, access).catch(() => null);
    }
    await clearListEditCookie();
  }
  const nextRaw = formData ? String(formData.get("next") ?? "/create") : "/create";
  const next =
    nextRaw.startsWith("/create") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/create";
  redirect(next);
}

function parseClientDraftPayload(formData: FormData): unknown {
  const payload = String(formData.get("draftJson") ?? "");
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function saveOwnedListAction(
  _prev: { error?: string; saved?: boolean; publicId?: string } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean; publicId?: string }> {
  const profileId = await currentProfileId();
  if (!profileId) {
    return {
      error:
        "Sign in to save this list to your account. Your ranking is already kept on this device.",
    };
  }

  const draft = parseClientDraftPayload(formData);
  if (!draft) return { error: "Could not save the ranking." };

  const publicId =
    typeof (draft as { publicId?: string }).publicId === "string"
      ? (draft as { publicId: string }).publicId
      : null;
  const cookie = await readListEditCookie();
  const editSecret =
    publicId && cookie?.publicId === publicId ? cookie.secret : null;

  const result = await saveOwnedListFromClientDraft(draft, {
    profileId,
    editSecret,
  });
  if ("error" in result) return { error: result.error };

  const votesRaw = String(formData.get("categoryVotesJson") ?? "").trim();
  if (votesRaw && result.list.listType === "goty") {
    let parsedVotes: unknown;
    try {
      parsedVotes = JSON.parse(votesRaw);
    } catch {
      return { error: "Could not save category picks." };
    }
    const votes = replaceCategoryVotesSchema.safeParse(parsedVotes);
    if (!votes.success) {
      return { error: "Only one game per category." };
    }
    const written = await replaceCategoryVotesForList(
      result.list.id,
      votes.data,
    );
    if ("error" in written) return { error: written.error };
    await syncLiveAggregateForOwnedList(result.list);
  }

  await clearListDraftCookie();

  revalidatePath(`/create/goty`);
  revalidatePath(`/create/custom`);
  revalidatePath(`/game-of-the-year`);
  if (result.list.year != null) {
    revalidatePath(`/game-of-the-year/${result.list.year}`);
  }
  revalidatePath("/");
  revalidatePath("/standings");
  const share = await getListShareTarget(result.list);
  revalidatePath(share.path);
  revalidatePath(`/l/${result.list.publicId}`);
  return { saved: true, publicId: result.list.publicId };
}

/** Anon (or owner) auto-persist while editing an existing shared list. */
export async function syncSharedListAction(
  draftJson: string,
): Promise<{ error?: string; ok?: boolean; publicId?: string }> {
  let draft: unknown;
  try {
    draft = JSON.parse(draftJson);
  } catch {
    return { error: "Could not save the ranking." };
  }
  if (!draft || typeof draft !== "object") {
    return { error: "Could not save the ranking." };
  }

  const publicId =
    typeof (draft as { publicId?: string }).publicId === "string"
      ? (draft as { publicId: string }).publicId
      : null;
  if (!publicId) return { error: "List not found." };

  const profileId = await currentProfileId();
  const cookie = await readListEditCookie();
  const editSecret =
    cookie?.publicId === publicId ? cookie.secret : null;

  const result = await syncExistingSharedListFromClientDraft(draft, {
    profileId,
    editSecret,
  });
  if ("error" in result) return { error: result.error };

  const share = await getListShareTarget(result.list);
  revalidatePath(share.path);
  revalidatePath(`/l/${result.list.publicId}`);
  revalidatePath(`/create/goty`);
  revalidatePath(`/create/custom`);
  return { ok: true, publicId: result.list.publicId };
}

export async function shareListAction(formData: FormData) {
  const draft = parseClientDraftPayload(formData);
  if (!draft || typeof draft !== "object") {
    redirect(
      `/create?error=${encodeURIComponent("Could not share this list.")}`,
    );
  }

  const listType =
    (draft as { listType?: string }).listType === "custom" ? "custom" : "goty";
  const publicIdHint =
    typeof (draft as { publicId?: string }).publicId === "string"
      ? (draft as { publicId: string }).publicId
      : null;

  const profileId = await currentProfileId();
  const cookie = await readListEditCookie();
  const editSecret =
    publicIdHint && cookie?.publicId === publicIdHint ? cookie.secret : null;

  const result = await shareListFromClientDraft(draft, {
    profileId,
    editSecret,
  });

  if ("error" in result) {
    redirect(
      `/create/${listType}?error=${encodeURIComponent(result.error)}`,
    );
  }

  if (result.editSecret) {
    await setListEditCookie({
      publicId: result.list.publicId,
      secret: result.editSecret,
    });
  }

  if (!profileId) {
    const d = draft as {
      listType?: "goty" | "custom";
      title?: string;
      year?: number | null;
      items?: { igdbId: number }[];
    };
    await setListDraftCookie(
      buildListDraftPayload({
        listType: d.listType === "custom" ? "custom" : "goty",
        title: d.title ?? result.list.title,
        year: d.year ?? result.list.year,
        igdbIds: (d.items ?? []).map((item) => item.igdbId),
        slotCount: Math.max(10, (d.items ?? []).length),
        publicId: result.list.publicId,
      }),
    );
  } else {
    await clearListDraftCookie();
  }

  const share = await getListShareTarget(result.list);
  revalidatePath(share.path);
  redirect(share.path);
}

export async function resetActiveDraftAction() {
  return discardAnonDraftAction();
}

export async function claimListAction(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  const auth = getAuthOrNull();
  if (!auth) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/l/${publicId}`)}`);
  }
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/l/${publicId}`)}`);
  }
  const profile = await getProfileByAuthUserId(session.user.id);
  if (!profile) {
    redirect(`/account?next=${encodeURIComponent(`/l/${publicId}`)}`);
  }

  const cookie = await readListEditCookie();
  const editSecret =
    cookie?.publicId === publicId ? cookie.secret : null;

  const result = await claimList(publicId, {
    profileId: profile.id,
    editSecret,
  });
  if ("error" in result) {
    redirect(`/l/${publicId}?error=${encodeURIComponent(result.error)}`);
  }
  await clearListEditCookie();
  await clearListDraftCookie();
  const share = await getListShareTarget(result.list);
  revalidatePath(share.path);
  revalidatePath(`/u/${profile.username}`);
  redirect(`${share.path}?saved=1`);
}

export async function loadEditorState(publicId: string) {
  const access = await accessFor(publicId);
  return getEditableList(publicId, access);
}

export async function hydrateDraftGamesAction(igdbIds: number[]) {
  return hydrateGamesByIgdbIds(igdbIds);
}
