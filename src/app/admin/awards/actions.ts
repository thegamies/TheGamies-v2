"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthorized } from "@/lib/admin-auth";
import {
  awardCategoryRevalidatePaths,
  createAwardCategory,
  updateAwardCategory,
} from "@/lib/live-aggregate/award-category-admin";

async function requireAdmin() {
  if (!(await isAdminAuthorized())) {
    return { error: "You cannot use these tools." } as const;
  }
  return null;
}

function flag(data: FormData, name: string): boolean {
  const value = data.get(name);
  return value === "on" || value === "true" || value === "1";
}

function writeFromForm(data: FormData) {
  return {
    label: data.get("label"),
    description: data.get("description"),
    categoryGroup: data.get("categoryGroup"),
    eligibility: data.get("eligibility"),
    sortOrder: data.get("sortOrder"),
    allowEditions: flag(data, "allowEditions"),
    allowDlcAddon: flag(data, "allowDlcAddon"),
    currentOrPreviousYear: flag(data, "currentOrPreviousYear"),
    active: flag(data, "active"),
  };
}

function revalidateAwards() {
  for (const path of awardCategoryRevalidatePaths()) {
    revalidatePath(path);
  }
}

export async function createAwardCategoryAction(
  formData: FormData,
): Promise<{ error: string } | void> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await createAwardCategory(writeFromForm(formData));
  if ("error" in result) return result;
  revalidateAwards();
  redirect(`/admin/awards/${result.id}`);
}

export async function updateAwardCategoryAction(
  formData: FormData,
): Promise<{ error: string } | void> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = typeof formData.get("id") === "string" ? formData.get("id") : "";
  const result = await updateAwardCategory(String(id), writeFromForm(formData));
  if ("error" in result) return result;
  revalidateAwards();
  revalidatePath(`/admin/awards/${id}`);
}
