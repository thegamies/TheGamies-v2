"use client";

import { useEffect } from "react";
import { clearListDraftCookieAction } from "@/app/create/actions";
import {
  clearListDraftCookieClient,
  readListDraftClient,
} from "@/lib/lists/draft-cookie";

/**
 * Clears leftover anon GOTY cookie/localStorage after the account already
 * owns that year. Server cookie clear alone is not enough.
 */
export function ClearLocalGotyDraft({ year }: { year: number }) {
  useEffect(() => {
    const draft = readListDraftClient();
    if (!draft || draft.listType !== "goty") return;
    if (draft.year !== year) return;
    clearListDraftCookieClient();
    void clearListDraftCookieAction();
  }, [year]);

  return null;
}
