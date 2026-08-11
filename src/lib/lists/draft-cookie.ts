import { LIST_MAX_ITEMS, LIST_TYPES } from "@/lib/lists/schema";

export const LIST_DRAFT_COOKIE = "tg_list_draft";

export const LIST_DRAFT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Soft ceiling so drafts stay under typical ~4KB cookie limits. */
export const LIST_DRAFT_MAX_ENCODED_BYTES = 3500;

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
};

function isRankStyle(value: unknown): value is ListDraftPayload["rankStyle"] {
  return value === "banner" || value === "chip" || value === "off";
}

function isListFormat(value: unknown): value is ListDraftPayload["listFormat"] {
  return value === "poster" || value === "list";
}

export function encodeListDraftCookie(payload: ListDraftPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
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
  };
}

export function draftCookieFits(payload: ListDraftPayload): boolean {
  return (
    encodeListDraftCookie(payload).length <= LIST_DRAFT_MAX_ENCODED_BYTES
  );
}

/** Client-side write (non-httpOnly so the builder can auto-persist). */
export function writeListDraftCookieClient(payload: ListDraftPayload): boolean {
  if (typeof document === "undefined") return false;
  if (!draftCookieFits(payload)) return false;
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
