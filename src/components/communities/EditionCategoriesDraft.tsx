"use client";

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useId, useMemo, useState } from "react";
import {
  CategorySheet,
  DeleteCustomCategoryDialog,
  CUSTOM_ANSWER_TYPE_LABELS,
  type CategoryModalMode,
} from "@/components/communities/CustomCategoriesEditor";
import { CustomCategoryBallotBlock } from "@/components/communities/CustomCategoryVotesEditor";
import { ListDragHandle } from "@/components/lists/ListDragHandle";
import { CategoryPickerGrid } from "@/components/lists/CategoryPickerGrid";
import {
  cardTouchLockClassName,
  useDragBodyScrollLock,
  useListCardDragSensors,
} from "@/components/lists/cardChrome";
import {
  SiteCategoryBallotBlock,
  type AwardCategoryOption,
} from "@/components/lists/CategoryVotesEditor";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { EditionAwardCategoryOption } from "@/lib/communities/edition-categories";
import type {
  CustomCategoryView,
  EditionBallotCategoryRef,
} from "@/lib/communities/custom-category-types";
import {
  customAnswerTypeUsesEligibility,
  parseCustomCategoryEligibility,
} from "@/lib/communities/custom-category-types";
import type { EditionStatus } from "@/lib/communities/edition-status";
import { awardEligibilityCaption, filterAwardsOfferedOnListYear } from "@/lib/live-aggregate/award-category-defs";
import { sortedAwardCategories } from "@/lib/lists/category-filter";

type OrderRow =
  | { kind: "site"; id: string; site: EditionAwardCategoryOption }
  | { kind: "custom"; id: string; custom: CustomCategoryView };

function siteBlockCategory(
  site: EditionAwardCategoryOption,
  catalog: AwardCategoryOption[],
): AwardCategoryOption {
  const hit = catalog.find((c) => c.id === site.id);
  return {
    id: site.id,
    label: site.label,
    description: site.description,
    sortOrder: site.sortOrder,
    categoryGroup: hit?.categoryGroup,
    eligibility: hit?.eligibility,
    allowEditions: hit?.allowEditions,
  };
}

function rowKey(row: OrderRow): string {
  return `${row.kind}:${row.id}`;
}

function mergeOrder(
  selected: EditionAwardCategoryOption[],
  customCategories: CustomCategoryView[],
): OrderRow[] {
  const siteById = new Map(selected.map((c) => [c.id, c]));
  const customById = new Map(customCategories.map((c) => [c.id, c]));
  const items: Array<{
    kind: "site" | "custom";
    id: string;
    sortOrder: number;
  }> = [
    ...selected.map((c) => ({
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

  const rows: OrderRow[] = [];
  for (const item of items) {
    if (item.kind === "site") {
      const site = siteById.get(item.id);
      if (site) rows.push({ kind: "site", id: item.id, site });
    } else {
      const custom = customById.get(item.id);
      if (custom) rows.push({ kind: "custom", id: item.id, custom });
    }
  }
  return rows;
}

function refsFromRows(rows: OrderRow[]): EditionBallotCategoryRef[] {
  return rows.map((r) => ({ kind: r.kind, id: r.id }));
}

function propsSyncKey(
  selected: EditionAwardCategoryOption[],
  customCategories: CustomCategoryView[],
): string {
  // Selected ids only (not local sortOrder) so drag keeps client order.
  // Custom includes sortOrder so server create/delete refreshes the list.
  return JSON.stringify({
    site: [...selected.map((c) => c.id)].sort(),
    custom: customCategories.map((c) => [
      c.id,
      c.sortOrder,
      c.name,
      c.answerType,
      c.eligibility,
      c.entries.length,
      c.entries.map((e) => e.id).join(","),
    ]),
  });
}

function eligibilityHint(
  category: CustomCategoryView,
  year?: number,
): string | null {
  if (!customAnswerTypeUsesEligibility(category.answerType)) return null;
  const eligibility = parseCustomCategoryEligibility(category.eligibility);
  return awardEligibilityCaption(eligibility, year);
}

function entryCountLabel(category: CustomCategoryView): string {
  if (category.answerType === "any_game") return "Any game";
  const n = category.entries.length;
  if (n === 0) return "No entries";
  if (n === 1) return "1 entry";
  return `${n} entries`;
}

export function EditionCategoriesDraft({
  catalog,
  selected,
  onChange,
  disabled,
  locked,
  customCategories = [],
  slug,
  year,
  status,
  onBallotOrderChange,
  entryOrders,
  onEntryOrderChange,
  onCustomCategoriesChange,
  layout = "list",
}: {
  catalog: AwardCategoryOption[];
  selected: EditionAwardCategoryOption[];
  onChange: (next: EditionAwardCategoryOption[]) => void;
  disabled: boolean;
  locked: boolean;
  customCategories?: CustomCategoryView[];
  slug?: string;
  year?: number;
  status?: EditionStatus;
  /** `ballot` keeps full award blocks; `list` is the compact Event Settings rows. */
  layout?: "list" | "ballot";
  onBallotOrderChange?: (refs: EditionBallotCategoryRef[]) => void;
  entryOrders?: Readonly<Record<string, string[]>>;
  onEntryOrderChange?: (categoryId: string, entryIds: string[]) => void;
  /** Local draft custom categories (Create Event before the edition exists). */
  onCustomCategoriesChange?: (next: CustomCategoryView[]) => void;
}) {
  const sorted = useMemo(() => sortedAwardCategories(catalog), [catalog]);
  const selectedIds = useMemo(
    () => new Set(selected.map((c) => c.id)),
    [selected],
  );
  const pickerCatalog = useMemo(() => {
    if (year == null) return sorted;
    return filterAwardsOfferedOnListYear(sorted, year, {
      keepIds: selectedIds,
    });
  }, [sorted, year, selectedIds]);

  const syncKey = propsSyncKey(selected, customCategories);
  const [order, setOrder] = useState<OrderRow[]>(() =>
    mergeOrder(selected, customCategories),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [categoryModal, setCategoryModal] = useState<CategoryModalMode | null>(
    null,
  );
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomCategoryView | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const dndId = useId();
  const sensors = useListCardDragSensors();
  useDragBodyScrollLock(dragging);
  const localCustom = Boolean(onCustomCategoriesChange);

  useEffect(() => {
    setOrder((prev) => {
      const merged = mergeOrder(selected, customCategories);
      const byKey = new Map<string, OrderRow>();
      for (const r of merged) {
        byKey.set(rowKey(r), r);
      }
      const next: OrderRow[] = [];
      for (const row of prev) {
        const key = rowKey(row);
        const fresh = byKey.get(key);
        if (fresh) {
          next.push(fresh);
          byKey.delete(key);
        }
      }
      for (const row of merged) {
        const key = rowKey(row);
        if (byKey.has(key)) {
          next.push(row);
          byKey.delete(key);
        }
      }
      return next;
    });
    // Intentionally sync when category identity/content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncKey captures selected + custom
  }, [syncKey]);

  useEffect(() => {
    onBallotOrderChange?.(refsFromRows(order));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- notify parent when order rows change
  }, [order]);

  const editingCategory =
    categoryModal?.kind === "edit"
      ? (customCategories.find((c) => c.id === categoryModal.categoryId) ?? null)
      : null;

  const canManageCustom =
    Boolean(slug) &&
    year != null &&
    !locked &&
    (status != null || localCustom);

  function openCreateCommunity() {
    setPickerOpen(false);
    setCategoryModal({ kind: "create" });
  }

  function cancelCreateCommunity() {
    setCategoryModal(null);
    setPickerOpen(true);
  }

  function closeCreateCommunity() {
    setCategoryModal(null);
  }

  const sortableIds = useMemo(
    () => order.map((r) => rowKey(r)),
    [order],
  );

  function applyOrder(next: OrderRow[]) {
    setOrder(next);

    const nextSelected = next
      .filter((r): r is Extract<OrderRow, { kind: "site" }> => r.kind === "site")
      .map((r) => r.site);
    if (
      nextSelected.length !== selected.length ||
      nextSelected.some((c, i) => c.id !== selected[i]?.id)
    ) {
      onChange(nextSelected);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((r) => rowKey(r) === String(active.id));
    const newIndex = order.findIndex((r) => rowKey(r) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    applyOrder(arrayMove(order, oldIndex, newIndex));
  }

  function toggleCategory(id: string) {
    const hit = sorted.find((c) => c.id === id);
    if (!hit) return;
    if (selectedIds.has(id)) {
      onChange(selected.filter((row) => row.id !== id));
      setOrder((cur) =>
        cur.filter((r) => !(r.kind === "site" && r.id === id)),
      );
      return;
    }
    const row: EditionAwardCategoryOption = {
      id: hit.id,
      label: hit.label,
      description: hit.description,
      sortOrder: hit.sortOrder ?? selected.length + 1,
      enabled: true,
    };
    onChange([...selected, row]);
    setOrder((cur) => [...cur, { kind: "site", id: row.id, site: row }]);
  }

  function removeSite(id: string) {
    onChange(selected.filter((row) => row.id !== id));
    setOrder((cur) => cur.filter((r) => !(r.kind === "site" && r.id === id)));
  }

  return (
    <>
      <div>
        {order.length === 0 ? (
          <p className="text-sm text-muted">No categories on this ballot yet.</p>
        ) : locked ? (
          <ul
            className={
              layout === "ballot"
                ? "divide-y divide-line border-y border-line"
                : "space-y-0 border-t border-line"
            }
          >
            {order.map((row) =>
              row.kind === "site" ? (
                layout === "ballot" ? (
                  <li key={rowKey(row)} className="py-6">
                    <SiteCategoryBallotBlock
                      category={siteBlockCategory(row.site, sorted)}
                      year={year}
                      interactive={false}
                    />
                  </li>
                ) : (
                  <li
                    key={rowKey(row)}
                    className="border-b border-line py-3 text-sm text-ink"
                  >
                    <span className="font-semibold">{row.site.label}</span>
                    {row.site.description ? (
                      <span className="mt-0.5 block text-muted">
                        {row.site.description}
                      </span>
                    ) : null}
                  </li>
                )
              ) : layout === "ballot" ? (
                <li key={rowKey(row)} className="py-6">
                  <CustomCategoryBallotBlock
                    category={row.custom}
                    year={year}
                    interactive={false}
                  />
                </li>
              ) : (
                <LockedCustomRow
                  key={rowKey(row)}
                  category={row.custom}
                  year={year}
                  previewOpen={previewId === row.custom.id}
                  onTogglePreview={() =>
                    setPreviewId((cur) =>
                      cur === row.custom.id ? null : row.custom.id,
                    )
                  }
                />
              ),
            )}
          </ul>
        ) : (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setDragging(true)}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDragging(false)}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              <ul
                className={
                  layout === "ballot"
                    ? "divide-y divide-line border-y border-line"
                    : "space-y-0 border-t border-line"
                }
              >
                {order.map((row) =>
                  row.kind === "site" ? (
                    <SortableSiteRow
                      key={rowKey(row)}
                      id={rowKey(row)}
                      category={row.site}
                      catalog={sorted}
                      year={year}
                      layout={layout}
                      disabled={disabled}
                      onRemove={() => removeSite(row.site.id)}
                    />
                  ) : (
                    <SortableCustomRow
                      key={rowKey(row)}
                      id={rowKey(row)}
                      category={row.custom}
                      year={year}
                      layout={layout}
                      disabled={disabled}
                      canManage={canManageCustom}
                      previewOpen={previewId === row.custom.id}
                      onTogglePreview={() =>
                        setPreviewId((cur) =>
                          cur === row.custom.id ? null : row.custom.id,
                        )
                      }
                      onEdit={() =>
                        setCategoryModal({
                          kind: "edit",
                          categoryId: row.custom.id,
                        })
                      }
                      onDelete={() => setDeleteTarget(row.custom)}
                    />
                  ),
                )}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        {order.length > 0 && !locked ? (
          <p className="mt-2 text-xs text-muted">
            Hold the handle to reorder.
            {layout === "ballot"
              ? " Changes save with Save awards."
              : " Changes save with settings."}
          </p>
        ) : null}
      </div>

      {locked ? null : (
        <div className="pt-2">
          <Button
            type="button"
            variant="bordered"
            size="sm"
            disabled={disabled || (sorted.length === 0 && !canManageCustom)}
            onClick={() => setPickerOpen(true)}
          >
            Add category
          </Button>
        </div>
      )}

      <Dialog
        open={pickerOpen}
        title="Add category"
        placement="contained"
        className="w-full max-w-3xl"
        description={
          canManageCustom
            ? "Create a community award, or choose site awards for this ballot."
            : "Choose site awards for this event’s ballot. Tap again to remove."
        }
        onClose={() => setPickerOpen(false)}
      >
        <CategoryPickerGrid
          categories={pickerCatalog}
          selectedIds={selectedIds}
          year={year}
          onSelect={toggleCategory}
          stickyToolbar
          className=""
          onCreateCommunity={
            canManageCustom ? openCreateCommunity : undefined
          }
        />
      </Dialog>

      {slug != null && year != null ? (
        <>
          <CategorySheet
            open={categoryModal != null}
            mode={categoryModal}
            category={editingCategory}
            slug={slug}
            year={year}
            orderedEntryIds={
              editingCategory
                ? entryOrders?.[editingCategory.id]
                : undefined
            }
            onEntryOrderChange={
              editingCategory && onEntryOrderChange
                ? (entryIds) =>
                    onEntryOrderChange(editingCategory.id, entryIds)
                : undefined
            }
            onCancel={
              categoryModal?.kind === "create"
                ? cancelCreateCommunity
                : undefined
            }
            onLocalCreate={
              localCustom && onCustomCategoriesChange
                ? (created) => {
                    const sortOrder = order.length;
                    onCustomCategoriesChange([
                      ...customCategories,
                      { ...created, sortOrder },
                    ]);
                    closeCreateCommunity();
                  }
                : undefined
            }
            onLocalUpdate={
              localCustom && onCustomCategoriesChange
                ? (updated) => {
                    onCustomCategoriesChange(
                      customCategories.map((c) =>
                        c.id === updated.id ? updated : c,
                      ),
                    );
                  }
                : undefined
            }
            onClose={closeCreateCommunity}
          />
          <DeleteCustomCategoryDialog
            open={Boolean(deleteTarget)}
            category={deleteTarget}
            slug={slug}
            year={year}
            onLocalDelete={
              localCustom && onCustomCategoriesChange
                ? (categoryId) => {
                    onCustomCategoriesChange(
                      customCategories.filter((c) => c.id !== categoryId),
                    );
                  }
                : undefined
            }
            onClose={() => setDeleteTarget(null)}
          />
        </>
      ) : null}
    </>
  );
}

function LockedCustomRow({
  category,
  year,
  previewOpen,
  onTogglePreview,
}: {
  category: CustomCategoryView;
  year?: number;
  previewOpen: boolean;
  onTogglePreview: () => void;
}) {
  const hint = eligibilityHint(category, year);
  return (
    <li className="border-b border-line">
      <button
        type="button"
        className="w-full py-3 text-left"
        aria-expanded={previewOpen}
        onClick={onTogglePreview}
      >
        <p className="font-semibold text-ink">{category.name}</p>
        <p className="mt-0.5 text-sm text-muted">
          {CUSTOM_ANSWER_TYPE_LABELS[category.answerType]} ·{" "}
          {entryCountLabel(category)}
          {hint ? ` · ${hint}` : null}
          {previewOpen ? " · Hide preview" : " · Preview"}
        </p>
      </button>
      {previewOpen ? (
        <div className="border-t border-line bg-panel/30 px-3 py-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-muted">
            Ballot preview
          </p>
          <CustomCategoryBallotBlock
            category={category}
            year={year}
            interactive={false}
          />
        </div>
      ) : null}
    </li>
  );
}

function SortableSiteRow({
  id,
  category,
  catalog,
  year,
  layout,
  disabled,
  onRemove,
}: {
  id: UniqueIdentifier;
  category: EditionAwardCategoryOption;
  catalog: AwardCategoryOption[];
  year?: number;
  layout: "list" | "ballot";
  disabled: boolean;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-stretch text-ink ${cardTouchLockClassName} ${
        layout === "ballot" ? "" : "border-b border-line text-sm"
      } ${isDragging ? "z-10 bg-panel opacity-90 shadow-lg" : ""}`}
    >
      {layout === "ballot" ? (
        <div className="min-w-0 flex-1 py-6 pr-2">
          <SiteCategoryBallotBlock
            category={siteBlockCategory(category, catalog)}
            year={year}
            interactive={false}
          />
          <div className="mt-4">
            <Button
              type="button"
              variant="bordered"
              size="sm"
              disabled={disabled}
              onClick={onRemove}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3 py-3 pr-2">
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{category.label}</span>
            {category.description ? (
              <span className="mt-0.5 block text-muted">
                {category.description}
              </span>
            ) : null}
          </span>
          <Button
            type="button"
            variant="bordered"
            size="sm"
            disabled={disabled}
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      )}
      <div className="flex shrink-0 items-center border-l border-line">
        <ListDragHandle attributes={attributes} listeners={listeners} />
      </div>
    </li>
  );
}

function SortableCustomRow({
  id,
  category,
  year,
  layout,
  disabled,
  canManage,
  previewOpen,
  onTogglePreview,
  onEdit,
  onDelete,
}: {
  id: UniqueIdentifier;
  category: CustomCategoryView;
  year?: number;
  layout: "list" | "ballot";
  disabled: boolean;
  canManage: boolean;
  previewOpen: boolean;
  onTogglePreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const hint = eligibilityHint(category, year);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`${cardTouchLockClassName} ${
        layout === "ballot" ? "" : "border-b border-line"
      } ${isDragging ? "z-10 bg-panel opacity-90 shadow-lg" : ""}`}
    >
      <div className="flex items-stretch">
        {layout === "ballot" ? (
          <div className="min-w-0 flex-1 py-6 pr-2">
            <CustomCategoryBallotBlock
              category={category}
              year={year}
              interactive={false}
            />
            {canManage ? (
              <div className="mt-4 flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="bordered"
                  size="sm"
                  disabled={disabled}
                  onClick={onEdit}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="danger-bordered"
                  size="sm"
                  disabled={disabled}
                  onClick={onDelete}
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3 py-3 pr-2">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              aria-expanded={previewOpen}
              onClick={onTogglePreview}
            >
              <p className="font-semibold text-ink">{category.name}</p>
              <p className="mt-0.5 text-sm text-muted">
                {CUSTOM_ANSWER_TYPE_LABELS[category.answerType]} ·{" "}
                {entryCountLabel(category)}
                {hint ? ` · ${hint}` : null}
                {previewOpen ? " · Hide preview" : " · Preview"}
              </p>
            </button>
            {canManage ? (
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="bordered"
                  size="sm"
                  disabled={disabled}
                  onClick={onEdit}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="danger-bordered"
                  size="sm"
                  disabled={disabled}
                  onClick={onDelete}
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        )}
        <div className="flex shrink-0 items-center border-l border-line">
          <ListDragHandle attributes={attributes} listeners={listeners} />
        </div>
      </div>
      {layout === "list" && previewOpen ? (
        <div className="border-t border-line bg-panel/30 px-3 py-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-muted">
            Ballot preview
          </p>
          <CustomCategoryBallotBlock
            category={category}
            year={year}
            interactive={false}
          />
        </div>
      ) : null}
    </li>
  );
}

