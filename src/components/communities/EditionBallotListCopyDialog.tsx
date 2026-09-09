"use client";

import { useState } from "react";
import {
  LIST_RANK_VISIBILITIES,
  LIST_RANK_VISIBILITY_LABELS,
  type ListRankVisibility,
} from "@/lib/activity/kinds";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { GameCover } from "@/components/ui/GameCover";
import {
  controlGroupClass,
  controlLabelClass,
  segmentBtnClass,
} from "@/components/ui/controls";
import {
  ballotListCopyCanOverwrite,
  ballotListCopyHasWork,
  type BallotListCopyCategory,
  type BallotListCopyGame,
  type BallotListCopyMode,
  type BallotListCopyPreview,
} from "@/lib/communities/ballot-list-copy";

function GameRow({
  rank,
  game,
}: {
  rank?: number;
  game: BallotListCopyGame | BallotListCopyCategory;
}) {
  const title = game.title;
  const coverUrl = game.coverUrl;
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 shrink-0">
        <GameCover title={title} imageUrl={coverUrl} width={40} height={53} />
      </div>
      {rank != null ? (
        <span className="shrink-0 font-display text-lg text-accent">{rank}</span>
      ) : null}
      <span className="min-w-0 text-sm text-ink">{title}</span>
    </div>
  );
}

export function EditionBallotListCopyDialog({
  preview,
  pending,
  error,
  source = "prompt",
  onDismiss,
  onConfirm,
}: {
  preview: BallotListCopyPreview;
  pending: boolean;
  error: string | null;
  source?: "prompt" | "manual";
  onDismiss: () => void;
  onConfirm: (opts: {
    rankVisibility?: ListRankVisibility;
    mode: BallotListCopyMode;
  }) => void;
}) {
  const [rankVisibility, setRankVisibility] =
    useState<ListRankVisibility>("ranked");
  const canOverwrite = ballotListCopyCanOverwrite(preview);
  const canAddMissing = ballotListCopyHasWork(preview);
  const [mode, setMode] = useState<BallotListCopyMode>(() =>
    preview.createList || canAddMissing ? "missing" : "overwrite",
  );
  const allowOverwrite = source === "manual" && !preview.createList;
  const showOverwrite = allowOverwrite && mode === "overwrite";
  const showMissing = !showOverwrite;
  const confirmLabel = pending
    ? "Saving…"
    : preview.createList || !showOverwrite
      ? "Add to my list"
      : "Replace my list";

  return (
    <Dialog
      open
      title={
        source === "manual"
          ? "Export to your Game of the Year list?"
          : "Save these to your Game of the Year list?"
      }
      description={
        preview.createList
          ? "We’ll create a new list from this ballot. Community awards stay on the event."
          : showOverwrite
            ? "Replace will overwrite the ranking and site awards listed below. Community awards stay on the event."
            : "We’ll only add what’s missing. Rankings and picks you already have stay as they are."
      }
      placement="contained"
      className="w-full max-w-lg"
      onClose={onDismiss}
    >
      <div className="space-y-8">
        {preview.createList ? (
          <div>
            <p className={controlLabelClass}>List visibility</p>
            <div
              role="group"
              aria-label="List visibility"
              className={controlGroupClass}
            >
              {LIST_RANK_VISIBILITIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRankVisibility(value)}
                  aria-pressed={rankVisibility === value}
                  className={segmentBtnClass(rankVisibility === value)}
                >
                  {LIST_RANK_VISIBILITY_LABELS[value]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {allowOverwrite && (canOverwrite || canAddMissing) ? (
          <div>
            <p className={controlLabelClass}>If a list already exists</p>
            <div
              role="group"
              aria-label="Export mode"
              className={controlGroupClass}
            >
              <button
                type="button"
                onClick={() => setMode("missing")}
                aria-pressed={mode === "missing"}
                disabled={!canAddMissing}
                className={segmentBtnClass(mode === "missing")}
              >
                Add missing
              </button>
              <button
                type="button"
                onClick={() => setMode("overwrite")}
                aria-pressed={mode === "overwrite"}
                disabled={!canOverwrite}
                className={segmentBtnClass(mode === "overwrite")}
              >
                Replace list
              </button>
            </div>
          </div>
        ) : null}

        {showOverwrite ? (
          <section>
            <h3 className="font-display text-xl tracking-wide text-ink">
              What will be overwritten
            </h3>
            <p className="mt-1 text-sm text-muted">
              {preview.existingGameCount > preview.games.length ||
              preview.extraGamesRemovedCount > 0
                ? `Your list has ${preview.existingGameCount} game${preview.existingGameCount === 1 ? "" : "s"}. Replace will set it to this ballot’s ranking${
                    preview.extraGamesRemovedCount > 0
                      ? ` and remove ${preview.extraGamesRemovedCount} extra game${preview.extraGamesRemovedCount === 1 ? "" : "s"}`
                      : ""
                  }.`
                : "These ranks and award picks on your list will change."}
            </p>
            {preview.rankingChanges.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {preview.rankingChanges.map((row) => (
                  <li key={`rank-${row.rank}`} className="text-sm">
                    <p className="font-semibold text-ink">#{row.rank}</p>
                    <p className="mt-1 text-muted">
                      {row.current?.title ?? "Empty"}
                      {" → "}
                      {row.next?.title ?? "Removed"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            {preview.categoryChanges.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {preview.categoryChanges.map((pick) => (
                  <li key={pick.categoryId}>
                    <p className="text-sm font-semibold text-ink">{pick.label}</p>
                    <p className="mt-1 text-sm text-muted">
                      {pick.current?.title ?? "None"}
                      {" → "}
                      {pick.next.title}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            {preview.categories.length > 0 ? (
              <p className="mt-4 text-sm text-muted">
                New award picks will also be added.
              </p>
            ) : null}
            {!canOverwrite ? (
              <p className="mt-4 text-sm text-muted">
                Your Game of the Year list already matches this ballot.
              </p>
            ) : null}
          </section>
        ) : null}

        {showMissing && preview.createList ? (
          <section>
            <h3 className="font-display text-xl tracking-wide text-ink">
              {preview.listTitle}
            </h3>
            <p className="mt-1 text-sm text-muted">New list for the site rankings.</p>
            <ol className="mt-4 space-y-3">
              {preview.games.map((game) => (
                <li key={game.gameId}>
                  <GameRow rank={game.rank} game={game} />
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {showMissing && preview.categories.length > 0 ? (
          <section>
            <h3 className="font-display text-xl tracking-wide text-ink">
              Award picks
            </h3>
            <p className="mt-1 text-sm text-muted">
              Only awards that are not already on your list.
            </p>
            <ul className="mt-4 space-y-3">
              {preview.categories.map((pick) => (
                <li key={pick.categoryId}>
                  <p className="mb-2 text-sm font-semibold text-ink">{pick.label}</p>
                  <GameRow game={pick} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showMissing &&
        allowOverwrite &&
        !preview.createList &&
        preview.categories.length === 0 ? (
          <p className="text-sm text-muted">
            Your list already has these picks. Choose Replace list to overwrite
            the ranking and awards.
          </p>
        ) : null}

        {error ? <p className="text-sm text-accent">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="bordered"
            size="sm"
            disabled={pending}
            onClick={onDismiss}
          >
            {source === "manual" ? "Cancel" : "Not now"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              pending ||
              (mode === "overwrite" && !canOverwrite && !preview.createList) ||
              (mode === "missing" && !canAddMissing && !preview.createList)
            }
            onClick={() =>
              onConfirm({
                rankVisibility: preview.createList ? rankVisibility : undefined,
                mode:
                  preview.createList || source !== "manual" ? "missing" : mode,
              })
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
