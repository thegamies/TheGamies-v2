import Link from "next/link";
import {
  controlGroupBarClass,
  segmentBtnClass,
} from "@/components/ui/controls";
import {
  tgaYearHref,
  type TgaBoardMode,
} from "@/lib/tga-pickem/year-href";

export function TgaBoardToggle({
  path,
  mode,
}: {
  path: string;
  mode: TgaBoardMode;
}) {
  return (
    <div className="mt-6">
      <div className={`${controlGroupBarClass} w-fit max-w-full`} role="group" aria-label="Board">
        <Link
          href={tgaYearHref(path, { view: "standings", mode: "community" })}
          scroll={false}
          className={segmentBtnClass(mode === "community")}
        >
          Community
        </Link>
        <Link
          href={tgaYearHref(path, { view: "standings", mode: "voices" })}
          scroll={false}
          className={segmentBtnClass(mode === "voices")}
        >
          Hosts
        </Link>
      </div>
    </div>
  );
}
