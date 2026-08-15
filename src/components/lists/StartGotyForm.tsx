"use client";

import { useState } from "react";
import { startGotyDraftAction } from "@/app/create/actions";
import { Button } from "@/components/ui/Button";
import { YearPicker } from "@/components/ui/YearPicker";

const currentYear = new Date().getUTCFullYear();

export function StartGotyForm({
  defaultYear = currentYear,
  error = null,
}: {
  defaultYear?: number;
  error?: string | null;
}) {
  const [year, setYear] = useState(defaultYear);

  return (
    <form action={startGotyDraftAction} className="max-w-sm space-y-4">
      {error ? (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
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
          onChange={setYear}
        />
      </div>
      <Button type="submit">Start GOTY list</Button>
    </form>
  );
}
