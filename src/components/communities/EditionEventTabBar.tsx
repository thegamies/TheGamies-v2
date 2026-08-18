"use client";

import { useSearchParams } from "next/navigation";
import { EditionEventTabs } from "@/components/communities/EditionEventTabs";
import { EditionResultsViewNav } from "@/components/communities/EditionResultsViewNav";
import { editionEventTabActive } from "@/lib/communities/edition-event-nav";
import {
  parseEditionResultMode,
  parseEditionResultsView,
} from "@/lib/communities/edition-results-scoring";

/**
 * Persistent event tab strip. Reads `?view=` on the client so the server
 * layout does not wait on searchParams (header + tabs stay while content loads).
 */
export function EditionEventTabBar({
  slug,
  year,
  published,
  canManage,
  hasYourBallot,
  includeVoters,
  includeRevealShow,
  ballotLabel,
}: {
  slug: string;
  year: number;
  published: boolean;
  canManage: boolean;
  hasYourBallot: boolean;
  includeVoters: boolean;
  includeRevealShow: boolean;
  ballotLabel: string;
}) {
  const sp = useSearchParams();
  const view = parseEditionResultsView(sp.get("view") ?? undefined);
  const mode = parseEditionResultMode(sp.get("mode") ?? undefined);
  const showPublishedResultsNav =
    published &&
    view !== "settings" &&
    view !== "hosts" &&
    view !== "preview";

  if (showPublishedResultsNav) {
    return (
      <EditionResultsViewNav
        slug={slug}
        year={year}
        hasYourBallot={hasYourBallot}
        canManage={canManage}
      />
    );
  }

  return (
    <EditionEventTabs
      slug={slug}
      year={year}
      canManage={canManage}
      active={editionEventTabActive(view)}
      includeVoters={includeVoters}
      includeRevealShow={includeRevealShow}
      ballotLabel={ballotLabel}
      mode={mode}
    />
  );
}
