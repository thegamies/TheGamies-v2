import type { EditionResultsViewId } from "@/lib/communities/edition-results-scoring";

export type EditionEventTabId = "show" | "ballot" | "voters" | "settings";

/** Pre-publish / host-settings strip highlight from `?view=`. */
export function editionEventTabActive(
  view: EditionResultsViewId,
): EditionEventTabId {
  if (view === "settings" || view === "hosts" || view === "preview") {
    return "settings";
  }
  if (view === "voters") return "voters";
  if (
    view === "show" ||
    view === "overview" ||
    view === "standings" ||
    view === "categories" ||
    view === "category"
  ) {
    return "show";
  }
  return "ballot";
}
