import {
  EditionVoicesForm,
  type EditionVoiceMemberOption,
} from "@/app/communities/[slug]/settings/EditionVoicesForm";
import type { EditionStatus } from "@/lib/communities/edition-status";

/** Event page → Manage hosts. */
export function EditionEventHostsPanel({
  slug,
  year,
  status,
  voiceMembers,
}: {
  slug: string;
  year: number;
  status: EditionStatus;
  voiceMembers: EditionVoiceMemberOption[];
}) {
  return (
    <div className="mt-6">
      <EditionVoicesForm
        key={`${year}-${status}`}
        slug={slug}
        year={year}
        status={status}
        members={voiceMembers}
        locked={false}
      />
    </div>
  );
}
