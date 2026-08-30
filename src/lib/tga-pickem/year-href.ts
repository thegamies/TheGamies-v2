export const TGA_YEAR_VIEWS = ["ballot", "standings", "sheet", "settings"] as const;

export type TgaYearView = (typeof TGA_YEAR_VIEWS)[number];

export type TgaBoardMode = "community" | "voices";

export function parseTgaYearView(raw: unknown): TgaYearView {
  if (raw === "standings") return "standings";
  if (raw === "sheet") return "sheet";
  if (raw === "settings") return "settings";
  return "ballot";
}

export function parseTgaBoardMode(raw: unknown): TgaBoardMode {
  return raw === "voices" ? "voices" : "community";
}

export function parseTgaSheetUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const username = raw.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return null;
  return username;
}

/** Year page tabs (`?view=standings`). Default is Your ballot. */
export function tgaYearHref(
  path: string,
  opts: {
    view?: TgaYearView;
    page?: number;
    username?: string;
    mode?: TgaBoardMode;
  } = {},
): string {
  const params = new URLSearchParams();
  if (opts.view === "standings") {
    params.set("view", "standings");
    if (opts.mode === "voices") {
      params.set("mode", "voices");
    }
    if (opts.page && opts.page > 1) {
      params.set("page", String(opts.page));
    }
  } else if (opts.view === "sheet" && opts.username) {
    params.set("view", "sheet");
    params.set("u", opts.username);
  } else if (opts.view === "settings") {
    params.set("view", "settings");
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
