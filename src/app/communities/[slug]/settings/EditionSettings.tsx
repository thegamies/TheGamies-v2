import Link from "next/link";
import { communityCreateEventHref } from "@/lib/communities/community-settings-href";
import {
  editionHostHostsHref,
  editionHostPreviewHref,
  editionHostSettingsHref,
} from "@/lib/communities/edition-results-href";
import type { CommunityEditionPublic } from "@/lib/communities/editions";
import {
  editionOverviewTitle,
  editionStatusLabel,
} from "@/lib/communities/edition-status";

const createEventLinkClass =
  "inline-flex items-center justify-center rounded-[var(--radius-control)] border border-line px-4 py-2 text-sm font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent";

const actionLinkClass =
  "inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent";

export function EditionSettings({
  slug,
  editions,
}: {
  slug: string;
  editions: CommunityEditionPublic[];
}) {
  return (
    <div>
      <p className="mt-6 max-w-xl text-sm text-muted">
        Yearly awards vote. Create an event, then open it to edit schedule and
        categories, manage Hosts, or preview ballots.
      </p>

      <div className="mt-6">
        <Link href={communityCreateEventHref(slug)} className={createEventLinkClass}>
          Create event
        </Link>
      </div>

      {editions.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No events yet.</p>
      ) : (
        <ul className="mt-10 border-t border-line">
          {editions.map((edition) => {
            const showPreview =
              edition.status === "open" || edition.status === "closed";
            return (
              <li
                key={edition.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3 border-b border-line py-5"
              >
                <div className="min-w-0">
                  <p className="font-display text-xl tracking-wide text-ink">
                    {editionOverviewTitle(edition.year)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {editionStatusLabel(edition.status)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={editionHostSettingsHref(slug, edition.year)}
                    className={actionLinkClass}
                  >
                    Edition settings
                  </Link>
                  <Link
                    href={editionHostHostsHref(slug, edition.year)}
                    className={actionLinkClass}
                  >
                    Manage hosts
                  </Link>
                  {showPreview ? (
                    <Link
                      href={editionHostPreviewHref(slug, edition.year)}
                      className={actionLinkClass}
                    >
                      Host preview
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
