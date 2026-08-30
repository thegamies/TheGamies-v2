import { cookies } from "next/headers";

export const LIST_EDIT_COOKIE = "tg_list_edit";

export type ListEditCookie = {
  publicId: string;
  secret: string;
};

export function encodeListEditCookie(value: ListEditCookie): string {
  return `${value.publicId}.${value.secret}`;
}

export function parseListEditCookie(
  raw: string | undefined | null,
): ListEditCookie | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;
  const publicId = raw.slice(0, dot);
  const secret = raw.slice(dot + 1);
  if (!publicId || !secret) return null;
  return { publicId, secret };
}

export async function readListEditCookie(): Promise<ListEditCookie | null> {
  const jar = await cookies();
  return parseListEditCookie(jar.get(LIST_EDIT_COOKIE)?.value);
}

export async function setListEditCookie(value: ListEditCookie): Promise<void> {
  const jar = await cookies();
  jar.set(LIST_EDIT_COOKIE, encodeListEditCookie(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearListEditCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(LIST_EDIT_COOKIE);
}
