import Link from "next/link";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";
import { tgaYearHref, type TgaYearView } from "@/lib/tga-pickem/year-href";

export function TgaYearTabs({
  path,
  view,
  showSettings = false,
}: {
  path: string;
  view: TgaYearView;
  showSettings?: boolean;
}) {
  return (
    <ScrollableNav aria-label={TGA_PUBLIC_LABEL} className="mt-10">
      <Link
        href={tgaYearHref(path, { view: "ballot" })}
        scroll={false}
        className={navItemClass("secondary", view === "ballot")}
      >
        Your ballot
      </Link>
      <Link
        href={tgaYearHref(path, { view: "standings" })}
        scroll={false}
        className={navItemClass(
          "secondary",
          view === "standings" || view === "sheet",
        )}
      >
        Standings
      </Link>
      {showSettings ? (
        <Link
          href={tgaYearHref(path, { view: "settings" })}
          scroll={false}
          className={navItemClass("secondary", view === "settings")}
        >
          Settings
        </Link>
      ) : null}
    </ScrollableNav>
  );
}
