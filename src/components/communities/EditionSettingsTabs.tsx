import Link from "next/link";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import {
  editionHostHostsHref,
  editionHostPreviewHref,
  editionHostSettingsHref,
} from "@/lib/communities/edition-results-href";
import type { EditionSettingsPanelId } from "@/lib/communities/edition-results-scoring";

/** Tertiary tabs inside Event Settings. */
export function EditionSettingsTabs({
  slug,
  year,
  active,
  includePreview,
}: {
  slug: string;
  year: number;
  active: EditionSettingsPanelId;
  includePreview: boolean;
}) {
  return (
    <ScrollableNav
      aria-label="Event settings"
      className="mt-6"
      border={false}
      rowClassName="items-center gap-x-3"
    >
      <Link
        href={editionHostSettingsHref(slug, year)}
        className={navItemClass("tertiary", active === "edition")}
      >
        Edition settings
      </Link>
      <span className="text-muted" aria-hidden>
        ·
      </span>
      <Link
        href={editionHostHostsHref(slug, year)}
        className={navItemClass("tertiary", active === "hosts")}
      >
        Manage hosts
      </Link>
      {includePreview ? (
        <>
          <span className="text-muted" aria-hidden>
            ·
          </span>
          <Link
            href={editionHostPreviewHref(slug, year)}
            className={navItemClass("tertiary", active === "preview")}
          >
            Host preview
          </Link>
        </>
      ) : null}
    </ScrollableNav>
  );
}
