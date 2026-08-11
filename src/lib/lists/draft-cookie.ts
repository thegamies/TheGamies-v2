import { LIST_MAX_ITEMS, LIST_TYPES } from "@/lib/lists/schema";

export const LIST_DRAFT_COOKIE = "tg_list_draft";
export const LIST_DRAFT_STORAGE_KEY = "tg_list_draft_v1";

export const LIST_DRAFT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Soft ceiling so drafts stay under typical ~4KB cookie limits. */
export const LIST_DRAFT_MAX_ENCODED_BYTES = 3500;

export type ListDraftGame = {
  gameId: string;
  igdbId: number;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
};

export type ListDraftPayload = {
  v: 1;
  listType: (typeof LIST_TYPES)[number];
  year: number | null;
  title: string;
  igdbIds: number[];
  slotCount: number;
  listFormat?: "poster" | "list";
  rankStyle?: "banner" | "chip" | "off";
  showSuffix?: boolean;
  publicId?: string | null;
  /** Full game rows for instant client restore (localStorage). */
  games?: ListDraftGame[];
};

function isRankStyle(value: unknown): value is ListDraftPayload["rankStyle"] {
  return value === "banner" || value === "chip" || value === "off";
}

function isListFormat(value: unknown): value is ListDraftPayload["listFormat"] {
  return value === "poster" || value === "list";
}

function parseGames(raw: unknown): ListDraftGame[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const games: ListDraftGame[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const g = row as Record<string, unknown>;
    if (typeof g.igdbId !== "number" || !Number.isFinite(g.igdbId)) continue;
    if (typeof g.gameId !== "string" || !g.gameId) continue;
    if (typeof g.slug !== "string" || typeof g.title !== "string") continue;
    games.push({
      gameId: g.gameId,
      igdbId: Math.floor(g.igdbId),
      slug: g.slug,
      title: g.title,
      year:
        g.year == null
          ? null
          : typeof g.year === "number" && Number.isFinite(g.year)
            ? Math.floor(g.year)
            : null,
      coverUrl: typeof g.coverUrl === "string" ? g.coverUrl : null,
    });
  }
  return games.length > 0 ? games.slice(0, LIST_MAX_ITEMS) : undefined;
}

export function encodeListDraftCookie(payload: ListDraftPayload): string {
  // Keep the cookie compact — games stay in localStorage.
  const compact: ListDraftPayload = {
    v: payload.v,
    listType: payload.listType,
    year: payload.year,
    title: payload.title,
    igdbIds: payload.igdbIds,
    slotCount: payload.slotCount,
  };
  if (payload.listFormat) compact.listFormat = payload.listFormat;
  if (payload.rankStyle) compact.rankStyle = payload.rankStyle;
  if (typeof payload.showSuffix === "boolean") {
    compact.showSuffix = payload.showSuffix;
  }
  if (payload.publicId) compact.publicId = payload.publicId;
  return encodeURIComponent(JSON.stringify(compact));
}

export function parseListDraftCookie(
  raw: string | undefined | null,
): ListDraftPayload | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    const decoded = decodeURIComponent(raw);
    parsed = JSON.parse(decoded);
  } catch {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.v !== 1) return null;
  if (obj.listType !== "goty" && obj.listType !== "custom") return null;
  if (typeof obj.title !== "string") return null;

  const year =
    obj.year == null
      ? null
      : typeof obj.year === "number" && Number.isFinite(obj.year)
        ? Math.floor(obj.year)
        : null;

  if (!Array.isArray(obj.igdbIds)) return null;
  const igdbIds: number[] = [];
  for (const id of obj.igdbIds) {
    if (typeof id !== "number" || !Number.isFinite(id)) return null;
    const n = Math.floor(id);
    if (n <= 0) return null;
    if (!igdbIds.includes(n)) igdbIds.push(n);
    if (igdbIds.length > LIST_MAX_ITEMS) return null;
  }

  const slotCountRaw =
    typeof obj.slotCount === "number" && Number.isFinite(obj.slotCount)
      ? Math.floor(obj.slotCount)
      : Math.max(10, igdbIds.length);
  const slotCount = Math.min(
    LIST_MAX_ITEMS,
    Math.max(1, Math.max(slotCountRaw, igdbIds.length)),
  );

  const publicId =
    typeof obj.publicId === "string" && obj.publicId.trim()
      ? obj.publicId.trim()
      : null;

  const payload: ListDraftPayload = {
    v: 1,
    listType: obj.listType,
    year,
    title: obj.title.trim().slice(0, 120) || defaultTitle(obj.listType, year),
    igdbIds,
    slotCount,
  };

  if (isListFormat(obj.listFormat)) payload.listFormat = obj.listFormat;
  if (isRankStyle(obj.rankStyle)) payload.rankStyle = obj.rankStyle;
  if (typeof obj.showSuffix === "boolean") payload.showSuffix = obj.showSuffix;
  if (publicId) payload.publicId = publicId;
  const games = parseGames(obj.games);
  if (games) payload.games = games;

  return payload;
}

function defaultTitle(
  listType: ListDraftPayload["listType"],
  year: number | null,
): string {
  if (listType === "goty" && year != null) return `${year} Game of the Year`;
  return "Untitled list";
}

export function buildListDraftPayload(input: {
  listType: ListDraftPayload["listType"];
  year: number | null;
  title: string;
  igdbIds: number[];
  slotCount: number;
  listFormat?: ListDraftPayload["listFormat"];
  rankStyle?: ListDraftPayload["rankStyle"];
  showSuffix?: boolean;
  publicId?: string | null;
  games?: ListDraftGame[];
}): ListDraftPayload {
  const igdbIds = input.igdbIds
    .filter((id) => Number.isFinite(id) && id > 0)
    .map((id) => Math.floor(id))
    .filter((id, index, arr) => arr.indexOf(id) === index)
    .slice(0, LIST_MAX_ITEMS);

  const year =
    input.year == null || !Number.isFinite(input.year)
      ? null
      : Math.floor(input.year);

  const games = input.games?.slice(0, LIST_MAX_ITEMS);

  return {
    v: 1,
    listType: input.listType,
    year: input.listType === "goty" ? year : year,
    title:
      input.title.trim().slice(0, 120) ||
      defaultTitle(input.listType, year),
    igdbIds,
    slotCount: Math.min(
      LIST_MAX_ITEMS,
      Math.max(1, Math.max(input.slotCount, igdbIds.length)),
    ),
    ...(input.listFormat ? { listFormat: input.listFormat } : {}),
    ...(input.rankStyle ? { rankStyle: input.rankStyle } : {}),
    ...(typeof input.showSuffix === "boolean"
      ? { showSuffix: input.showSuffix }
      : {}),
    ...(input.publicId ? { publicId: input.publicId } : {}),
    ...(games && games.length > 0 ? { games } : {}),
  };
}

export function draftCookieFits(payload: ListDraftPayload): boolean {
  return (
    encodeListDraftCookie(payload).length <= LIST_DRAFT_MAX_ENCODED_BYTES
  );
}

export function draftMatchesEditor(
  draft: ListDraftPayload,
  input: { listType: "goty" | "custom"; yearNum: number },
): boolean {
  if (draft.listType !== input.listType) return false;
  if (input.listType === "goty" && draft.year !== input.yearNum) return false;
  return true;
}

function writeListDraftStorageClient(payload: ListDraftPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LIST_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function readListDraftStorageClient(): ListDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LIST_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return parseListDraftCookie(raw);
  } catch {
    return null;
  }
}

/** Prefer localStorage (full games), fall back to cookie. */
export function readListDraftClient(): ListDraftPayload | null {
  const fromStorage = readListDraftStorageClient();
  if (fromStorage) return fromStorage;
  return readListDraftCookieClient();
}

/** Client-side write (cookie + localStorage). */
export function writeListDraftCookieClient(payload: ListDraftPayload): boolean {
  if (typeof document === "undefined") return false;
  writeListDraftStorageClient(payload);
  if (!draftCookieFits(payload)) {
    // Still kept localStorage; cookie may be too large.
    return false;
  }
  const encoded = encodeListDraftCookie(payload);
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${LIST_DRAFT_COOKIE}=${encoded}; Path=/; Max-Age=${LIST_DRAFT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  return true;
}

export function clearListDraftCookieClient(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LIST_DRAFT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  try {
    window.localStorage.removeItem(LIST_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function readListDraftCookieClient(): ListDraftPayload | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LIST_DRAFT_COOKIE}=`));
  if (!match) return null;
  return parseListDraftCookie(match.slice(LIST_DRAFT_COOKIE.length + 1));
}

/** Server read of the client-writable draft cookie (not httpOnly). */
export async function readListDraftCookie(): Promise<ListDraftPayload | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return parseListDraftCookie(jar.get(LIST_DRAFT_COOKIE)?.value);
}

export async function setListDraftCookie(
  payload: ListDraftPayload,
): Promise<boolean> {
  if (!draftCookieFits(payload)) return false;
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  jar.set(LIST_DRAFT_COOKIE, encodeListDraftCookie(payload), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LIST_DRAFT_MAX_AGE_SECONDS,
  });
  return true;
}

export async function clearListDraftCookie(): Promise<void> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  jar.delete(LIST_DRAFT_COOKIE);
}
