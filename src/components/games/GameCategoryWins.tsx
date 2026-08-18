import Link from "next/link";

export type GameCategoryWinItem = {
  year: number;
  categoryId: string;
  label: string;
};

export function GameCategoryWins({
  wins,
  className,
}: {
  wins: GameCategoryWinItem[];
  className?: string;
}) {
  if (wins.length === 0) return null;

  return (
    <section
      className={className ?? "mt-8"}
      aria-label="Category awards"
    >
      <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        Category awards
      </p>
      <ul className="mt-3 space-y-2">
        {wins.map((win) => (
          <li key={`${win.year}-${win.categoryId}`}>
            <Link
              href={`/game-of-the-year/${win.year}?view=categories`}
              className="text-ink hover:text-accent"
            >
              {win.year} · {win.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
