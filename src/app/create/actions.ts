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
  claimList,
  createDraft,
  getEditableList,
  publishList,
  replaceItems,
  resetDraft,
  updateListMeta,
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
  const profileId = await currentProfileId();
  const result = await createDraft(
    { listType: "goty", year },
    { profileId },
  );
  if ("error" in result) {
    redirect(`/create/goty?error=${encodeURIComponent(result.error)}`);
  }
  await setListEditCookie({
    publicId: result.list.publicId,
    secret: result.editSecret,
  });
  redirect(`/create/goty?id=${result.list.publicId}`);
}

export async function startCustomDraftAction(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const yearRaw = String(formData.get("year") ?? "").trim();
  const profileId = await currentProfileId();
  const result = await createDraft(
    {
      listType: "custom",
      title,
      year: yearRaw ? Number(yearRaw) : undefined,
    },
    { profileId },
  );
  if ("error" in result) {
    redirect(`/create/custom?error=${encodeURIComponent(result.error)}`);
  }
  await setListEditCookie({
    publicId: result.list.publicId,
    secret: result.editSecret,
  });
  redirect(`/create/custom?id=${result.list.publicId}`);
}

export async function saveListItemsAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const publicId = String(formData.get("publicId") ?? "");
  const payload = String(formData.get("itemsJson") ?? "[]");
  let items: unknown;
  try {
    items = JSON.parse(payload);
  } catch {
    return { error: "Could not save the ranking." };
  }

  const access = await accessFor(publicId);
  const title = String(formData.get("title") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();

  if (title || yearRaw) {
    const meta = await updateListMeta(
      publicId,
      {
        title: title || undefined,
        year: yearRaw ? Number(yearRaw) : undefined,
      },
      access,
    );
    if ("error" in meta) return { error: meta.error };
  }

  const result = await replaceItems(publicId, items, access);
  if ("error" in result) return { error: result.error };

  revalidatePath(`/create/goty`);
  revalidatePath(`/create/custom`);
  revalidatePath(`/l/${publicId}`);
  return null;
}

export async function publishListAction(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  const itemsJson = String(formData.get("itemsJson") ?? "");
  const access = await accessFor(publicId);

  if (itemsJson) {
    let items: unknown;
    try {
      items = JSON.parse(itemsJson);
    } catch {
      redirect(
        `/create/${String(formData.get("listType") ?? "goty")}?id=${publicId}&error=${encodeURIComponent("Could not save the ranking.")}`,
      );
    }
    const title = String(formData.get("title") ?? "").trim();
    const yearRaw = String(formData.get("year") ?? "").trim();
    if (title || yearRaw) {
      const meta = await updateListMeta(
        publicId,
        {
          title: title || undefined,
          year: yearRaw ? Number(yearRaw) : undefined,
        },
        access,
      );
      if ("error" in meta) {
        redirect(
          `/create/${String(formData.get("listType") ?? "goty")}?id=${publicId}&error=${encodeURIComponent(meta.error)}`,
        );
      }
    }
    const saved = await replaceItems(publicId, items, access);
    if ("error" in saved) {
      redirect(
        `/create/${String(formData.get("listType") ?? "goty")}?id=${publicId}&error=${encodeURIComponent(saved.error)}`,
      );
    }
  }

  const result = await publishList(publicId, access);
  if ("error" in result) {
    redirect(
      `/create/${String(formData.get("listType") ?? "goty")}?id=${publicId}&error=${encodeURIComponent(result.error)}`,
    );
  }
  revalidatePath(`/l/${publicId}`);
  redirect(`/l/${publicId}`);
}

export async function resetDraftAction(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  const listType = String(formData.get("listType") ?? "goty");
  const access = await accessFor(publicId);
  const result = await resetDraft(publicId, access);
  if ("error" in result) {
    redirect(
      `/create/${listType}?id=${publicId}&error=${encodeURIComponent(result.error)}`,
    );
  }
  await clearListEditCookie();
  redirect(`/create/${listType}`);
}

export async function resetActiveDraftAction() {
  const cookie = await readListEditCookie();
  if (cookie) {
    const access = await accessFor(cookie.publicId);
    await resetDraft(cookie.publicId, access);
    await clearListEditCookie();
  }
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
