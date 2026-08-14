import { EditionHostPreview } from "@/app/communities/[slug]/settings/EditionHostPreview";
import type { EditionHostPreviewSubmitter } from "@/app/communities/[slug]/settings/EditionHostPreview";
import { DeleteEditionForm } from "@/app/communities/[slug]/settings/DeleteEditionForm";
import { EditionRankModeForm } from "@/app/communities/[slug]/settings/EditionRankModeForm";
import { EditionScheduleForm } from "@/app/communities/[slug]/settings/EditionScheduleForm";
import {
  EditionVoicesForm,
  type EditionVoiceMemberOption,
} from "@/app/communities/[slug]/settings/EditionVoicesForm";
import type { EditionStatus } from "@/lib/communities/edition-status";
import type { SharedRankMode } from "@/lib/standings/shared-rank";

export function EditionYearSettings({
  slug,
  year,
  status,
  opensAt,
  closesAt,
  publishesAt,
  rankMode,
  submitters,
  voiceMembers,
  showHeading = true,
}: {
  slug: string;
  year: number;
  status: EditionStatus;
  opensAt: string | null;
  closesAt: string | null;
  publishesAt: string | null;
  rankMode: SharedRankMode;
  submitters: EditionHostPreviewSubmitter[];
  voiceMembers: EditionVoiceMemberOption[];
  showHeading?: boolean;
}) {
  return (
    <div>
      <EditionScheduleForm
        slug={slug}
        year={year}
        status={status}
        opensAt={opensAt}
        closesAt={closesAt}
        publishesAt={publishesAt}
        showHeading={showHeading}
      />
      <EditionRankModeForm
        slug={slug}
        year={year}
        rankMode={rankMode}
      />
      <EditionHostPreview status={status} submitters={submitters} />
      <EditionVoicesForm
        slug={slug}
        year={year}
        status={status}
        members={voiceMembers}
        locked={status === "published"}
      />
      <DeleteEditionForm slug={slug} year={year} />
    </div>
  );
}
