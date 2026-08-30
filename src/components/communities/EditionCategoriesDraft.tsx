"use client";

import { useMemo, useState } from "react";
import { CategoryPickerGrid } from "@/components/lists/CategoryPickerGrid";
import type { AwardCategoryOption } from "@/components/lists/CategoryVotesEditor";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { EditionAwardCategoryOption } from "@/lib/communities/edition-categories";
import { sortedAwardCategories } from "@/lib/lists/category-filter";

export function EditionCategoriesDraft({
  catalog,
  selected,
  disabled,
  locked,
  onChange,
}: {
  catalog: AwardCategoryOption[];
  selected: EditionAwardCategoryOption[];
  disabled: boolean;
  locked: boolean;
  onChange: (next: EditionAwardCategoryOption[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const sorted = useMemo(() => sortedAwardCategories(catalog), [catalog]);
  const selectedIds = useMemo(
    () => new Set(selected.map((c) => c.id)),
    [selected],
  );

  function toggleCategory(id: string) {
    const hit = sorted.find((c) => c.id === id);
    if (!hit) return;
    if (selectedIds.has(id)) {
      onChange(selected.filter((row) => row.id !== id));
      return;
    }
    onChange([
      ...selected,
      {
        id: hit.id,
        label: hit.label,
        description: hit.description,
        sortOrder: hit.sortOrder ?? selected.length + 1,
        enabled: true,
      },
    ]);
  }

  return (
    <>
      <div>
        <h5 className="text-sm font-semibold tracking-wide text-ink">
          Selected awards
        </h5>
        {selected.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No awards selected yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {selected.map((c) => (
              <li
                key={c.id}
                className="flex items-start justify-between gap-3 border-b border-line py-2 text-sm text-ink"
              >
                <span>
                  <span className="font-semibold">{c.label}</span>
                  {c.description ? (
                    <span className="mt-0.5 block text-muted">
                      {c.description}
                    </span>
                  ) : null}
                </span>
                {locked ? null : (
                  <Button
                    type="button"
                    variant="bordered"
                    size="sm"
                    disabled={disabled}
                    onClick={() =>
                      onChange(selected.filter((row) => row.id !== c.id))
                    }
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {locked ? null : (
        <div className="pt-2">
          <Button
            type="button"
            variant="bordered"
            size="sm"
            disabled={disabled || sorted.length === 0}
            onClick={() => setPickerOpen(true)}
          >
            Add category
          </Button>
        </div>
      )}

      <Dialog
        open={pickerOpen}
        title="Add categories"
        placement="contained"
        className="w-full max-w-3xl"
        description="Choose site awards for this event’s ballot. Tap again to remove."
        onClose={() => setPickerOpen(false)}
      >
        <CategoryPickerGrid
          categories={sorted}
          selectedIds={selectedIds}
          onSelect={toggleCategory}
          stickyToolbar
          className=""
        />
      </Dialog>
    </>
  );
}
