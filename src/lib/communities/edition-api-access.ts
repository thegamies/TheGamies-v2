import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { getEditionByCommunityYear } from "./editions";
import { canBrowseCommunityBoards } from "./schema";
import { getCommunityBySlug } from "./service";

/**
 * Published edition the viewer may browse, with the same board gate as the
 * edition pages. `null` means the caller should answer 404 — never reveal
 * whether a private community or unpublished year exists.
 */
export async function loadBrowsablePublishedEdition(slug: string, year: number) {
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  const community = await getCommunityBySlug(slug, profile?.id);
  if (!community) return null;
  if (
    !canBrowseCommunityBoards(
      community.visibility,
      community.joinsClosed,
      community.viewerRole,
    )
  ) {
    return null;
  }

  const edition = await getEditionByCommunityYear(community.id, year);
  if (!edition || edition.status !== "published") return null;

  return { community, edition, viewerProfileId: profile?.id ?? null };
}
