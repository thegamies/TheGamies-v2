"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tgaNomineeGridClass } from "@/components/tga-pickem/tgaNomineeGrid";
import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";
import { fieldInputClass } from "@/components/ui/controls";
import { PinnedSaveBar } from "@/components/ui/PinnedSaveBar";
import {
  tgaNomineeCallLabel,
  tgaNomineeCallMark,
} from "@/lib/tga-pickem/scoring";
import { isCompleteTgaSheet } from "@/lib/tga-pickem/sheet-complete";
import type { TgaBallotCategory } from "@/lib/tga-pickem/service";

function nomineeCoverFrame(
  mark: ReturnType<typeof tgaNomineeCallMark>,
  selected: boolean,
): "accent" | "success" | "miss" | undefined {
  if (mark === "correct") return "success";
  if (mark === "incorrect") return "miss";
  if (mark === "winner" || mark === "other") return undefined;
  return selected ? "accent" : undefined;
}

function nomineeLabelClass(mark: ReturnType<typeof tgaNomineeCallMark>) {
  if (mark === "correct") return "text-success";
  if (mark === "incorrect") return "text-miss";
  if (mark === "winner") return "text-gold";
  return "text-accent";
}

function MarkGlyph({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="inline-flex size-[1cap] shrink-0 items-center justify-center">
      <svg viewBox="0 0 16 16" className="block size-full" aria-hidden>
        {children}
      </svg>
    </span>
  );
}

function nomineeMarkIcon(mark: ReturnType<typeof tgaNomineeCallMark>) {
  if (mark === "correct") {
    return (
      <MarkGlyph>
        <path
          d="M2.5 8.4 6.2 12 13.5 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="square"
        />
      </MarkGlyph>
    );
  }
  if (mark === "incorrect") {
    return (
      <MarkGlyph>
        <path
          d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="square"
        />
      </MarkGlyph>
    );
  }
  return null;
}

export function TgaBallotForm({
  categories,
  initialPicks,
  initialGuess,
  locked,
  signInHref,
  onSave,
  importLabel,
  onImport,
  onCopyToGlobal,
  globalHref,
}: {
  categories: TgaBallotCategory[];
  initialPicks: Record<string, string>;
  initialGuess: number | null;
  locked: boolean;
  signInHref?: string | null;
  onSave?: (input: {
    picks: Record<string, string>;
    worldPremieresGuess: number;
  }) => Promise<{ error?: string; promptGlobal?: boolean; ok?: boolean }>;
  importLabel?: string;
  onImport?: () => Promise<{
    error?: string;
    ok?: boolean;
    picks?: Record<string, string>;
    worldPremieresGuess?: number;
  }>;
  onCopyToGlobal?: (input: {
    picks: Record<string, string>;
    worldPremieresGuess: number;
  }) => Promise<{ error?: string; ok?: boolean }>;
  globalHref?: string;
}) {
  const router = useRouter();
  const initialGuessText = initialGuess != null ? String(initialGuess) : "";
  const [picks, setPicks] = useState(initialPicks);
  const [guess, setGuess] = useState(initialGuessText);
  const [savedPicks, setSavedPicks] = useState(initialPicks);
  const [savedGuess, setSavedGuess] = useState(initialGuessText);
  const [message, setMessage] = useState<string | null>(null);
  const [promptGlobal, setPromptGlobal] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirty =
    guess !== savedGuess || JSON.stringify(picks) !== JSON.stringify(savedPicks);
  const canPick = !locked && !signInHref;
  const hasExistingPicks =
    Object.keys(picks).length > 0 || guess !== "";

  function runImport() {
    if (!onImport) return;
    setConfirmImport(false);
    startTransition(async () => {
      setMessage(null);
      const result = await onImport();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      if (result.picks) {
        setPicks(result.picks);
        setSavedPicks(result.picks);
      }
      if (result.worldPremieresGuess != null) {
        const nextGuess = String(result.worldPremieresGuess);
        setGuess(nextGuess);
        setSavedGuess(nextGuess);
      }
    });
  }

  function requestImport() {
    if (hasExistingPicks) {
      setConfirmImport(true);
      return;
    }
    runImport();
  }

  return (
    <div className="mt-10 space-y-12">
      {signInHref ? (
        <p className="max-w-xl text-muted">
          <Link href={signInHref} className="font-semibold text-accent" rel="nofollow">
            Sign in
          </Link>{" "}
          to make your picks.
        </p>
      ) : null}
      {onImport && canPick ? (
        <div>
          <Button
            type="button"
            variant="bordered"
            disabled={pending}
            onClick={requestImport}
          >
            {importLabel ?? "Import from the global sheet"}
          </Button>
        </div>
      ) : null}
      {categories.map((category) => (
        <section key={category.id}>
          <h2 className="font-display text-2xl tracking-wide text-ink">
            {category.label}
          </h2>
          {category.description ? (
            <p className="mt-1 text-sm text-muted">{category.description}</p>
          ) : null}
          <ul className={`mt-4 ${tgaNomineeGridClass}`}>
            {category.nominees.map((nominee) => {
              const selected = picks[category.id] === nominee.id;
              const winnerNomineeId = locked ? category.winnerNomineeId : null;
              const mark = tgaNomineeCallMark({
                nomineeId: nominee.id,
                winnerNomineeId,
                pickNomineeId: picks[category.id],
              });
              const label = tgaNomineeCallLabel(mark);
              const pickable = canPick && !winnerNomineeId;
              const gameHref =
                locked && category.kind === "game" && nominee.slug
                  ? `/games/${nominee.slug}`
                  : null;
              const body = (
                <>
                  <GameCover
                    title={nominee.displayName}
                    imageUrl={nominee.imageUrl}
                    frame={nomineeCoverFrame(mark, selected)}
                    dimmed={mark === "incorrect"}
                  />
                  {label ? (
                    <p
                      className={`mt-2 inline-flex items-center gap-[0.35em] text-[0.65rem] uppercase leading-none tracking-[0.16em] ${nomineeLabelClass(mark)}`}
                    >
                      {nomineeMarkIcon(mark)}
                      <span>{label}</span>
                    </p>
                  ) : null}
                  <p
                    className={`font-display text-lg leading-none tracking-wide text-ink ${
                      label ? "mt-1" : "mt-2"
                    } ${mark === "incorrect" ? "opacity-40" : ""} ${
                      gameHref ? "group-hover:text-accent" : ""
                    }`}
                  >
                    {nominee.displayName}
                  </p>
                </>
              );
              return (
                <li
                  key={nominee.id}
                  className={`min-w-0 ${mark === "other" ? "opacity-40" : ""}`}
                >
                  {pickable ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPicks((current) => ({
                          ...current,
                          [category.id]: nominee.id,
                        }))
                      }
                      className="w-full min-w-0 text-left"
                    >
                      {body}
                    </button>
                  ) : gameHref ? (
                    <Link href={gameHref} className="group block w-full min-w-0 text-left">
                      {body}
                    </Link>
                  ) : (
                    <div className="w-full min-w-0">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <label className="block max-w-xs text-sm">
        <span className="text-muted">World Premieres</span>
        <input
          type="number"
          min={0}
          max={200}
          className={`${fieldInputClass} mt-1`}
          value={guess}
          disabled={!canPick}
          onChange={(event) => setGuess(event.target.value)}
        />
      </label>
      {message ? (
        <p className="text-sm text-accent" role="alert">
          {message}
        </p>
      ) : null}
      {canPick && dirty ? (
        <PinnedSaveBar>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setMessage(null);
                const n = Number(guess);
                if (!onSave) return;
                const result = await onSave({
                  picks,
                  worldPremieresGuess: Number.isInteger(n) ? n : -1,
                });
                if (result.error) {
                  setMessage(result.error);
                  return;
                }
                setSavedPicks(picks);
                setSavedGuess(guess);
                const complete = isCompleteTgaSheet(
                  categories.map((category) => category.id),
                  picks,
                  Number.isInteger(n) ? n : null,
                );
                setPromptGlobal(
                  Boolean(
                    result.promptGlobal &&
                      complete &&
                      onCopyToGlobal &&
                      globalHref,
                  ),
                );
              })
            }
          >
            {pending ? "Saving…" : "Save picks"}
          </Button>
        </PinnedSaveBar>
      ) : null}
      {confirmImport ? (
        <ConfirmDialog
          titleId="tga-import-title"
          title="Replace your picks?"
          message="Importing from the global sheet will replace the picks already on this ballot."
          confirmLabel="Import anyway"
          onCancel={() => setConfirmImport(false)}
          onConfirm={runImport}
        />
      ) : null}
      {promptGlobal && onCopyToGlobal && globalHref ? (
        <ConfirmDialog
          titleId="tga-copy-global-title"
          title="Save these to the global game?"
          message="Your community picks are saved. You do not have a site sheet yet. Save this same entry there?"
          confirmLabel="Save and open"
          cancelLabel="Not now"
          onCancel={() => setPromptGlobal(false)}
          onConfirm={() =>
            startTransition(async () => {
              setMessage(null);
              const n = Number(guess);
              const result = await onCopyToGlobal({
                picks,
                worldPremieresGuess: Number.isInteger(n) ? n : -1,
              });
              if (result.error) {
                setMessage(result.error);
                return;
              }
              setPromptGlobal(false);
              router.push(globalHref);
            })
          }
        />
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  titleId,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onCancel,
  onConfirm,
}: {
  titleId: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md border border-line bg-panel p-5"
      >
        <p
          id={titleId}
          className="font-display text-2xl tracking-wide text-ink"
        >
          {title}
        </p>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="bordered" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
