"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tgaNomineeGridClass } from "@/components/tga-pickem/tgaNomineeGrid";
import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";
import { fieldInputClass } from "@/components/ui/controls";
import { PinnedSaveBar } from "@/components/ui/PinnedSaveBar";
import type { TgaBallotCategory } from "@/lib/tga-pickem/service";
import type { TgaLeaderboardRow } from "@/lib/tga-pickem/scores";
import { saveTgaShowAction } from "../../actions";

function winnersFromCategories(categories: TgaBallotCategory[]) {
  return Object.fromEntries(
    categories.map((category) => [category.id, category.winnerNomineeId]),
  );
}

export function AdminTgaShowClient({
  year,
  officialWp,
  categories,
  topRows,
}: {
  year: number;
  called: number;
  total: number;
  officialWp: number | null;
  categories: TgaBallotCategory[];
  topRows: TgaLeaderboardRow[];
}) {
  const router = useRouter();
  const initialWinners = useMemo(
    () => winnersFromCategories(categories),
    [categories],
  );
  const initialWp = officialWp != null ? String(officialWp) : "";
  const [winners, setWinners] = useState<Record<string, string | null>>(
    initialWinners,
  );
  const [wp, setWp] = useState(initialWp);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const called = categories.filter((category) => winners[category.id]).length;
  const dirty =
    wp !== initialWp ||
    categories.some((category) => winners[category.id] !== category.winnerNomineeId);

  function pick(categoryId: string, nomineeId: string) {
    setWinners((current) => ({
      ...current,
      [categoryId]: current[categoryId] === nomineeId ? null : nomineeId,
    }));
  }

  return (
    <div className={dirty ? "pb-24" : undefined}>
      <p className="text-sm text-muted">
        {called} of {categories.length} called
      </p>
      {topRows.length > 0 ? (
        <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          {topRows.map((row) => (
            <li key={row.profileId}>
              {row.place}. {row.displayName} · {row.points}
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-10 space-y-12">
        {categories.map((category) => (
          <section key={category.id}>
            <h2 className="font-display text-3xl tracking-wide text-ink">
              {category.label}
            </h2>
            <div className={`mt-4 ${tgaNomineeGridClass}`}>
              {category.nominees.map((nominee) => {
                const selected = winners[category.id] === nominee.id;
                return (
                  <button
                    key={nominee.id}
                    type="button"
                    onClick={() => pick(category.id, nominee.id)}
                    className="min-w-0 text-left"
                  >
                    <GameCover
                      title={nominee.displayName}
                      imageUrl={nominee.imageUrl}
                      frame={selected ? "accent" : undefined}
                    />
                    <p className="mt-2 font-display text-lg leading-none tracking-wide text-ink">
                      {nominee.displayName}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <section>
          <h2 className="font-display text-3xl tracking-wide text-ink">
            World Premieres
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Tie-breaker. Set the official count when it is announced.
          </p>
          <label className="mt-4 block max-w-xs text-sm">
            <span className="text-muted">Official count</span>
            <input
              type="number"
              min={0}
              max={200}
              className={`${fieldInputClass} mt-1`}
              value={wp}
              onChange={(event) => setWp(event.target.value)}
            />
          </label>
        </section>
      </div>

      {message ? (
        <p className="mt-6 text-sm text-accent" role="alert">
          {message}
        </p>
      ) : null}

      {dirty ? (
        <PinnedSaveBar>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setMessage(null);
                const count = wp.trim() === "" ? null : Number(wp);
                const changed = Object.fromEntries(
                  categories
                    .filter(
                      (category) =>
                        winners[category.id] !== category.winnerNomineeId,
                    )
                    .map((category) => [
                      category.id,
                      winners[category.id] ?? null,
                    ]),
                );
                const result = await saveTgaShowAction(year, {
                  winners: changed,
                  worldPremieres: count,
                });
                if ("error" in result && result.error) {
                  setMessage(result.error);
                  return;
                }
                router.refresh();
              })
            }
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </PinnedSaveBar>
      ) : null}
    </div>
  );
}
