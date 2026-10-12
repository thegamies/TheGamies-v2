import { LOADTEST_TGA_YEAR } from "@/lib/qa/loadtest";

/** Synthetic Pick’em scale fixtures. No Neon Auth. */
export const PICKEM_SCALE_AUTH_PREFIX = "seed:pickemscale:";
export const PICKEM_SCALE_USERNAME_PREFIX = "seedpmu";
export const PICKEM_SCALE_SLUG_PREFIX = "seed_pem_";
export const PICKEM_SCALE_MAX = 1000;
export const PICKEM_SCALE_DEFAULT_YEAR = LOADTEST_TGA_YEAR;

export function pickemScaleAuthUserId(index: number): string {
  return `${PICKEM_SCALE_AUTH_PREFIX}${String(index).padStart(4, "0")}`;
}

export function pickemScaleUsername(index: number): string {
  return `${PICKEM_SCALE_USERNAME_PREFIX}${String(index).padStart(4, "0")}`;
}

export function pickemScaleDisplayName(index: number): string {
  return `Pickem Scale ${String(index).padStart(4, "0")}`;
}

export function pickemScaleCommunitySlug(index: number): string {
  return `${PICKEM_SCALE_SLUG_PREFIX}${String(index).padStart(4, "0")}`;
}

export function pickemScaleCommunityName(index: number): string {
  return `Pickem Scale ${String(index).padStart(4, "0")}`;
}

export function pickemScaleAuthBounds(users: number): {
  first: string;
  last: string;
} {
  const n = Math.max(1, Math.min(PICKEM_SCALE_MAX, Math.floor(users)));
  return {
    first: pickemScaleAuthUserId(1),
    last: pickemScaleAuthUserId(n),
  };
}

export function parsePickemScaleCount(
  raw: unknown,
  label: string,
): number | { error: string } {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  if (!Number.isInteger(n) || n < 1) {
    return { error: `${label} must be an integer from 1 to ${PICKEM_SCALE_MAX}.` };
  }
  if (n > PICKEM_SCALE_MAX) {
    return { error: `${label} cannot exceed ${PICKEM_SCALE_MAX}.` };
  }
  return n;
}

export function pickemScaleSheetCount(communities: number, users: number): number {
  return communities * users;
}
