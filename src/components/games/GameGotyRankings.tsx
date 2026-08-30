import type { ReactNode } from "react";
import Link from "next/link";
import { RankMarker } from "@/components/ui/RankMarker";
import { SectionRule } from "@/components/ui/SectionRule";
import {
  hasGameGotyPresence,
  type GameGotyRankings as GameGotyRankingsData,
  type GameGotyYearRanking,
} from "@/lib/live-aggregate/game-rankings";

export const GOTY_RANKING_LAYOUTS = [
  "standings-line",
  "masthead",
  "folio",
  "scoreboard",
  "lede",
  "chapter",
  "classic",
  "legacy",
  "broadcast",
  "broadcast-compact",
] as const;

export type GameGotyRankingLayout = (typeof GOTY_RANKING_LAYOUTS)[number];

export const GOTY_RANKING_LAYOUT_META: Record<
  GameGotyRankingLayout,
  { label: string; hint: string }
> = {
  "standings-line": {
    label: "Standings line",
    hint: "Rank in front of the year title; votes hug the line; tally as rows.",
  },
  masthead: {
    label: "Masthead",
    hint: "Hero numeral, then year as a kicker. Position as a box-score digit row.",
  },
  folio: {
    label: "Folio",
    hint: "Rank and year on the left; position tally on the right.",
  },
  scoreboard: {
    label: "Scoreboard",
    hint: "Place · votes · pts as a typeset strip, then a baseline sparkline.",
  },
  lede: {
    label: "Lede",
    hint: "Serif sentence first. Positions as middot pairs, no bars.",
  },
  chapter: {
    label: "Chapter",
    hint: "Year as the chapter title; rank below; two-column position list.",
  },
  classic: {
    label: "Classic",
    hint: "Prior Games page: year heading, three figures, vertical position chart.",
  },
  legacy: {
    label: "Old The Gamies",
    hint: "Faithful port of the prior GOTY votes card: amber rank, metric tiles, column chart.",
  },
  broadcast: {
    label: "Broadcast",
    hint: "Awards-broadcast board: orange year kicker, rank beside points and voters, column chart.",
  },
  "broadcast-compact": {
    label: "Broadcast compact",
    hint: "Current on the game page. Same board as Broadcast, with a shorter chart and tighter type.",
  },
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function broadcastChartTop(maxVotes: number): number {
  const n = Math.max(0, maxVotes);
  const padded = n + 1;
  if (padded <= 5) return 5;
  return Math.ceil(padded / 5) * 5;
}

function voteMeta(votes: number | null, score: number | null): string | null {
  if (votes == null && score == null) return null;
  const parts: string[] = [];
  if (votes != null) {
    parts.push(`${formatCount(votes)} ${votes === 1 ? "vote" : "votes"}`);
  }
  if (score != null) {
    parts.push(`${formatCount(score)} pts`);
  }
  return parts.join(" · ");
}

function YearLink({
  year,
  className,
  children,
}: {
  year: number;
  className?: string;
  children: string;
}) {
  return (
    <Link
      href={`/game-of-the-year/${year}`}
      className={className ?? "hover:text-accent"}
    >
      {children}
    </Link>
  );
}

function RevealedNote({ revealed }: { revealed: boolean }) {
  if (revealed) return null;
  return (
    <p className="mt-1 text-sm text-muted">
      Vote totals and points appear when that year’s results are revealed.
    </p>
  );
}

function PositionTally({ votesByRank }: { votesByRank: number[] }) {
  const slots = Array.from({ length: 10 }, (_, index) => ({
    listRank: index + 1,
    votes: votesByRank[index] ?? 0,
  }));
  const maxVotes = Math.max(...slots.map((slot) => slot.votes), 1);

  return (
    <table className="w-full border-collapse">
      <caption className="mb-3 text-left text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        By list position
      </caption>
      <thead className="sr-only">
        <tr>
          <th>Position</th>
          <th>Share of votes</th>
          <th>Votes</th>
        </tr>
      </thead>
      <tbody>
        {slots.map((slot) => {
          const widthPct =
            slot.votes > 0 ? Math.max((slot.votes / maxVotes) * 100, 4) : 0;
          const isTopThree = slot.listRank <= 3 && slot.votes > 0;
          return (
            <tr key={slot.listRank}>
              <th
                scope="row"
                className={`w-8 py-1 pr-3 text-left font-display text-lg leading-none tracking-wide ${
                  isTopThree ? "text-accent" : "text-muted"
                }`}
              >
                {slot.listRank}
              </th>
              <td className="py-1">
                <div className="h-2 w-full bg-line">
                  {slot.votes > 0 ? (
                    <div
                      className={`h-full ${isTopThree ? "bg-accent" : "bg-ink"}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  ) : null}
                </div>
              </td>
              <td
                className={`w-10 py-1 pl-3 text-right text-sm tabular-nums leading-none ${
                  slot.votes > 0 ? "text-ink" : "text-muted"
                }`}
              >
                {slot.votes > 0 ? formatCount(slot.votes) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PositionDigits({ votesByRank }: { votesByRank: number[] }) {
  return (
    <table className="w-full max-w-xl border-collapse">
      <caption className="mb-3 text-left text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        By list position
      </caption>
      <thead>
        <tr>
          {Array.from({ length: 10 }, (_, i) => (
            <th
              key={i}
              className="pb-2 text-center font-display text-sm tracking-wide text-muted"
            >
              {i + 1}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {votesByRank.slice(0, 10).map((votes, i) => (
            <td
              key={i}
              className={`border-t border-line py-2 text-center text-sm tabular-nums ${
                i < 3 && votes > 0 ? "text-accent" : "text-ink"
              }`}
            >
              {votes > 0 ? formatCount(votes) : "—"}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function PositionSparkline({ votesByRank }: { votesByRank: number[] }) {
  const maxVotes = Math.max(...votesByRank, 1);
  return (
    <div>
      <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        By list position
      </p>
      <div
        className="mt-4 flex h-16 items-end gap-1"
        role="img"
        aria-label="Votes by list position from number 1 through 10"
      >
        {Array.from({ length: 10 }, (_, i) => {
          const votes = votesByRank[i] ?? 0;
          const heightPct = votes > 0 ? Math.max((votes / maxVotes) * 100, 8) : 0;
          return (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex h-12 w-full items-end">
                <div
                  className={`w-full ${
                    votes > 0
                      ? i < 3
                        ? "bg-accent"
                        : "bg-ink"
                      : "bg-line"
                  }`}
                  style={{ height: votes > 0 ? `${heightPct}%` : "2px" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="min-w-0 flex-1 text-center text-[10px] tabular-nums text-muted"
          >
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

function PositionPairs({ votesByRank }: { votesByRank: number[] }) {
  const filled = votesByRank
    .map((votes, i) => ({ listRank: i + 1, votes }))
    .filter((slot) => slot.votes > 0);
  if (filled.length === 0) return null;
  return (
    <p className="mt-4 max-w-xl text-sm tracking-wide text-muted">
      {filled.map((slot, i) => (
        <span key={slot.listRank}>
          {i > 0 ? <span aria-hidden> · </span> : null}
          <span className={slot.listRank <= 3 ? "text-accent" : "text-ink"}>
            #{slot.listRank}
          </span>{" "}
          {formatCount(slot.votes)}
        </span>
      ))}
    </p>
  );
}

function PositionColumns({ votesByRank }: { votesByRank: number[] }) {
  const slots = Array.from({ length: 10 }, (_, i) => ({
    listRank: i + 1,
    votes: votesByRank[i] ?? 0,
  }));
  return (
    <dl className="mt-6 grid max-w-sm grid-cols-2 gap-x-8 gap-y-2 text-sm">
      {slots.map((slot) => (
        <div key={slot.listRank} className="flex items-baseline justify-between gap-4 border-b border-line pb-1">
          <dt
            className={`font-display text-lg tracking-wide ${
              slot.listRank <= 3 && slot.votes > 0 ? "text-accent" : "text-muted"
            }`}
          >
            {slot.listRank}
          </dt>
          <dd className={`tabular-nums ${slot.votes > 0 ? "text-ink" : "text-muted"}`}>
            {slot.votes > 0 ? formatCount(slot.votes) : "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StandingsLineYear({ yearStats }: { yearStats: GameGotyYearRanking }) {
  const revealed = yearStats.detailedStatsRevealed;
  const meta = revealed ? voteMeta(yearStats.votes, yearStats.score) : null;
  const showTally =
    revealed &&
    yearStats.votesByRank != null &&
    yearStats.votesByRank.some((n) => n > 0);

  return (
    <article>
      <div className="flex items-baseline gap-3">
        <RankMarker rank={yearStats.rank} size="lg" />
        <div className="min-w-0">
          <h3 className="font-display text-3xl tracking-wide text-ink sm:text-4xl">
            <YearLink year={yearStats.year}>
              {`${yearStats.year} Game of the Year`}
            </YearLink>
          </h3>
          {meta ? <p className="mt-1 text-sm text-muted">{meta}</p> : null}
          <RevealedNote revealed={revealed} />
        </div>
      </div>
      {showTally && yearStats.votesByRank ? (
        <div className="mt-6 max-w-xl">
          <PositionTally votesByRank={yearStats.votesByRank} />
        </div>
      ) : null}
    </article>
  );
}

function MastheadYear({ yearStats }: { yearStats: GameGotyYearRanking }) {
  const revealed = yearStats.detailedStatsRevealed;
  const meta = revealed ? voteMeta(yearStats.votes, yearStats.score) : null;
  const showDigits =
    revealed &&
    yearStats.votesByRank != null &&
    yearStats.votesByRank.some((n) => n > 0);

  return (
    <article>
      <RankMarker rank={yearStats.rank} size="hero" />
      <p className="mt-4 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        <YearLink year={yearStats.year} className="hover:text-ink">
          {`${yearStats.year} Game of the Year`}
        </YearLink>
      </p>
      {meta ? (
        <p className="mt-3 font-serif text-xl leading-relaxed text-ink">{meta}</p>
      ) : null}
      <RevealedNote revealed={revealed} />
      {showDigits && yearStats.votesByRank ? (
        <div className="mt-8">
          <PositionDigits votesByRank={yearStats.votesByRank} />
        </div>
      ) : null}
    </article>
  );
}

function FolioYear({ yearStats }: { yearStats: GameGotyYearRanking }) {
  const revealed = yearStats.detailedStatsRevealed;
  const meta = revealed ? voteMeta(yearStats.votes, yearStats.score) : null;
  const showTally =
    revealed &&
    yearStats.votesByRank != null &&
    yearStats.votesByRank.some((n) => n > 0);

  return (
    <article className="grid gap-8 md:grid-cols-[minmax(0,16rem)_1fr] md:items-start">
      <div>
        <RankMarker rank={yearStats.rank} size="hero" />
        <h3 className="mt-4 font-display text-2xl tracking-wide text-ink">
          <YearLink year={yearStats.year}>
            {`${yearStats.year} Game of the Year`}
          </YearLink>
        </h3>
        {meta ? <p className="mt-2 text-sm text-muted">{meta}</p> : null}
        <RevealedNote revealed={revealed} />
      </div>
      {showTally && yearStats.votesByRank ? (
        <PositionTally votesByRank={yearStats.votesByRank} />
      ) : null}
    </article>
  );
}

function ScoreboardYear({ yearStats }: { yearStats: GameGotyYearRanking }) {
  const revealed = yearStats.detailedStatsRevealed;
  const showSpark =
    revealed &&
    yearStats.votesByRank != null &&
    yearStats.votesByRank.some((n) => n > 0);

  return (
    <article>
      <h3 className="font-display text-2xl tracking-wide text-ink sm:text-3xl">
        <YearLink year={yearStats.year}>
          {`${yearStats.year} Game of the Year`}
        </YearLink>
      </h3>
      {revealed ? (
        <dl className="mt-5 grid grid-cols-3 gap-4 border-y border-line py-4">
          <div>
            <dt className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Place
            </dt>
            <dd className="mt-2">
              <RankMarker rank={yearStats.rank} size="lg" />
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Votes
            </dt>
            <dd className="mt-2 font-display text-3xl tabular-nums tracking-wide text-ink">
              {formatCount(yearStats.votes ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Points
            </dt>
            <dd className="mt-2 font-display text-3xl tabular-nums tracking-wide text-ink">
              {formatCount(yearStats.score ?? 0)}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="mt-5 border-y border-line py-4">
          <RankMarker rank={yearStats.rank} size="lg" />
          <RevealedNote revealed={false} />
        </div>
      )}
      {showSpark && yearStats.votesByRank ? (
        <div className="mt-6 max-w-xl">
          <PositionSparkline votesByRank={yearStats.votesByRank} />
        </div>
      ) : null}
    </article>
  );
}

function LedeYear({ yearStats }: { yearStats: GameGotyYearRanking }) {
  const revealed = yearStats.detailedStatsRevealed;
  const votes = yearStats.votes;
  const score = yearStats.score;
  const topSlot = yearStats.votesByRank
    ? yearStats.votesByRank.reduce(
        (best, votesAt, index) =>
          votesAt > best.votes ? { listRank: index + 1, votes: votesAt } : best,
        { listRank: 1, votes: 0 },
      )
    : null;

  return (
    <article>
      <p className="max-w-2xl font-serif text-2xl leading-snug text-ink sm:text-3xl">
        No. {yearStats.rank}{" "}
        <YearLink
          year={yearStats.year}
          className="text-accent hover:underline"
        >
          {`in the ${yearStats.year} Game of the Year`}
        </YearLink>
        .
      </p>
      {revealed && votes != null && score != null ? (
        <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-muted">
          Named on {formatCount(votes)} {votes === 1 ? "list" : "lists"}, for{" "}
          {formatCount(score)} points
          {topSlot && topSlot.votes > 0
            ? ` — most often at #${topSlot.listRank}`
            : ""}
          .
        </p>
      ) : (
        <RevealedNote revealed={revealed} />
      )}
      {revealed && yearStats.votesByRank ? (
        <PositionPairs votesByRank={yearStats.votesByRank} />
      ) : null}
    </article>
  );
}

function ChapterYear({ yearStats }: { yearStats: GameGotyYearRanking }) {
  const revealed = yearStats.detailedStatsRevealed;
  const meta = revealed ? voteMeta(yearStats.votes, yearStats.score) : null;
  const showCols =
    revealed &&
    yearStats.votesByRank != null &&
    yearStats.votesByRank.some((n) => n > 0);

  return (
    <article>
      <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        Game of the Year
      </p>
      <h3 className="mt-2 font-display text-4xl tracking-wide text-ink sm:text-5xl">
        <YearLink year={yearStats.year}>{String(yearStats.year)}</YearLink>
      </h3>
      <div className="mt-4 flex items-baseline gap-3">
        <RankMarker rank={yearStats.rank} size="lg" />
        {meta ? <p className="text-sm text-muted">{meta}</p> : null}
      </div>
      <RevealedNote revealed={revealed} />
      {showCols && yearStats.votesByRank ? (
        <PositionColumns votesByRank={yearStats.votesByRank} />
      ) : null}
    </article>
  );
}

function ClassicMetric({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 border border-line bg-paper px-3 py-3 sm:px-4 ${className}`}
    >
      <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        {label}
      </p>
      <div className="mt-1.5 font-display text-2xl tabular-nums tracking-wide text-ink">
        {children}
      </div>
    </div>
  );
}

function ClassicBarChart({ votesByRank }: { votesByRank: number[] }) {
  const slots = Array.from({ length: 10 }, (_, index) => ({
    listRank: index + 1,
    votes: votesByRank[index] ?? 0,
  }));
  const maxVotes = Math.max(...slots.map((slot) => slot.votes), 1);

  return (
    <div
      className="flex items-end justify-between gap-1.5 sm:gap-2"
      role="img"
      aria-label="Votes by list position from number 1 through 10"
    >
      {slots.map((slot) => {
        const heightPct =
          slot.votes > 0 ? Math.max((slot.votes / maxVotes) * 100, 8) : 0;
        const isTopThree = slot.listRank <= 3 && slot.votes > 0;
        return (
          <div
            key={slot.listRank}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <span
              className={`text-[10px] font-semibold tabular-nums leading-none sm:text-xs ${
                slot.votes > 0 ? "text-ink" : "text-transparent"
              }`}
            >
              {slot.votes > 0 ? formatCount(slot.votes) : "·"}
            </span>
            <div className="relative h-20 w-full sm:h-24">
              <div className="absolute inset-0 bg-line" />
              {slot.votes > 0 ? (
                <div
                  className={`absolute inset-x-0 bottom-0 ${
                    isTopThree ? "bg-accent" : "bg-muted"
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={`#${slot.listRank}: ${formatCount(slot.votes)} ${
                    slot.votes === 1 ? "vote" : "votes"
                  }`}
                />
              ) : null}
            </div>
            <span
              className={`text-[10px] font-bold leading-none sm:text-xs ${
                isTopThree ? "text-accent" : "text-muted"
              }`}
            >
              #{slot.listRank}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ClassicYear({ yearStats }: { yearStats: GameGotyYearRanking }) {
  const revealed = yearStats.detailedStatsRevealed;
  const showChart =
    revealed &&
    yearStats.votesByRank != null &&
    yearStats.votesByRank.some((n) => n > 0);

  return (
    <article className="border border-line bg-panel p-6">
      <h3 className="flex flex-wrap items-baseline gap-2 font-display text-2xl tracking-wide text-ink">
        <span>{yearStats.year} GOTY ranking</span>
        <RankMarker rank={`#${yearStats.rank}`} size="md" />
      </h3>

      {revealed ? (
        <div className="mt-5 flex gap-2 sm:gap-3">
          <ClassicMetric label="Votes" className="flex-1">
            {formatCount(yearStats.votes ?? 0)}
          </ClassicMetric>
          <ClassicMetric label="Rank" className="flex-1">
            <span className="text-accent">#{yearStats.rank}</span>
          </ClassicMetric>
          <ClassicMetric label="Points" className="flex-1">
            {formatCount(yearStats.score ?? 0)}
          </ClassicMetric>
        </div>
      ) : (
        <div className="mt-5">
          <ClassicMetric label="Rank" className="w-fit min-w-[7rem]">
            <span className="text-accent">#{yearStats.rank}</span>
          </ClassicMetric>
          <p className="mt-3 text-sm text-muted">
            Full vote stats will show when results are revealed.
          </p>
        </div>
      )}

      {showChart && yearStats.votesByRank ? (
        <div className="mt-3 border border-line bg-paper px-3 py-3 sm:px-4">
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
            Votes by list position
          </p>
          <div className="mt-3">
            <ClassicBarChart votesByRank={yearStats.votesByRank} />
          </div>
        </div>
      ) : null}

      <p className="mt-4">
        <YearLink
          year={yearStats.year}
          className="text-sm text-accent hover:underline"
        >
          {`View ${yearStats.year} GOTY rankings`}
        </YearLink>
      </p>
    </article>
  );
}

function TrophyMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function VoteMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="m9 12 2 2 4-4" />
      <path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z" />
      <path d="M22 19H2" />
    </svg>
  );
}

function LegacyMetric({
  label,
  children,
  className = "",
  valueClassName = "mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-white",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-3 shadow-sm sm:px-4 ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className={valueClassName}>{children}</div>
    </div>
  );
}

function LegacyBarChart({ votesByRank }: { votesByRank: number[] }) {
  const slots = Array.from({ length: 10 }, (_, index) => ({
    listRank: index + 1,
    votes: votesByRank[index] ?? 0,
  }));
  const maxVotes = Math.max(...slots.map((slot) => slot.votes), 1);

  return (
    <div
      className="flex items-end justify-between gap-1.5 sm:gap-2"
      role="img"
      aria-label="Votes by list position from number 1 through 10"
    >
      {slots.map((slot) => {
        const heightPct =
          slot.votes > 0 ? Math.max((slot.votes / maxVotes) * 100, 8) : 0;
        const isTopThree = slot.listRank <= 3 && slot.votes > 0;
        return (
          <div
            key={slot.listRank}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <span
              className={`text-[10px] font-semibold tabular-nums leading-none sm:text-xs ${
                slot.votes > 0 ? "text-slate-200" : "text-transparent"
              }`}
            >
              {slot.votes > 0 ? slot.votes : "·"}
            </span>
            <div className="relative h-20 w-full sm:h-24">
              <div className="absolute inset-0 rounded-t-md bg-slate-800/80" />
              {slot.votes > 0 ? (
                <div
                  className={`absolute inset-x-0 bottom-0 rounded-t-md shadow-sm ${
                    isTopThree
                      ? "bg-gradient-to-t from-amber-500 to-amber-300"
                      : "bg-gradient-to-t from-slate-500 to-slate-400"
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={`#${slot.listRank}: ${formatCount(slot.votes)} ${
                    slot.votes === 1 ? "vote" : "votes"
                  }`}
                />
              ) : null}
            </div>
            <span
              className={`text-[10px] font-bold leading-none sm:text-xs ${
                isTopThree ? "text-amber-400" : "text-slate-400"
              }`}
            >
              #{slot.listRank}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LegacyYear({ yearStats }: { yearStats: GameGotyYearRanking }) {
  const revealed = yearStats.detailedStatsRevealed;
  const showChart =
    revealed &&
    yearStats.votesByRank != null &&
    yearStats.votesByRank.some((n) => n > 0);

  return (
    <article className="overflow-hidden rounded-xl border border-amber-500/20 bg-slate-900/40 p-6 shadow-sm">
      <h3 className="mb-4 flex flex-wrap items-center gap-2 text-base font-semibold text-white">
        <TrophyMark className="text-amber-500" />
        <span>{yearStats.year} GOTY ranking</span>
        <span className="text-amber-300">#{yearStats.rank}</span>
      </h3>

      {revealed ? (
        <div className="flex gap-2 sm:gap-3">
          <LegacyMetric label="Votes" className="flex-1">
            <span className="flex items-center gap-1.5">
              <VoteMark className="shrink-0 text-slate-400" />
              {formatCount(yearStats.votes ?? 0)}
            </span>
          </LegacyMetric>
          <LegacyMetric label="Rank" className="flex-1">
            <span className="flex items-center gap-1.5 text-amber-300">
              <TrophyMark className="shrink-0" />
              #{yearStats.rank}
            </span>
          </LegacyMetric>
          <LegacyMetric label="Points" className="flex-1">
            {formatCount(yearStats.score ?? 0)}
          </LegacyMetric>
        </div>
      ) : (
        <div>
          <LegacyMetric label="Rank" className="w-fit min-w-[7rem]">
            <span className="flex items-center gap-1.5 text-amber-300">
              <TrophyMark className="shrink-0" />
              #{yearStats.rank}
            </span>
          </LegacyMetric>
          <p className="mt-3 text-sm text-slate-400">
            Full vote stats will show when results are revealed.
          </p>
        </div>
      )}

      {showChart && yearStats.votesByRank ? (
        <LegacyMetric
          label="Votes by list position"
          className="mt-3"
          valueClassName="mt-3"
        >
          <LegacyBarChart votesByRank={yearStats.votesByRank} />
        </LegacyMetric>
      ) : null}

      <p className="mt-4">
        <YearLink
          year={yearStats.year}
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-400 hover:underline"
        >
          {`View ${yearStats.year} GOTY rankings ›`}
        </YearLink>
      </p>
    </article>
  );
}

function BroadcastBarChart({
  votesByRank,
  compact,
  fit,
}: {
  votesByRank: number[];
  compact?: boolean;
  fit?: boolean;
}) {
  const slots = Array.from({ length: 10 }, (_, index) => ({
    listRank: index + 1,
    votes: votesByRank[index] ?? 0,
  }));
  const maxVotes = Math.max(...slots.map((slot) => slot.votes), 0);
  const top = broadcastChartTop(maxVotes);
  const ticks = Array.from({ length: top / 5 + 1 }, (_, i) => i * 5);
  const plotClass = fit ? "min-h-[5.5rem]" : compact ? "h-28" : "h-44";

  return (
    <div className={fit ? "flex h-full min-h-0 flex-col" : undefined}>
      <p className="text-[11px] font-extrabold tracking-[0.2em] text-ink uppercase">
        Votes by list position
      </p>
      <div
        className={`${compact ? "mt-2 gap-x-2.5" : "mt-4 gap-x-3"} grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] ${fit ? "min-h-0 flex-1" : ""}`}
      >
        <div
          className={`row-start-1 flex ${plotClass} shrink-0 flex-col justify-between py-0 text-right text-[10px] tabular-nums text-muted`}
          aria-hidden
        >
          {[...ticks].reverse().map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <div className={`relative row-start-1 ${plotClass}`}>
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute right-0 left-0 border-t border-dotted border-line"
              style={{ bottom: `${(tick / top) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-2 sm:gap-2.5">
            {slots.map((slot) => {
              const heightPct =
                slot.votes > 0 ? (slot.votes / top) * 100 : 0;
              return (
                <div
                  key={slot.listRank}
                  className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                >
                  {slot.votes > 0 ? (
                    <>
                      <span
                        className="absolute left-1/2 z-10 -translate-x-1/2 text-[10px] font-semibold tabular-nums text-ink sm:text-xs"
                        style={{ bottom: `calc(${heightPct}% + 4px)` }}
                      >
                        {slot.votes}
                      </span>
                      <div
                        className="w-[82%] bg-accent"
                        style={{ height: `${heightPct}%` }}
                      />
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="col-start-2 row-start-2 mt-2 flex gap-2 sm:gap-2.5">
          {slots.map((slot) => (
            <span
              key={slot.listRank}
              className="min-w-0 flex-1 text-center text-[10px] font-semibold tabular-nums text-muted"
            >
              #{slot.listRank}
            </span>
          ))}
        </div>
      </div>
      {!fit ? (
        <p
          className={`${compact ? "mt-2" : "mt-3"} text-center text-[10px] font-extrabold tracking-[0.2em] text-muted uppercase`}
        >
          Number of votes
        </p>
      ) : null}
    </div>
  );
}

function BroadcastYear({
  yearStats,
  compact = false,
  fit = false,
}: {
  yearStats: GameGotyYearRanking;
  compact?: boolean;
  fit?: boolean;
}) {
  const revealed = yearStats.detailedStatsRevealed;
  const showChart =
    revealed &&
    yearStats.votesByRank != null &&
    yearStats.votesByRank.some((n) => n > 0);
  const tight = compact || fit;
  const figureClass = `font-display tabular-nums leading-none tracking-wide ${
    tight ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl"
  }`;
  const figureLabelClass = `${tight ? "mt-1" : "mt-2"} text-[11px] font-extrabold tracking-[0.2em] text-ink uppercase`;

  return (
    <article className={fit ? "flex h-full min-h-0 flex-col" : undefined}>
      <p>
        <YearLink
          year={yearStats.year}
          className="text-sm font-extrabold tracking-[0.18em] text-accent uppercase hover:underline sm:text-base"
        >
          {`${yearStats.year} Game of the Year`}
        </YearLink>
      </p>
      <span
        className={`${tight ? "mt-1" : "mt-2"} block h-0.5 w-10 bg-accent`}
        aria-hidden
      />

      <div
        className={`${tight ? "mt-3" : "mt-5"} flex flex-wrap items-end gap-x-6 gap-y-4 sm:gap-x-8`}
      >
        <div>
          <p
            className={`font-display leading-none tracking-wide text-ink ${
              tight ? "text-4xl sm:text-5xl" : "text-5xl sm:text-7xl"
            }`}
            aria-label={`Rank ${yearStats.rank}`}
          >
            #{yearStats.rank}
          </p>
          <p className={`${tight ? "mt-1" : "mt-2"} text-sm text-muted`}>
            Current ranking
          </p>
        </div>

        {revealed ? (
          <>
            <div className="hidden w-px self-stretch bg-line sm:block" aria-hidden />
            <div>
              <p className={`${figureClass} text-accent`}>
                {formatCount(yearStats.score ?? 0)}
              </p>
              <p className={figureLabelClass}>Points</p>
            </div>
            <div className="w-px self-stretch bg-line" aria-hidden />
            <div>
              <p className={`${figureClass} text-accent`}>
                {formatCount(yearStats.votes ?? 0)}
              </p>
              <p className={figureLabelClass}>Voters</p>
            </div>
          </>
        ) : (
          <p className="max-w-sm text-sm text-muted">
            Vote totals and points appear when that year’s results are revealed.
          </p>
        )}
      </div>

      {showChart && yearStats.votesByRank ? (
        <div
          className={
            fit
              ? "mt-3 flex min-h-0 flex-1 flex-col border-t border-line pt-3"
              : compact
                ? "mt-5 border-t border-line pt-4"
                : "mt-8 border-t border-line pt-6"
          }
        >
          <BroadcastBarChart
            votesByRank={yearStats.votesByRank}
            compact={compact}
            fit={fit}
          />
        </div>
      ) : null}
    </article>
  );
}

function YearLayout({
  layout,
  yearStats,
  fit,
}: {
  layout: GameGotyRankingLayout;
  yearStats: GameGotyYearRanking;
  fit?: boolean;
}) {
  switch (layout) {
    case "masthead":
      return <MastheadYear yearStats={yearStats} />;
    case "folio":
      return <FolioYear yearStats={yearStats} />;
    case "scoreboard":
      return <ScoreboardYear yearStats={yearStats} />;
    case "lede":
      return <LedeYear yearStats={yearStats} />;
    case "chapter":
      return <ChapterYear yearStats={yearStats} />;
    case "classic":
      return <ClassicYear yearStats={yearStats} />;
    case "legacy":
      return <LegacyYear yearStats={yearStats} />;
    case "broadcast":
      return <BroadcastYear yearStats={yearStats} fit={fit} />;
    case "broadcast-compact":
      return <BroadcastYear yearStats={yearStats} compact fit={fit} />;
    default:
      return <StandingsLineYear yearStats={yearStats} />;
  }
}

function RankingFrame({
  stats,
  layout,
  fit,
}: {
  stats: GameGotyRankingsData;
  layout: GameGotyRankingLayout;
  fit?: boolean;
}) {
  return (
    <div className={fit ? "flex h-full min-h-0 flex-col" : "space-y-12"}>
      {stats.viaParent ? (
        <p className="font-serif text-lg text-muted">
          Ranked as{" "}
          <Link
            href={`/games/${stats.viaParent.slug}`}
            className="text-ink hover:text-accent"
          >
            {stats.viaParent.title}
          </Link>
        </p>
      ) : null}
      {stats.byYear.map((yearStats) => (
        <YearLayout
          key={`${layout}-${yearStats.year}`}
          layout={layout}
          yearStats={yearStats}
          fit={fit}
        />
      ))}
    </div>
  );
}

export function GameGotyRankings({
  stats,
  layout = "standings-line",
  className,
  fit = false,
}: {
  stats: GameGotyRankingsData;
  layout?: GameGotyRankingLayout;
  className?: string;
  fit?: boolean;
}) {
  if (!hasGameGotyPresence(stats)) return null;

  const isBroadcast =
    layout === "broadcast" || layout === "broadcast-compact";

  return (
    <section
      className={`${className ?? "mt-14"} ${fit ? "flex h-full min-h-0 flex-col" : ""}`}
      aria-label="Game of the Year standings"
    >
      {layout === "chapter" || isBroadcast ? null : <SectionRule />}
      {layout === "chapter" || layout === "masthead" || isBroadcast ? null : (
        <p className="mt-8 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
          Game of the Year
        </p>
      )}
      <div
        className={
          layout === "chapter"
            ? "mt-14"
            : fit
              ? "flex min-h-0 flex-1 flex-col"
              : isBroadcast
                ? undefined
                : "mt-6"
        }
      >
        {layout === "chapter" ? <SectionRule /> : null}
        {layout === "chapter" ? <div className="mt-8" /> : null}
        <RankingFrame stats={stats} layout={layout} fit={fit} />
      </div>
    </section>
  );
}

/** All treatments stacked for design review. */
export function GameGotyRankingsGallery({
  stats,
}: {
  stats: GameGotyRankingsData;
}) {
  if (!hasGameGotyPresence(stats)) return null;

  return (
    <div className="mt-14 space-y-16">
      {GOTY_RANKING_LAYOUTS.map((layout) => (
        <section key={layout} aria-label={GOTY_RANKING_LAYOUT_META[layout].label}>
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
            {GOTY_RANKING_LAYOUT_META[layout].label}
            {layout === "broadcast-compact" ? " · current" : null}
          </p>
          <p className="mt-1 max-w-xl text-sm text-muted">
            {GOTY_RANKING_LAYOUT_META[layout].hint}
          </p>
          <div className="mt-6 border-t border-line pt-8">
            <RankingFrame stats={stats} layout={layout} />
          </div>
        </section>
      ))}
    </div>
  );
}
