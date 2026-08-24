export function isHiddenImageTypeName(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase() === "logo";
}

export type ArtworkGroup<T extends { imageTypeName: string | null }> = {
  label: string;
  items: T[];
};

/** Group visible artworks by Image Type. Logos are omitted. Untyped → Artwork. */
export function groupArtworksByImageType<
  T extends { imageTypeName: string | null },
>(items: T[]): ArtworkGroup<T>[] {
  const visible = items.filter((item) => !isHiddenImageTypeName(item.imageTypeName));
  const buckets = new Map<string, T[]>();
  for (const item of visible) {
    const label = item.imageTypeName?.trim() || "Artwork";
    const list = buckets.get(label) ?? [];
    list.push(item);
    buckets.set(label, list);
  }
  const named = [...buckets.entries()]
    .filter(([label]) => label !== "Artwork")
    .sort(([a], [b]) => a.localeCompare(b));
  const leftover = buckets.get("Artwork");
  const groups: ArtworkGroup<T>[] = named.map(([label, grouped]) => ({
    label,
    items: grouped,
  }));
  if (leftover?.length) {
    groups.push({ label: "Artwork", items: leftover });
  }
  return groups;
}

export type ImageChapterItem = {
  igdbId: number;
  imageUrl: string;
  width: number | null;
  height: number | null;
};

export type ImageChapter = {
  id: string;
  label: string;
  items: ImageChapterItem[];
};

/** Artwork types (Logo omitted) for one strip + type tabs. */
export function imageChaptersFromMedia(
  artworks: Array<{
    igdbId: number;
    imageUrl: string;
    imageTypeName: string | null;
    width: number | null;
    height: number | null;
  }>,
): ImageChapter[] {
  return groupArtworksByImageType(artworks).map((group) => ({
    id: `artwork:${group.label}`,
    label: group.label,
    items: group.items.map((item) => ({
      igdbId: item.igdbId,
      imageUrl: item.imageUrl,
      width: item.width,
      height: item.height,
    })),
  }));
}
