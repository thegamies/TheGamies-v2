import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  gotyCreatorCta,
  type GotyCreatorCta,
} from "@/lib/lists/existing-goty";
import { mapOwnedGotyPublicIdsByYear } from "@/lib/lists/service";

/** One small owned-GOTY lookup for the years on screen. Unsigned → create CTAs. */
export async function loadGotyCreatorCtas(
  years: number[],
): Promise<Map<number, GotyCreatorCta>> {
  const unique = [...new Set(years)];
  const ctas = new Map<number, GotyCreatorCta>();
  let owned = new Map<number, string>();

  const user = await getRequestSessionUser();
  if (user?.id) {
    const profile = await getRequestProfileByAuthUserId(user.id).catch(
      () => null,
    );
    if (profile?.id) {
      owned = await mapOwnedGotyPublicIdsByYear(profile.id, unique).catch(
        () => new Map(),
      );
    }
  }

  for (const year of unique) {
    ctas.set(year, gotyCreatorCta(year, owned.get(year) ?? null));
  }
  return ctas;
}
