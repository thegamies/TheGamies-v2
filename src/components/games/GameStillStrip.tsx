import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { GameWideStill } from "@/components/games/GameWideStill";

export function GameStillStrip({
  label,
  items,
}: {
  label: string;
  items: Array<{
    igdbId: number;
    imageUrl: string;
    width?: number | null;
    height?: number | null;
  }>;
}) {
  if (items.length === 0) return null;
  return (
    <HorizontalScroll label={label}>
      <ul className="flex w-max items-start gap-3 px-1 py-2">
        {items.map((item, index) => (
          <li key={item.igdbId}>
            <GameWideStill
              title={`${label} ${index + 1}`}
              imageUrl={item.imageUrl}
              width={item.width}
              height={item.height}
            />
          </li>
        ))}
      </ul>
    </HorizontalScroll>
  );
}
