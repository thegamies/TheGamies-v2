"use client";

import { Button } from "@/components/ui/Button";
import { controlLabelClass, fieldInputClass } from "@/components/ui/controls";

export function PeopleSearchForm({
  action,
  q,
  hidden,
}: {
  action: string;
  q: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form
      method="get"
      action={action}
      className="mt-8 flex flex-wrap items-end gap-4 border-y border-line py-5"
    >
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      <label className={`block ${controlLabelClass}`} htmlFor="people-q">
        Search
        <input
          id="people-q"
          name="q"
          defaultValue={q}
          className={`${fieldInputClass} min-w-[16rem]`}
          placeholder="Name or username"
        />
      </label>
      <Button type="submit">Search</Button>
    </form>
  );
}
