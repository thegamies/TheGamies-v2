"use client";

import { useState } from "react";
import { ListExportDialog } from "./ListExportDialog";
import type { ExportGame } from "./listExportTypes";

export function ShareExportButton({
  games,
  year,
  title,
  listType = "goty",
}: {
  games: ExportGame[];
  year: number;
  title: string;
  listType?: "goty" | "custom";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={games.length === 0}
        className="border border-[var(--line)] px-4 py-2 text-[var(--ink)] transition-colors hover:border-[var(--accent)] disabled:opacity-40"
      >
        Export image
      </button>
      <ListExportDialog
        open={open}
        onOpenChange={setOpen}
        games={games}
        year={year}
        title={title}
        listType={listType}
      />
    </>
  );
}
