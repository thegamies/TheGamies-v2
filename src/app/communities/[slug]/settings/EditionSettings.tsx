import Link from "next/link";
import { CreateEditionForm } from "./CreateEditionForm";
import { EditionYearSelect } from "@/components/communities/EditionYearSelect";
import {
  editionHostHostsHref,
  editionHostPreviewHref,
  editionHostSettingsHref,
} from "@/lib/communities/edition-results-href";
import type { CommunityEditionPublic } from "@/lib/communities/editions";

export function EditionSettings({
  slug,
  editions,
  selectedYear,
}: {
  slug: string;
  editions: CommunityEditionPublic[];
  selectedYear: number | null;
}) {
  const currentYear = new Date().getUTCFullYear();
  const years = editions.map((edition) => edition.year);
  const selected =
    selectedYear == null
      ? null
      : (editions.find((edition) => edition.year === selectedYear) ?? null);
  const showPreviewLink =
    selected != null &&
    (selected.status === "open" || selected.status === "closed");

  return (
    <div>
      <p className="mt-6 max-w-xl text-sm text-muted">
        Yearly awards vote. Create an event, then open it to edit schedule and
        categories, manage Hosts, or preview ballots.
      </p>

      <CreateEditionForm
        slug={slug}
        defaultYear={currentYear}
        existingYears={years}
      />

      {selected ? (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <EditionYearSelect
            slug={slug}
            year={selected.year}
            years={years}
            alwaysShow
            links="settings"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={editionHostSettingsHref(slug, selected.year)}
              className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent"
            >
              Edition settings
            </Link>
            <Link
              href={editionHostHostsHref(slug, selected.year)}
              className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent"
            >
              Manage hosts
            </Link>
            {showPreviewLink ? (
              <Link
                href={editionHostPreviewHref(slug, selected.year)}
                className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent"
              >
                Host preview
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">No events yet.</p>
      )}
    </div>
  );
}
