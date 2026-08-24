import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EDITION_RESULTS_ENTRANCE_WINDOW_DAYS,
  ENTRANCE_PREF_COOKIE,
  editionResultsEntranceStorageKey,
  hasEditionResultsEntrancePreference,
  hasEditionResultsEntrancePreferenceCookie,
  isEditionResultsEntranceOpen,
  markEditionResultsEntranceSeen,
  mergeEntrancePrefCookieValue,
} from "./edition-results-entrance";

describe("isEditionResultsEntranceOpen", () => {
  it("is false without a publish time", () => {
    expect(isEditionResultsEntranceOpen(null)).toBe(false);
    expect(isEditionResultsEntranceOpen(undefined)).toBe(false);
  });

  it("is open within the window and closed after", () => {
    const publishesAt = new Date("2026-01-01T12:00:00.000Z");
    const dayMs = 24 * 60 * 60 * 1000;
    const openAt = new Date(
      publishesAt.getTime() + (EDITION_RESULTS_ENTRANCE_WINDOW_DAYS - 1) * dayMs,
    );
    const closedAt = new Date(
      publishesAt.getTime() + EDITION_RESULTS_ENTRANCE_WINDOW_DAYS * dayMs,
    );
    expect(isEditionResultsEntranceOpen(publishesAt, openAt)).toBe(true);
    expect(isEditionResultsEntranceOpen(publishesAt, closedAt)).toBe(false);
  });
});

describe("edition results entrance preference", () => {
  const store = new Map<string, string>();
  const cookies = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    cookies.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      },
    });
    vi.stubGlobal("document", {
      get cookie() {
        return [...cookies.entries()]
          .map(([key, value]) => `${key}=${value}`)
          .join("; ");
      },
      set cookie(raw: string) {
        const pair = raw.split(";")[0] ?? "";
        const eq = pair.indexOf("=");
        if (eq === -1) return;
        cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a stable storage key", () => {
    expect(editionResultsEntranceStorageKey("demo", 2026)).toBe(
      "tg_edition_results_entrance:demo:2026",
    );
  });

  it("reads and writes localStorage preference", () => {
    expect(hasEditionResultsEntrancePreference("demo", 2026)).toBe(false);
    markEditionResultsEntranceSeen("demo", 2026);
    expect(hasEditionResultsEntrancePreference("demo", 2026)).toBe(true);
  });

  it("mirrors the preference in a cookie the Events page can read", () => {
    expect(
      hasEditionResultsEntrancePreferenceCookie(undefined, "demo", 2026),
    ).toBe(false);
    markEditionResultsEntranceSeen("demo", 2026);
    expect(cookies.get(ENTRANCE_PREF_COOKIE)).toBe("demo:2026");
    expect(
      hasEditionResultsEntrancePreferenceCookie("demo:2026", "demo", 2026),
    ).toBe(true);
    expect(mergeEntrancePrefCookieValue("demo:2026", "eric", 2025)).toBe(
      "demo:2026|eric:2025",
    );
  });
});
