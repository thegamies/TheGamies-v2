import {
  hydrateGamesByIgdbIds,
  type HydratedDraftGame,
} from "@/lib/lists/service";
import type { ListDraftPayload } from "@/lib/lists/draft-cookie";

export type AnonEditorSeed = {
  publicId: string | null;
  title: string;
  year: number | null;
  slotCount: number;
  listFormat?: "poster" | "list" | "grid";
  rankStyle?: "banner" | "chip" | "off";
  showSuffix?: boolean;
  items: {
    gameId: string;
    igdbId: number;
    slug: string;
    title: string;
    year: number | null;
    coverUrl: string | null;
    rank: number;
    blurb: string;
  }[];
};

export function draftMatchesGoty(
  draft: ListDraftPayload,
  year: number,
): boolean {
  return draft.listType === "goty" && draft.year === year;
}

export function draftMatchesCustom(
  draft: ListDraftPayload,
  title: string,
): boolean {
  return (
    draft.listType === "custom" &&
    draft.title.trim().toLowerCase() === title.trim().toLowerCase()
  );
}

export async function editorSeedFromDraft(
  draft: ListDraftPayload,
): Promise<AnonEditorSeed> {
  const games = await hydrateGamesByIgdbIds(draft.igdbIds);
  const byIgdb = new Map<number, HydratedDraftGame>(
    games.map((g) => [g.igdbId, g]),
  );
  return {
    publicId: draft.publicId ?? null,
    title: draft.title,
    year: draft.year,
    slotCount: draft.slotCount,
    listFormat: draft.listFormat,
    rankStyle: draft.rankStyle,
    showSuffix: draft.showSuffix,
    items: draft.igdbIds
      .map((id, index) => {
        const game = byIgdb.get(id);
        if (!game) return null;
        return {
          gameId: game.gameId,
          igdbId: game.igdbId,
          slug: game.slug,
          title: game.title,
          year: game.year,
          coverUrl: game.coverUrl,
          rank: index + 1,
          blurb: "",
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };
}
