"use client";

import { useState } from "react";
import { ListExportDialog } from "./ListExportDialog";
import type { ExportGame } from "./listExportTypes";
import { Button } from "@/components/ui/Button";

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
      <Button
        type="button"
        variant="bordered"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={games.length === 0}
      >
        Export image
      </Button>
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
