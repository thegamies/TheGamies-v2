import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { listSiteLeaderboard } from "@/lib/tga-pickem/scores";
import { getTgaYear, listTgaBallot } from "@/lib/tga-pickem/service";
import { AdminTgaGate } from "../../AdminTgaGate";
import { AdminTgaShowClient } from "./AdminTgaShowClient";

type Params = Promise<{ year: string }>;

export const metadata: Metadata = {
  title: "Video Game Awards Pick’em show",
  robots: { index: false, follow: false },
};

export default async function AdminTgaShowPage({ params }: { params: Params }) {
  const { year: raw } = await params;
  const year = Number(raw);
  if (!Number.isInteger(year)) notFound();
  const authorized = await isAdminAuthorized();
  const slate = authorized ? await getTgaYear(year).catch(() => null) : null;
  if (authorized && !slate) notFound();
  const ballot = authorized && slate ? await listTgaBallot(year) : [];
  const board =
    authorized && slate
      ? await listSiteLeaderboard(year, 1).catch(() => ({
          rows: [],
          total: 0,
          page: 1,
          totalPages: 1,
        }))
      : { rows: [], total: 0, page: 1, totalPages: 1 };
  const called = ballot.filter((category) => category.winnerNomineeId).length;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href={`/admin/the-game-awards/${year}`} className="hover:text-ink">
          {year} setup
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Show room
      </h1>
      <div className="mt-10">
        <AdminTgaGate authorized={authorized}>
          {slate ? (
            <AdminTgaShowClient
              year={year}
              called={called}
              total={ballot.length}
              officialWp={slate.worldPremieresOfficial}
              categories={ballot}
              topRows={board.rows.slice(0, 8)}
            />
          ) : null}
        </AdminTgaGate>
      </div>
    </main>
  );
}
