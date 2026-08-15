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
  if (!page.scoresFresh) {
    statusNotes.push("Standings are catching up with recent list changes.");
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] py-10">
      <LiveStandingsBoard
        page={page}
        yearOptions={yearOptions}
        basePath={basePath}
        title={`${page.year} Game of the Year`}
        listCountLabel={
          page.listCount > 0
            ? `${page.listCount} list${page.listCount === 1 ? "" : "s"}`
            : null
        }
        statusNotes={statusNotes}
        emptyGoty="No standings for this year yet. Signed-in Game of the Year lists will appear here as they are saved."
        emptyCategories="No category votes for this group yet."
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
