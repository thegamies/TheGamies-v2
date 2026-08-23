"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { RadioOption } from "@/components/ui/Radio";
import { createCommunityAction } from "../actions";

export function CreateCommunityForm() {
  const [state, formAction, pending] = useActionState(
    createCommunityAction,
    null,
  );

  return (
    <form action={formAction} className="mt-10 max-w-md space-y-4">
      <label className="block text-sm text-muted">
        Name
        <input
          name="name"
          required
          maxLength={80}
          className={fieldInputClass}
        />
      </label>
      <label className="block text-sm text-muted">
        Description
        <textarea
          name="description"
          maxLength={500}
          rows={4}
          className={fieldInputClass}
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm text-muted">Visibility</legend>
        <RadioOption
          name="visibility"
          value="private"
          defaultChecked
          hint="Invite only. Not listed on member profiles."
        >
          Private
        </RadioOption>
        <RadioOption
          name="visibility"
          value="public"
          hint="Anyone can join, and the community appears on member profiles."
        >
          Public
        </RadioOption>
      </fieldset>
      {state?.error ? (
        <p className="text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create community"}
      </Button>
    </form>
  );
}
