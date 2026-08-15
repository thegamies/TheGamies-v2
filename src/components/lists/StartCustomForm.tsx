"use client";

import { useState } from "react";
import { startCustomDraftAction } from "@/app/create/actions";
import { Button } from "@/components/ui/Button";
import { YearPicker } from "@/components/ui/YearPicker";

export function StartCustomForm({ error = null }: { error?: string | null }) {
  const [year, setYear] = useState<number | "">("");

  return (
    <form action={startCustomDraftAction} className="max-w-sm space-y-4">
      {error ? (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
      <label className="block text-sm tracking-wide text-muted">
        Title
        <input
          name="title"
          required
          placeholder="All-time favorites"
          className="mt-1 block w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </label>
      <div>
        <label
          htmlFor="start-custom-year"
          className="block text-sm tracking-wide text-muted"
        >
          Year (optional)
        </label>
        <YearPicker
          id="start-custom-year"
          name="year"
          value={year}
          placeholder="No year"
          className="mt-1"
          aria-label="Year (optional)"
          onChange={setYear}
        />
      </div>
      <Button type="submit">Start custom list</Button>
    </form>
  );
}
