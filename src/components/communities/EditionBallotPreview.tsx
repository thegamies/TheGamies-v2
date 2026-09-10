"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { EditionCategoriesDraft } from "@/components/communities/EditionCategoriesDraft";
import { BallotChapterHeader } from "@/components/ui/BallotChapterHeader";
import { Button } from "@/components/ui/Button";
import { PinnedSaveBar } from "@/components/ui/PinnedSaveBar";
import { setCommunityEditionCategoriesAction } from "@/app/communities/actions";
import { EDITION_BALLOT_MAX_ITEMS } from "@/lib/communities/ballot-schema";
import type {
  CustomCategoryView,
  EditionBallotCategoryRef,
} from "@/lib/communities/custom-category-types";
import type { EditionAwardCategoryOption } from "@/lib/communities/edition-categories";
import type { EditionStatus } from "@/lib/communities/edition-status";
import type { AwardCategoryOption } from "@/components/lists/CategoryVotesEditor";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

export type EditionBallotPreviewCategory = {
  id: string;
  label: string;
  description: string | null;
  sortOrder?: number;
  categoryGroup?: string;
  eligibility?: string;
  allowEditions?: boolean;
};

function toOption(
  category: EditionBallotPreviewCategory | EditionAwardCategoryOption,
): EditionAwardCategoryOption {
  return {
    id: category.id,
    label: category.label,
    description: category.description,
    sortOrder: category.sortOrder ?? 0,
    enabled: true,
  };
}

function initialBallotOrder(
  categoryOptions: EditionAwardCategoryOption[],
  customCategories: CustomCategoryView[],
): EditionBallotCategoryRef[] {
  const items: Array<EditionBallotCategoryRef & { sortOrder: number }> = [
    ...categoryOptions.map((c) => ({
      kind: "site" as const,
      id: c.id,
      sortOrder: c.sortOrder,
    })),
    ...customCategories.map((c) => ({
      kind: "custom" as const,
      id: c.id,
      sortOrder: c.sortOrder,
    })),
  ];
  items.sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      (a.kind === b.kind ? 0 : a.kind === "site" ? -1 : 1) ||
      a.id.localeCompare(b.id),
  );
  return items.map(({ kind, id }) => ({ kind, id }));
}

function previewDraftKey(
  ballotOrder: EditionBallotCategoryRef[],
  entryOrders: Record<string, string[]>,
): string {
  return JSON.stringify({ ballotOrder, entryOrders });
}

export function EditionBallotPreview({
  year,
  slug,
  status = "scheduled",
  categories,
  customCategories = [],
  siteCategoryCatalog = [],
}: {
  year: number;
  slug: string;
  status?: EditionStatus;
  categories: Array<EditionBallotPreviewCategory | EditionAwardCategoryOption>;
  customCategories?: CustomCategoryView[];
  siteCategoryCatalog?: AwardCategoryOption[];
}) {
  const selected = useMemo(
    () => categories.map(toOption),
    [categories],
  );
  const syncKey = JSON.stringify({
    site: selected.map((c) => [c.id, c.sortOrder]),
    custom: customCategories.map((c) => [
      c.id,
      c.sortOrder,
      c.name,
      c.answerType,
      c.eligibility,
      c.entries.map((e) => e.id).join(","),
    ]),
  });

  return (
    <EditionBallotPreviewForm
      key={syncKey}
      year={year}
      slug={slug}
      status={status}
      selected={selected}
      customCategories={customCategories}
      siteCategoryCatalog={siteCategoryCatalog}
    />
  );
}

function EditionBallotPreviewForm({
  year,
  slug,
  status,
  selected: selectedInitial,
  customCategories,
  siteCategoryCatalog,
}: {
  year: number;
  slug: string;
  status: EditionStatus;
  selected: EditionAwardCategoryOption[];
  customCategories: CustomCategoryView[];
  siteCategoryCatalog: AwardCategoryOption[];
}) {
  const categoriesLocked =
    status === "open" || status === "closed" || status === "published";
  const [state, formAction, pending] = useActionState(
    setCommunityEditionCategoriesAction,
    null,
  );
  const [selected, setSelected] = useState(selectedInitial);
  const [ballotOrder, setBallotOrder] = useState(() =>
    initialBallotOrder(selectedInitial, customCategories),
  );
  const [entryOrders, setEntryOrders] = useState<Record<string, string[]>>(
    {},
  );
  const submittedKeyRef = useRef<string | null>(null);
  const initialKey = useMemo(
    () =>
      previewDraftKey(
        initialBallotOrder(selectedInitial, customCategories),
        {},
      ),
    [selectedInitial, customCategories],
  );
  const [savedKey, setSavedKey] = useState(initialKey);

  const currentKey = previewDraftKey(ballotOrder, entryOrders);
  const dirty = currentKey !== savedKey;

  const { dialog: unsavedDialog } = useUnsavedChangesGuard(dirty, {
    message: "Leave without saving? Your latest award order won’t be kept.",
  });

  useEffect(() => {
    if (!state) return;
    if ("ok" in state && state.ok && submittedKeyRef.current) {
      setSavedKey(submittedKeyRef.current);
    }
    submittedKeyRef.current = null;
  }, [state]);

  const siteIdsInOrder = ballotOrder
    .filter((r) => r.kind === "site")
    .map((r) => r.id);
  const error = state && "error" in state ? state.error : null;

  return (
    <div className={`mt-8 space-y-10 ${dirty ? "pb-24" : ""}`}>
      <p className="max-w-xl text-sm text-muted">
        Host preview. Members won’t see this ballot until voting opens.
      </p>

      <section>
        <BallotChapterHeader
          eyebrow="Top 10"
          title="Game of the Year"
          description={`Members will rank up to ${EDITION_BALLOT_MAX_ITEMS} games from ${year}.`}
        />
      </section>

      <section>
        <BallotChapterHeader
          eyebrow="Categories"
          title="Award picks"
          description="One pick per award, in this order."
        />
        <form
          className="mt-8"
          action={formAction}
          onSubmit={() => {
            submittedKeyRef.current = currentKey;
          }}
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="year" value={year} />
          {siteIdsInOrder.map((id) => (
            <input key={id} type="hidden" name="categoryIds" value={id} />
          ))}
          <input
            type="hidden"
            name="ballotOrderJson"
            value={JSON.stringify(ballotOrder)}
          />
          <input
            type="hidden"
            name="entryOrdersJson"
            value={JSON.stringify(entryOrders)}
          />
          <EditionCategoriesDraft
            catalog={siteCategoryCatalog}
            selected={selected}
            customCategories={customCategories}
            slug={slug}
            year={year}
            status={status}
            layout="ballot"
            disabled={pending}
            locked={categoriesLocked}
            onChange={setSelected}
            onBallotOrderChange={setBallotOrder}
            entryOrders={entryOrders}
            onEntryOrderChange={(categoryId, entryIds) => {
              const cat = customCategories.find((c) => c.id === categoryId);
              const serverIds = cat?.entries.map((e) => e.id) ?? [];
              const matchesServer =
                entryIds.length === serverIds.length &&
                entryIds.every((id, i) => id === serverIds[i]);
              setEntryOrders((prev) => {
                if (matchesServer) {
                  if (!(categoryId in prev)) return prev;
                  const next = { ...prev };
                  delete next[categoryId];
                  return next;
                }
                return { ...prev, [categoryId]: entryIds };
              });
            }}
          />
          {dirty ? (
            <PinnedSaveBar
              message={
                error ? (
                  <span className="text-accent">{error}</span>
                ) : (
                  "Unsaved changes"
                )
              }
            >
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save awards"}
              </Button>
            </PinnedSaveBar>
          ) : null}
        </form>
      </section>
      {unsavedDialog}
    </div>
  );
}
