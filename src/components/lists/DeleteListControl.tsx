"use client";

import { useState } from "react";
import { deleteOwnedListAction } from "@/app/create/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export function DeleteListControl({
  publicId,
  listType,
  title,
  returnPath,
  disabled = false,
  onBeforeDelete,
}: {
  publicId: string;
  listType: "goty" | "custom";
  title: string;
  returnPath: string;
  disabled?: boolean;
  onBeforeDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const boardNote =
    listType === "goty"
      ? " It will also leave the Game of the Year board."
      : "";

  return (
    <>
      <Button
        type="button"
        variant="danger-bordered"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Delete list
      </Button>
      <Dialog
        open={open}
        tone="danger"
        title="Delete this list?"
        onClose={() => setOpen(false)}
        description={
          <>
            <span className="font-medium text-ink">{title}</span> will be
            removed permanently.{boardNote} This cannot be undone.
          </>
        }
      >
        <form
          action={deleteOwnedListAction}
          className="mt-5 flex justify-end gap-2"
          onSubmit={() => onBeforeDelete?.()}
        >
          <input type="hidden" name="publicId" value={publicId} />
          <input type="hidden" name="returnPath" value={returnPath} />
          <Button
            type="button"
            variant="bordered"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm">
            Delete list
          </Button>
        </form>
      </Dialog>
    </>
  );
}
