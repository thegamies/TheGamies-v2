import Link from "next/link";
import { CreateEditionForm } from "./CreateEditionForm";
import { EditionYearSelect } from "@/components/communities/EditionYearSelect";
import { EditionYearSettings } from "@/components/communities/EditionYearSettings";
import type { EditionHostPreviewSubmitter } from "./EditionHostPreview";
import type { EditionVoiceMemberOption } from "./EditionVoicesForm";
import { editionHostSettingsHref } from "@/lib/communities/edition-results-href";
import type { CommunityEditionPublic } from "@/lib/communities/editions";

export function EditionSettings({
  slug,
  editions,
  selectedYear,
  voices,
  submitters,
}: {
  slug: string;
  editions: CommunityEditionPublic[];
  selectedYear: number | null;
  voices: EditionVoiceMemberOption[];
  submitters: EditionHostPreviewSubmitter[];
}) {
  const currentYear = new Date().getUTCFullYear();
  const years = editions.map((edition) => edition.year);
  const selected =
    selectedYear == null
      ? null
      : (editions.find((edition) => edition.year === selectedYear) ?? null);

  return (
    <div>
      <p className="mt-6 max-w-xl text-sm text-muted">
        Yearly awards vote. Create an event with its year and schedule, then
        manage Hosts and ballots for that year.
      </p>

      <CreateEditionForm
        slug={slug}
        defaultYear={currentYear}
        existingYears={years}
      />

      {selected ? (
        <>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <EditionYearSelect
              slug={slug}
              year={selected.year}
              years={years}
              alwaysShow
              links="settings"
            />
            <Link
              href={editionHostSettingsHref(slug, selected.year)}
              className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent"
            >
              Open event
            </Link>
          </div>
          <EditionYearSettings
            slug={slug}
            year={selected.year}
            status={selected.status}
            opensAt={selected.opensAt?.toISOString() ?? null}
            closesAt={selected.closesAt?.toISOString() ?? null}
            publishesAt={selected.publishesAt?.toISOString() ?? null}
            rankMode={selected.rankMode}
            submitters={submitters}
            voiceMembers={voices}
            showHeading={false}
          />
        </>
      ) : (
        <p className="mt-6 text-sm text-muted">No events yet.</p>
      )}
    </div>
  );
}
