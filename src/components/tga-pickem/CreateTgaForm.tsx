"use client";

import { useActionState, useMemo, useState } from "react";
import { createCommunityTgaYearAction } from "@/app/communities/[slug]/the-game-awards/actions";
import { Button } from "@/components/ui/Button";
import { YearPicker } from "@/components/ui/YearPicker";
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";

export function CreateTgaForm({
  slug,
  defaultYear,
  availableYears,
}: {
  slug: string;
  defaultYear: number;
  availableYears: number[];
}) {
  const [state, formAction, pending] = useActionState(
    createCommunityTgaYearAction,
    null,
  );
  const [year, setYear] = useState(defaultYear);
  const allowed = useMemo(() => new Set(availableYears), [availableYears]);
  const min = Math.min(...availableYears);
  const max = Math.max(...availableYears);
  const disabledYears = useMemo(() => {
    const blocked: number[] = [];
    for (let next = min; next <= max; next += 1) {
      if (!allowed.has(next)) blocked.push(next);
    }
    return blocked;
  }, [allowed, min, max]);

  return (
    <form action={formAction} className="mt-6 max-w-xl space-y-8">
      <input type="hidden" name="slug" value={slug} />
      <section className="space-y-3">
        <div>
          <label htmlFor="create-tga-year" className="block text-sm text-muted">
            Year
          </label>
          <YearPicker
            id="create-tga-year"
            name="year"
            value={year}
            min={min}
            max={max}
            disabledYears={disabledYears}
            required
            disabled={pending}
            className="mt-1"
            aria-label="Year"
            onChange={setYear}
          />
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="submit" variant="bordered" disabled={pending}>
          {pending ? "Creating…" : `Create ${TGA_PUBLIC_LABEL}`}
        </Button>
        {state?.error ? (
          <p className="text-sm text-accent" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
