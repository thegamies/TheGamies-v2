"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { GameCover } from "@/components/ui/GameCover";
import { GameSearchField } from "@/components/ui/GameSearchField";
import { tgaNomineeGridClass } from "@/components/tga-pickem/tgaNomineeGrid";
import type { TgaBallotCategory } from "@/lib/tga-pickem/service";
import {
  addGameNomineeAction,
  addOtherNomineeAction,
  copyTgaCategoriesAction,
  createTgaCategoryAction,
  deleteTgaCategoryAction,
  detachNomineeAction,
  goLiveTgaYearAction,
  load2025CategoriesAction,
  load2025NomineesAction,
  load2025WinnersAction,
  saveTgaScheduleAction,
  setTgaEnabledAction,
  setTgaPromotedAction,
  uploadNomineeImageAction,
} from "../actions";

function toIso(local: string): string {
  return new Date(local).toISOString();
}

export function AdminTgaYearClient({
  year,
  statusLabel,
  enabled,
  promoted,
  complete,
  completeReason,
  opensAt,
  showStartsAt,
  otherYears,
  categories,
}: {
  year: number;
  statusLabel: string;
  enabled: boolean;
  promoted: boolean;
  complete: boolean;
  completeReason: string | null;
  opensAt: string;
  showStartsAt: string;
  otherYears: number[];
  categories: TgaBallotCategory[];
}) {
  const router = useRouter();
  const [openAt, setOpenAt] = useState(opensAt);
  const [showAt, setShowAt] = useState(showStartsAt);
  const [copyTo, setCopyTo] = useState(year + 1);
  const [newLabel, setNewLabel] = useState("");
  const [newKind, setNewKind] = useState<"game" | "other">("game");
  const [otherName, setOtherName] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    fn: () => Promise<
      | { error?: string }
      | { ok?: boolean; attached?: number; called?: number; unmatched?: string[] }
      | { id?: string }
    >,
  ) {
    startTransition(async () => {
      setMessage(null);
      const result = await fn();
      if ("error" in result && result.error) {
        setMessage(result.error);
        return;
      }
      if ("called" in result && result.called != null) {
        setMessage(
          result.unmatched && result.unmatched.length > 0
            ? `Called ${result.called} winners. Not on the slate: ${result.unmatched.join("; ")}`
            : `Called ${result.called} winners.`,
        );
      } else if ("unmatched" in result && result.unmatched && result.unmatched.length > 0) {
        setMessage(
          `Added ${result.attached ?? 0} nominees. Not in the catalog: ${result.unmatched.join("; ")}`,
        );
      } else if ("attached" in result && result.attached != null) {
        setMessage(`Added ${result.attached} nominees.`);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-12">
      <section className="space-y-4 border-b border-line pb-8">
        <p className="text-sm text-muted">
          {statusLabel}
          {promoted ? " · Promoted" : ""}
          {complete ? "" : ` · ${completeReason ?? "Incomplete"}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="bordered"
            disabled={pending}
            onClick={() => run(() => setTgaEnabledAction(year, !enabled))}
          >
            {enabled ? "Turn off" : "Turn on"}
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(() => goLiveTgaYearAction(year))}
          >
            Go live
          </Button>
          <Button
            type="button"
            variant="bordered"
            disabled={pending}
            onClick={() => run(() => setTgaPromotedAction(year, !promoted))}
          >
            {promoted ? "Unpromote" : "Promote"}
          </Button>
          <Link href={`/admin/the-game-awards/${year}/show`}>
            <Button type="button" variant="bordered">
              Show room
            </Button>
          </Link>
        </div>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => saveTgaScheduleAction(year, toIso(openAt), toIso(showAt)));
          }}
        >
          <label className="text-sm">
            <span className="text-muted">Picks open</span>
            <input
              type="datetime-local"
              className={`${fieldInputClass} mt-1`}
              value={openAt}
              onChange={(event) => setOpenAt(event.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Show start</span>
            <input
              type="datetime-local"
              className={`${fieldInputClass} mt-1`}
              value={showAt}
              onChange={(event) => setShowAt(event.target.value)}
            />
          </label>
          <Button type="submit" variant="bordered" disabled={pending}>
            Save schedule
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl tracking-wide text-ink">
          Categories
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="bordered"
            disabled={pending}
            onClick={() => run(() => load2025CategoriesAction(year))}
          >
            Load 2025 categories
          </Button>
          <Button
            type="button"
            variant="bordered"
            disabled={pending}
            onClick={() => run(() => load2025NomineesAction(year))}
          >
            Load 2025 nominees
          </Button>
          <Button
            type="button"
            variant="bordered"
            disabled={pending}
            onClick={() => run(() => load2025WinnersAction(year))}
          >
            Load 2025 winners
          </Button>
        </div>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => copyTgaCategoriesAction(year, copyTo, false));
          }}
        >
          <label className="text-sm">
            <span className="text-muted">Copy categories to</span>
            <input
              type="number"
              className={`${fieldInputClass} mt-1 w-28`}
              value={copyTo}
              onChange={(event) => setCopyTo(Number(event.target.value))}
              list="tga-copy-years"
            />
            <datalist id="tga-copy-years">
              {otherYears.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </label>
          <Button type="submit" variant="bordered" disabled={pending}>
            Copy categories
          </Button>
        </form>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const result = await createTgaCategoryAction(year, newLabel, newKind);
              if (!("error" in result)) setNewLabel("");
              return result;
            });
          }}
        >
          <label className="text-sm">
            <span className="text-muted">New category</span>
            <input
              className={`${fieldInputClass} mt-1`}
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
            />
          </label>
          <select
            className={fieldInputClass}
            value={newKind}
            onChange={(event) =>
              setNewKind(event.target.value === "other" ? "other" : "game")
            }
          >
            <option value="game">Game</option>
            <option value="other">Other</option>
          </select>
          <Button type="submit" variant="bordered" disabled={pending}>
            Add category
          </Button>
        </form>
      </section>

      <div className="space-y-10">
        {categories.map((category) => (
          <section key={category.id} className="border-t border-line pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl tracking-wide text-ink">
                  {category.label}
                </h3>
                <p className="text-sm text-muted">
                  {category.kind === "game" ? "Catalog games" : "Custom nominees"}
                </p>
              </div>
              <Button
                type="button"
                variant="quiet"
                disabled={pending}
                onClick={() => run(() => deleteTgaCategoryAction(year, category.id))}
              >
                Delete
              </Button>
            </div>
            <ul className={`mt-4 ${tgaNomineeGridClass}`}>
              {category.nominees.map((nominee) => (
                <li key={nominee.id} className="min-w-0">
                  <GameCover
                    title={nominee.displayName}
                    imageUrl={nominee.imageUrl}
                  />
                  <p className="mt-2 font-display text-lg leading-none tracking-wide text-ink">
                    {nominee.displayName}
                  </p>
                  {category.kind === "other" ? (
                    <label className="mt-2 block text-xs text-muted">
                      Artwork
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="mt-1 block w-full"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const data = new FormData();
                          data.set("year", String(year));
                          data.set("nomineeId", nominee.id);
                          data.set("image", file);
                          run(() => uploadNomineeImageAction(data));
                        }}
                      />
                    </label>
                  ) : null}
                  <Button
                    type="button"
                    variant="quiet"
                    className="mt-2"
                    disabled={pending}
                    onClick={() =>
                      run(() => detachNomineeAction(year, category.id, nominee.id))
                    }
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-4 max-w-md">
              {category.kind === "game" ? (
                <GameSearchField
                  year={year}
                  aria-label={`Add a game to ${category.label}`}
                  allowEditions
                  excludeIds={
                    new Set(
                      category.nominees
                        .map((nominee) => nominee.gameId)
                        .filter((id): id is string => Boolean(id)),
                    )
                  }
                  onSelect={(hit) =>
                    run(() => addGameNomineeAction(year, category.id, hit.id))
                  }
                />
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(async () => {
                      const result = await addOtherNomineeAction(
                        year,
                        category.id,
                        otherName[category.id] ?? "",
                      );
                      if (!("error" in result)) {
                        setOtherName((current) => ({
                          ...current,
                          [category.id]: "",
                        }));
                      }
                      return result;
                    });
                  }}
                >
                  <input
                    className={fieldInputClass}
                    placeholder="Nominee name"
                    value={otherName[category.id] ?? ""}
                    onChange={(event) =>
                      setOtherName((current) => ({
                        ...current,
                        [category.id]: event.target.value,
                      }))
                    }
                  />
                  <Button type="submit" variant="bordered" disabled={pending}>
                    Add
                  </Button>
                </form>
              )}
            </div>
          </section>
        ))}
      </div>
      {message ? (
        <p className="text-sm text-accent" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
