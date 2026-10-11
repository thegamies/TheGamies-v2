"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { controlLabelClass, fieldInputClass } from "@/components/ui/controls";
import {
  AWARD_CATEGORY_ELIGIBILITIES,
  AWARD_CATEGORY_ELIGIBILITY_LABEL,
  AWARD_CATEGORY_GROUP_LABEL,
  AWARD_CATEGORY_GROUPS,
} from "@/lib/live-aggregate/award-category-defs";
import type { AwardCategoryRow } from "@/lib/live-aggregate/award-category-admin";
import {
  createAwardCategoryAction,
  updateAwardCategoryAction,
} from "./actions";

export function AdminAwardForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial: AwardCategoryRow;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    start(async () => {
      const result =
        mode === "create"
          ? await createAwardCategoryAction(formData)
          : await updateAwardCategoryAction(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <form action={onSubmit} className="mt-10 max-w-xl space-y-6">
      {mode === "edit" ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
      <label className="block">
        <span className={controlLabelClass}>Name</span>
        <input
          name="label"
          required
          maxLength={80}
          defaultValue={initial.label}
          className={fieldInputClass}
        />
      </label>
      {mode === "edit" ? (
        <p className="text-sm text-muted">
          Address stays <span className="text-ink">{initial.id}</span>.
        </p>
      ) : (
        <p className="text-sm text-muted">
          The address is created from the name and does not change later.
        </p>
      )}
      <label className="block">
        <span className={controlLabelClass}>Description</span>
        <textarea
          name="description"
          maxLength={280}
          rows={3}
          defaultValue={initial.description ?? ""}
          className={fieldInputClass}
        />
      </label>
      <label className="block">
        <span className={controlLabelClass}>Group</span>
        <select
          name="categoryGroup"
          defaultValue={initial.categoryGroup}
          className={fieldInputClass}
        >
          {AWARD_CATEGORY_GROUPS.map((group) => (
            <option key={group} value={group}>
              {AWARD_CATEGORY_GROUP_LABEL[group]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={controlLabelClass}>Which games qualify</span>
        <select
          name="eligibility"
          defaultValue={initial.eligibility}
          className={fieldInputClass}
        >
          {AWARD_CATEGORY_ELIGIBILITIES.map((value) => (
            <option key={value} value={value}>
              {AWARD_CATEGORY_ELIGIBILITY_LABEL[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={controlLabelClass}>Order</span>
        <input
          name="sortOrder"
          type="number"
          min={1}
          max={9999}
          required
          defaultValue={initial.sortOrder}
          className={fieldInputClass}
        />
      </label>
      <fieldset className="space-y-3">
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial.active}
            className="mt-1"
          />
          Shown on lists and ballots
        </label>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="allowEditions"
            defaultChecked={initial.allowEditions}
            className="mt-1"
          />
          Remakes and editions may win
        </label>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="allowDlcAddon"
            defaultChecked={initial.allowDlcAddon}
            className="mt-1"
          />
          Expansions and DLC add-ons may win
        </label>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="currentOrPreviousYear"
            defaultChecked={initial.currentOrPreviousYear}
            className="mt-1"
          />
          Only this calendar year and last year
        </label>
      </fieldset>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {mode === "create" ? "Add award" : "Save award"}
      </Button>
    </form>
  );
}
