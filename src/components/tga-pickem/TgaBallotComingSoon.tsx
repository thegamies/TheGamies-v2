import { tgaPromoCopy } from "@/lib/tga-pickem/promo";
import type { TgaYearSchedule } from "@/lib/tga-pickem/status";

export function TgaBallotComingSoon({
  year,
}: {
  year: TgaYearSchedule;
}) {
  const copy = tgaPromoCopy(year);
  return (
    <p className="mt-8 max-w-xl text-sm text-muted">
      <span className="text-ink">{copy.accent}</span> {copy.rest}
    </p>
  );
}
