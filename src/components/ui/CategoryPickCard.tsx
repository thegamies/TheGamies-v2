import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";

export function CategoryVoteHeading({
  label,
  description,
}: {
  label: string;
  description?: string | null;
}) {
  return (
    <div>
      <h3 className="font-display text-2xl tracking-wide text-ink">{label}</h3>
      {description ? (
        <p className="mt-1 text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
}

/** Picked category game: large cover, display category name, Clear when editable. */
export function CategoryPickCard({
  label,
  description,
  title,
  coverUrl,
  onClear,
}: {
  label: string;
  description?: string | null;
  title: string;
  coverUrl: string | null;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-start gap-4 sm:gap-5">
      <div className="w-28 shrink-0 sm:w-32">
        <GameCover title={title} imageUrl={coverUrl} />
      </div>
      <div className="min-w-0 flex-1">
        <CategoryVoteHeading label={label} description={description} />
        <p className="mt-3 text-ink">{title}</p>
        {onClear ? (
          <Button
            type="button"
            variant="quiet"
            className="mt-2 px-0 py-0"
            onClick={onClear}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
