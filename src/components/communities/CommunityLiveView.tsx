import { LiveStandingsBoard } from "@/components/live-aggregate/LiveStandingsBoard";
import type { StandingsPage } from "@/lib/live-aggregate/service";

export function CommunityLiveView({
  slug,
  communityName,
  page,
  yearOptions,
  locked,
}: {
  slug: string;
  communityName: string;
  page: StandingsPage;
  yearOptions: number[];
  locked: boolean;
}) {
  const basePath = `/communities/${slug}/live/${page.year}`;
  const statusNotes: string[] = [];
  if (locked) {
    statusNotes.push(
      "Standings are locked. Rank order will not change until they are unlocked.",
    );
  }

  const listParts: string[] = [];
  if (page.listCount > 0) {
    listParts.push(
      `${page.listCount} list${page.listCount === 1 ? "" : "s"}`,
    );
  }
  if (locked) listParts.push("Locked");

  return (
    <div className="mt-10">
      <LiveStandingsBoard
        page={page}
        yearOptions={yearOptions}
        basePath={basePath}
        title={`${page.year} Live Rankings`}
        headingLevel="h2"
        listCountLabel={listParts.length > 0 ? listParts.join(" · ") : null}
        statusNotes={statusNotes}
        emptyGoty={`No live standings for this year yet. ${communityName} member Game of the Year lists will appear here as they are saved.`}
        emptyCategories="No category votes for this group yet."
      />
    </div>
  );
}
