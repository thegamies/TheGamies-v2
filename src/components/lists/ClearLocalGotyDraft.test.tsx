/** @vitest-environment jsdom */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClearLocalGotyDraft } from "./ClearLocalGotyDraft";

const clearListDraftCookieClient = vi.fn();
const readListDraftClient = vi.fn();
const clearListDraftCookieAction = vi.fn();

vi.mock("@/lib/lists/draft-cookie", () => ({
  clearListDraftCookieClient: () => clearListDraftCookieClient(),
  readListDraftClient: () => readListDraftClient(),
}));

vi.mock("@/app/create/actions", () => ({
  clearListDraftCookieAction: () => clearListDraftCookieAction(),
}));

afterEach(() => {
  cleanup();
  clearListDraftCookieClient.mockReset();
  readListDraftClient.mockReset();
  clearListDraftCookieAction.mockReset();
});

describe("ClearLocalGotyDraft", () => {
  it("clears a matching GOTY draft", async () => {
    readListDraftClient.mockReturnValue({
      listType: "goty",
      year: 2026,
      igdbIds: [1],
    });
    render(<ClearLocalGotyDraft year={2026} />);
    expect(clearListDraftCookieClient).toHaveBeenCalledTimes(1);
    expect(clearListDraftCookieAction).toHaveBeenCalledTimes(1);
  });

  it("leaves a custom draft and a different GOTY year", async () => {
    readListDraftClient.mockReturnValue({
      listType: "custom",
      year: 2026,
      igdbIds: [1],
    });
    render(<ClearLocalGotyDraft year={2026} />);
    expect(clearListDraftCookieClient).not.toHaveBeenCalled();

    readListDraftClient.mockReturnValue({
      listType: "goty",
      year: 2025,
      igdbIds: [1],
    });
    render(<ClearLocalGotyDraft year={2026} />);
    expect(clearListDraftCookieClient).not.toHaveBeenCalled();
  });
});
