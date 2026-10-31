import { TgaPickemHowItWorks } from "@/components/tga-pickem/TgaPickemHowItWorks";
import { tgaPromoCopy } from "@/lib/tga-pickem/promo";
import type { TgaYearSchedule } from "@/lib/tga-pickem/status";

export function TgaBallotComingSoon({
  year,
}: {
  year: TgaYearSchedule;
}) {
  const copy = tgaPromoCopy(year);
  return (
    <div className="mt-6 space-y-3">
      <p className="max-w-xl text-sm text-muted">
        <span className="text-ink">{copy.accent}</span> {copy.rest}
      </p>
      <TgaPickemHowItWorks className="mt-0" />
    </div>
  );
}
