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
import {
  claimList,
  getEditableList,
  hydrateGamesByIgdbIds,
  resetDraft,
  saveOwnedListFromClientDraft,
  shareListFromClientDraft,
} from "@/lib/lists/service";
import { getProfileByAuthUserId } from "@/lib/profile/service";

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
  redirect(`/create/goty?year=${Math.floor(year)}`);
}

export async function startCustomDraftAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  if (!title) {
    redirect(
      `/create/custom?error=${encodeURIComponent("Give your list a title.")}`,
    );
  }
  const params = new URLSearchParams({ title });
  if (yearRaw) {
    const year = Number(yearRaw);
    if (Number.isFinite(year)) params.set("year", String(Math.floor(year)));
  }
  redirect(`/create/custom?${params.toString()}`);
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

  revalidatePath(`/create/goty`);
  revalidatePath(`/create/custom`);
  revalidatePath(`/l/${result.list.publicId}`);
  return { saved: true, publicId: result.list.publicId };
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

  revalidatePath(`/l/${result.list.publicId}`);
  redirect(`/l/${result.list.publicId}`);
}

export async function resetActiveDraftAction() {
  const cookie = await readListEditCookie();
  if (cookie) {
    const access = await accessFor(cookie.publicId);
    await resetDraft(cookie.publicId, access);
    await clearListEditCookie();
  }
  await clearListDraftCookie();
  redirect("/create");
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
  revalidatePath(`/l/${publicId}`);
  revalidatePath(`/u/${profile.username}`);
  redirect(`/l/${publicId}?saved=1`);
}

export async function loadEditorState(publicId: string) {
  const access = await accessFor(publicId);
  return getEditableList(publicId, access);
}

export async function hydrateDraftGamesAction(igdbIds: number[]) {
  return hydrateGamesByIgdbIds(igdbIds);
}

export async function getCreateSessionAction(): Promise<{
  signedIn: boolean;
}> {
  const profileId = await currentProfileId();
  return { signedIn: Boolean(profileId) };
}
