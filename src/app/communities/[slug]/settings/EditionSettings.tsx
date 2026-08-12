import { CreateEditionForm } from "./CreateEditionForm";
import { EditionScheduleForm } from "./EditionScheduleForm";
import type { CommunityEditionPublic } from "@/lib/communities/editions";

export function EditionSettings({
  slug,
  editions,
}: {
  slug: string;
  editions: CommunityEditionPublic[];
}) {
  const currentYear = new Date().getUTCFullYear();

  return (
    <section className="mt-14 border-t border-line pt-8">
      <h2 className="font-display text-3xl tracking-wide text-ink">Edition</h2>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Year awards ceremony schedule. The Edition tab follows these times;
        voting UI comes next.
      </p>

      <CreateEditionForm slug={slug} defaultYear={currentYear} />

      {editions.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No editions yet.</p>
      ) : (
        editions.map((edition) => (
          <EditionScheduleForm
            key={edition.id}
            slug={slug}
            year={edition.year}
            status={edition.status}
            opensAt={edition.opensAt?.toISOString() ?? null}
            closesAt={edition.closesAt?.toISOString() ?? null}
            publishesAt={edition.publishesAt?.toISOString() ?? null}
          />
        ))
      )}
    </section>
  );
}
