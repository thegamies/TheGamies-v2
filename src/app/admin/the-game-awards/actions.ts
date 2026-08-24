"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { readR2AvatarConfigFromEnv } from "@/lib/profile/avatar-upload";
import { uploadTgaNomineeImageObject } from "@/lib/tga-pickem/nominee-image";
import { callTgaWinner, setOfficialWorldPremieres } from "@/lib/tga-pickem/scores";
import {
  addGameNominee,
  addOtherNominee,
  copyTgaCategories,
  createTgaCategory,
  createTgaYear,
  deleteTgaCategory,
  detachNominee,
  goLiveTgaYear,
  load2025Categories,
  load2025Nominees,
  load2025Winners,
  parseTgaYear,
  saveTgaSchedule,
  setNomineeImageUrl,
  setTgaEnabled,
  setTgaPromoted,
} from "@/lib/tga-pickem/service";

async function requireAdmin() {
  if (!(await isAdminAuthorized())) {
    return { error: "Unauthorized." } as const;
  }
  return null;
}

function revalidateTga(year?: number) {
  revalidatePath("/admin/the-game-awards");
  revalidatePath("/the-game-awards");
  revalidatePath("/");
  if (year) {
    revalidatePath(`/admin/the-game-awards/${year}`);
    revalidatePath(`/admin/the-game-awards/${year}/show`);
    revalidatePath(`/the-game-awards/${year}`);
  }
}

export async function createTgaYearAction(year: number) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = parseTgaYear(year);
  if (typeof parsed !== "number") return parsed;
  const result = await createTgaYear(parsed);
  if ("error" in result) return result;
  revalidateTga(parsed);
  return { ok: true as const, year: parsed };
}

export async function saveTgaScheduleAction(
  year: number,
  opensAt: string,
  showStartsAt: string,
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await saveTgaSchedule(year, {
    opensAt: new Date(opensAt),
    showStartsAt: new Date(showStartsAt),
  });
  if ("error" in result) return result;
  revalidateTga(year);
  return { ok: true as const };
}

export async function setTgaEnabledAction(year: number, enabled: boolean) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await setTgaEnabled(year, enabled);
  if ("error" in result) return result;
  revalidateTga(year);
  return { ok: true as const };
}

export async function goLiveTgaYearAction(year: number) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await goLiveTgaYear(year);
  if ("error" in result) return result;
  revalidateTga(year);
  return { ok: true as const };
}

export async function setTgaPromotedAction(year: number, promoted: boolean) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await setTgaPromoted(year, promoted);
  if ("error" in result) return result;
  revalidateTga(year);
  return { ok: true as const };
}

export async function load2025CategoriesAction(year: number) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await load2025Categories(year);
  if ("error" in result) return result;
  revalidateTga(year);
  return result;
}

export async function load2025NomineesAction(year: number) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await load2025Nominees(year);
  if ("error" in result) return result;
  revalidateTga(year);
  return result;
}

export async function load2025WinnersAction(year: number) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await load2025Winners(year);
  if ("error" in result) return result;
  revalidateTga(year);
  return result;
}

export async function copyTgaCategoriesAction(
  fromYear: number,
  toYear: number,
  replace: boolean,
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await copyTgaCategories(fromYear, toYear, replace);
  if ("error" in result) return result;
  revalidateTga(toYear);
  return { ok: true as const };
}

export async function createTgaCategoryAction(
  year: number,
  label: string,
  kind: "game" | "other",
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await createTgaCategory(year, { label, kind });
  if ("error" in result) return result;
  revalidateTga(year);
  return { ok: true as const };
}

export async function deleteTgaCategoryAction(year: number, categoryId: string) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await deleteTgaCategory(categoryId);
  if ("error" in result) return result;
  revalidateTga(year);
  return { ok: true as const };
}

export async function addGameNomineeAction(
  year: number,
  categoryId: string,
  gameId: string,
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await addGameNominee(year, categoryId, gameId);
  if ("error" in result) return result;
  revalidateTga(year);
  return { ok: true as const };
}

export async function addOtherNomineeAction(
  year: number,
  categoryId: string,
  displayName: string,
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await addOtherNominee(year, categoryId, displayName);
  if ("error" in result) return result;
  revalidateTga(year);
  return result;
}

export async function detachNomineeAction(
  year: number,
  categoryId: string,
  nomineeId: string,
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await detachNominee(categoryId, nomineeId);
  if ("error" in result) return result;
  revalidateTga(year);
  return { ok: true as const };
}

export async function uploadNomineeImageAction(formData: FormData) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const year = Number(formData.get("year"));
  const nomineeId = String(formData.get("nomineeId") ?? "");
  const file = formData.get("image");
  if (!Number.isInteger(year) || !nomineeId) {
    return { error: "Missing nominee." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  const config = readR2AvatarConfigFromEnv();
  if (!config) return { error: "Image upload is not available right now." };
  const body = await file.arrayBuffer();
  try {
    const { imageUrl } = await uploadTgaNomineeImageObject(config, {
      year,
      nomineeId,
      body,
    });
    const saved = await setNomineeImageUrl(nomineeId, imageUrl);
    if ("error" in saved) return saved;
    revalidateTga(year);
    return { ok: true as const, imageUrl };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Photo could not be saved.",
    };
  }
}

export async function callTgaWinnerAction(
  year: number,
  categoryId: string,
  nomineeId: string | null,
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await callTgaWinner(year, categoryId, nomineeId);
  if ("error" in result) return result;
  revalidateTga(year);
  return { ok: true as const };
}

export async function saveTgaShowAction(
  year: number,
  input: {
    winners: Record<string, string | null>;
    worldPremieres: number | null;
  },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  for (const [categoryId, nomineeId] of Object.entries(input.winners)) {
    const result = await callTgaWinner(year, categoryId, nomineeId);
    if ("error" in result) return result;
  }
  const wp = await setOfficialWorldPremieres(year, input.worldPremieres);
  if ("error" in wp) return wp;
  revalidateTga(year);
  return { ok: true as const };
}

export async function setOfficialWorldPremieresAction(
  year: number,
  count: number | null,
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await setOfficialWorldPremieres(year, count);
  if ("error" in result) return result;
  revalidateTga(year);
  return { ok: true as const };
}
