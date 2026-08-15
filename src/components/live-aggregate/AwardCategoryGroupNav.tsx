import Link from "next/link";
import {
  AWARD_CATEGORY_GROUP_LABEL,
  AWARD_CATEGORY_GROUPS,
  type AwardCategoryGroup,
  type LiveStandingsViewId,
  standingsQueryString,
} from "@/lib/live-aggregate/award-category-defs";

export function AwardCategoryGroupNav({
  hrefBase,
  group,
  view = "categories",
}: {
  hrefBase: string;
  group: AwardCategoryGroup;
  view?: LiveStandingsViewId;
}) {
  return (
    <nav
      className="flex flex-wrap gap-x-4 gap-y-2"
      aria-label="Award groups"
    >
      {AWARD_CATEGORY_GROUPS.map((g) => (
        <Link
          key={g}
          href={`${hrefBase}${standingsQueryString({ group: g, view })}`}
          className={`text-sm tracking-wide transition-colors ${
            g === group
              ? "text-accent"
              : "text-muted hover:text-ink"
          }`}
        >
          {AWARD_CATEGORY_GROUP_LABEL[g]}
        </Link>
      ))}
    </nav>
  );
}
