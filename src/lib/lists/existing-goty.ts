import { withListShareView } from "@/lib/lists/urls";

/** Edit URL for an owned GOTY list opened from the existing-year preview. */
export function existingGotyEditHref(publicId: string): string {
  return `/create/goty?id=${encodeURIComponent(publicId)}`;
}

/** Year-picker page with existing-list preview for that year (same page). */
export function existingGotyPreviewHref(year: number): string {
  return `/create/goty?year=${encodeURIComponent(String(year))}`;
}

export type GotyCreatorCta = {
  listLabel: "Create list" | "My list";
  listHref: string;
  categoriesLabel: "Make picks" | "My picks";
  categoriesHref: string;
};

/** Standings CTAs into the GOTY creator for this year. */
export function gotyCreatorCta(
  year: number,
  publicId: string | null | undefined,
): GotyCreatorCta {
  if (publicId) {
    const listHref = existingGotyEditHref(publicId);
    return {
      listLabel: "My list",
      listHref,
      categoriesLabel: "My picks",
      categoriesHref: withListShareView(listHref, "categories"),
    };
  }
  const listHref = existingGotyPreviewHref(year);
  return {
    listLabel: "Create list",
    listHref,
    categoriesLabel: "Make picks",
    categoriesHref: withListShareView(listHref, "categories"),
  };
}

/** Label + href for the standings view currently on screen. */
export function gotyCreatorCtaForView(
  cta: GotyCreatorCta,
  view: string,
): { label: string; href: string } {
  if (view === "categories" || view === "category") {
    return { label: cta.categoriesLabel, href: cta.categoriesHref };
  }
  return { label: cta.listLabel, href: cta.listHref };
}
