"use client";

import { useState, useTransition } from "react";
import {
  copyEditionBallotToGotyAction,
  previewEditionBallotListExportAction,
} from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
import { EditionBallotListCopyDialog } from "@/components/communities/EditionBallotListCopyDialog";
import type { BallotListCopyMode, BallotListCopyPreview } from "@/lib/communities/ballot-list-copy";
import type { ListRankVisibility } from "@/lib/activity/kinds";

export function EditionBallotListExport({
  slug,
  year,
  canExport,
  disabled = false,
  disabledTitle,
}: {
  slug: string;
  year: number;
  canExport: boolean;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  const [preview, setPreview] = useState<BallotListCopyPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onExportClick() {
    if (disabled || !canExport) return;
    start(async () => {
      setError(null);
      const result = await previewEditionBallotListExportAction(slug, year);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPreview(result.preview);
    });
  }

  function onConfirm(opts: {
    rankVisibility?: ListRankVisibility;
    mode: BallotListCopyMode;
  }) {
    start(async () => {
      const result = await copyEditionBallotToGotyAction(
        slug,
        year,
        opts.rankVisibility,
        opts.mode,
        true,
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPreview(null);
      setError(null);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="bordered"
        size="sm"
        disabled={disabled || !canExport || pending}
        title={
          disabled
            ? disabledTitle
            : !canExport
              ? "Add games or award picks first."
              : undefined
        }
        onClick={() => void onExportClick()}
      >
        Export to my list
      </Button>
      {error && !preview ? (
        <p className="max-w-xs text-right text-sm text-accent">{error}</p>
      ) : null}
      {preview ? (
        <EditionBallotListCopyDialog
          preview={preview}
          pending={pending}
          error={error}
          source="manual"
          onDismiss={() => {
            setPreview(null);
            setError(null);
          }}
          onConfirm={onConfirm}
        />
      ) : null}
    </div>
  );
}
