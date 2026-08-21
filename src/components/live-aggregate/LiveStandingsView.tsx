import Link from "next/link";
import { LiveStandingsBoard } from "@/components/live-aggregate/LiveStandingsBoard";
import type { StandingsPage } from "@/lib/live-aggregate/service";

export function LiveStandingsView({
  page,
  yearOptions,
}: {
  page: StandingsPage;
  yearOptions: number[];
}) {
  const basePath = `/game-of-the-year/${page.year}`;
  const statusNotes: string[] = [];
  if (!page.scoresFresh && page.gotyPublic) {
    statusNotes.push("Standings are catching up with recent list changes.");
  }

  const emptyGoty = page.gotyPublic
    ? "No standings for this year yet. Signed-in Game of the Year lists will appear here as they are saved."
    : "This year's board is still coming together.";
  const emptyCategories = page.categoriesPublic
    ? "No category votes for this group yet."
    : "This year's category boards are still coming together.";

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] py-[var(--page-pad-y)]">
      <LiveStandingsBoard
        page={page}
        yearOptions={yearOptions}
        basePath={basePath}
        title={`${page.year} Game of the Year`}
        listCountLabel={
          page.gotyPublic && page.listCount > 0
            ? `${page.listCount} list${page.listCount === 1 ? "" : "s"}`
            : null
        }
        statusNotes={statusNotes}
        emptyGoty={emptyGoty}
        emptyCategories={emptyCategories}
        showRankingsInfo
        footer={
          <p className="mt-14 text-sm text-muted">
            Building your own list?{" "}
            <Link href="/create/goty" className="text-accent hover:underline">
              Create a Game of the Year ranking
            </Link>
            .
          </p>
        }
      />
    </main>
  );
}
