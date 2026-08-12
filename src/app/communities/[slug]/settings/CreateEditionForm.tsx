"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { createCommunityEditionAction } from "../../actions";

export function CreateEditionForm({
  slug,
  defaultYear,
}: {
  slug: string;
  defaultYear: number;
}) {
  const [state, formAction, pending] = useActionState(
    createCommunityEditionAction,
    null,
  );

  return (
    <form action={formAction} className="mt-6 max-w-xl space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <label className="block text-sm text-muted">
        Year
        <input
          type="number"
          name="year"
          required
          min={1970}
          max={2100}
          defaultValue={defaultYear}
          className={`${fieldInputClass} mt-1`}
        />
      </label>
      <Button type="submit" variant="bordered" disabled={pending}>
        {pending ? "Creating…" : "Create edition"}
      </Button>
      {state?.error ? (
        <p className="text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
