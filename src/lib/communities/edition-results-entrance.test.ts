import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EDITION_RESULTS_ENTRANCE_WINDOW_DAYS,
  editionResultsEntranceStorageKey,
  hasEditionResultsEntrancePreference,
  isEditionResultsEntranceOpen,
  markEditionResultsEntranceSeen,
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

  beforeEach(() => {
    store.clear();
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
});
