import { CategoryVoteHeading } from "@/components/ui/CategoryPickCard";

export type EditionBallotPreviewCategory = {
  id: string;
  label: string;
  description: string | null;
};

export function EditionBallotPreview({
  year,
  categories,
}: {
  year: number;
  categories: EditionBallotPreviewCategory[];
}) {
  return (
    <section className="mt-12">
      <h3 className="font-display text-3xl tracking-wide text-ink">
        On the ballot
      </h3>
      <p className="mt-3 max-w-xl font-serif text-lg leading-relaxed text-muted">
        Members will rank Game of the Year and pick one game in each category.
      </p>

      <div className="mt-10">
        <h4 className="font-display text-2xl tracking-wide text-ink">
          Game of the Year
        </h4>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Rank up to 10 games from {year}.
        </p>
      </div>

      {categories.length > 0 ? (
        <div className="mt-10">
          <h4 className="font-display text-2xl tracking-wide text-ink">
            Categories
          </h4>
          <p className="mt-2 max-w-xl text-sm text-muted">
            One pick per award.
          </p>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {categories.map((category) => (
              <li key={category.id} className="py-6">
                <CategoryVoteHeading
                  label={category.label}
                  description={category.description}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

