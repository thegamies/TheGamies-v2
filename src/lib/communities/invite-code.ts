import { randomBytes } from "node:crypto";

/** Crockford-style alphabet without I, O, 0, 1. */
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 10;

export function generateInviteCode(): string {
  const bytes = randomBytes(INVITE_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    out += INVITE_CODE_ALPHABET[bytes[i]! % INVITE_CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isInviteCodeFormat(code: string): boolean {
  return (
    code.length === INVITE_CODE_LENGTH &&
    [...code].every((ch) => INVITE_CODE_ALPHABET.includes(ch))
  );
}

export function parseInviteCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = normalizeInviteCode(raw);
  return isInviteCodeFormat(code) ? code : null;
}

export function inviteJoinPath(code: string): string {
  return `/communities/join/${encodeURIComponent(normalizeInviteCode(code))}`;
}

export function communityHeaderInvitePath(
  viewerInviteCode: string | null,
): string | null {
  return viewerInviteCode ? inviteJoinPath(viewerInviteCode) : null;
}

export function communitiesIndexHref(page = 1): string {
  return page > 1 ? `/communities?page=${page}` : "/communities";
}
