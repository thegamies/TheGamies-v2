"use client";

import { useRouter } from "@/lib/useRouter";
import { useState } from "react";
import { startGotyDraftAction } from "@/app/create/actions";
import { existingGotyPreviewHref } from "@/lib/lists/existing-goty";
import { Button } from "@/components/ui/Button";
import { YearPicker } from "@/components/ui/YearPicker";
import {
  type ListShareView,
  withListShareView,
} from "@/lib/lists/urls";

const currentYear = new Date().getUTCFullYear();

export function StartGotyForm({
  defaultYear = currentYear,
  syncYearInUrl = false,
  hasExistingForYear = false,
  error = null,
  editorView = "goty",
}: {
  defaultYear?: number;
  /** Keep `?year=` in sync so an owned year can show its preview on this page. */
  syncYearInUrl?: boolean;
  /** True when the selected year already has a list (preview shown below). */
  hasExistingForYear?: boolean;
  error?: string | null;
  /** Preserve Categories when starting or switching years. */
  editorView?: ListShareView;
}) {
  const router = useRouter();
  const [year, setYear] = useState(defaultYear);

  return (
    <form action={startGotyDraftAction} className="max-w-sm space-y-4">
      {error ? (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
      {editorView === "categories" ? (
        <input type="hidden" name="view" value="categories" />
      ) : null}
      <div>
        <label
          htmlFor="start-goty-year"
          className="block text-sm tracking-wide text-muted"
        >
          Year
        </label>
        <YearPicker
          id="start-goty-year"
          name="year"
          value={year}
          required
          className="mt-1"
          aria-label="Year"
          onChange={(next) => {
            setYear(next);
            if (syncYearInUrl) {
              router.replace(
                withListShareView(existingGotyPreviewHref(next), editorView),
              );
            }
          }}
        />
      </div>
      {hasExistingForYear ? null : (
        <Button type="submit">Start GOTY list</Button>
      )}
    </form>
  );
}
