import Link from "next/link";
import type { EditionStatus } from "@/lib/communities/edition-status";

export type EditionHostPreviewSubmitter = {
  profileId: string;
  displayName: string;
  username: string;
  isVoice: boolean;
  itemCount: number;
};

export function EditionHostPreview({
  status,
  submitters,
}: {
  status: EditionStatus;
  submitters: EditionHostPreviewSubmitter[];
}) {
  if (status === "published") return null;

  return (
    <div className="mt-8">
      <h4 className="font-display text-xl tracking-wide text-ink">
        Host preview
      </h4>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Submitted ballots stay hidden until results publish.
      </p>
      {submitters.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No ballots submitted yet.</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            {submitters.length} submitted ballot
            {submitters.length === 1 ? "" : "s"}.
          </p>
          <ul className="mt-4 max-h-64 divide-y divide-line overflow-auto border-y border-line text-sm">
            {submitters.map((submitter) => (
              <li
                key={submitter.profileId}
                className="flex justify-between gap-3 py-3"
              >
                <span>
                  <Link
                    href={`/u/${submitter.username}`}
                    className="text-ink hover:text-accent"
                  >
                    {submitter.displayName}
                  </Link>
                  {submitter.isVoice ? (
                    <span className="text-muted"> · Host</span>
                  ) : null}
                </span>
                <span className="text-muted">
                  {submitter.itemCount}{" "}
                  {submitter.itemCount === 1 ? "game" : "games"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
