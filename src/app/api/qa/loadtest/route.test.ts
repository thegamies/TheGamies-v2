import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const profiles = vi.hoisted(() => ({
  getProfileByUsername: vi.fn(),
}));
const saves = vi.hoisted(() => ({
  saveOwnedListFromClientDraft: vi.fn(),
  setLibraryStatus: vi.fn(),
  upsertEditionBallot: vi.fn(),
  saveCommunitySheet: vi.fn(),
  getCommunityBySlug: vi.fn(),
}));

vi.mock("@/lib/profile/service", () => profiles);
vi.mock("@/lib/lists/service", () => ({
  saveOwnedListFromClientDraft: saves.saveOwnedListFromClientDraft,
}));
vi.mock("@/lib/library/service", () => ({
  setLibraryStatus: saves.setLibraryStatus,
}));
vi.mock("@/lib/communities/ballots", () => ({
  upsertEditionBallot: saves.upsertEditionBallot,
}));
vi.mock("@/lib/tga-pickem/sheets", () => ({
  saveCommunitySheet: saves.saveCommunitySheet,
}));
vi.mock("@/lib/communities/service", () => ({
  getCommunityBySlug: saves.getCommunityBySlug,
}));

import { POST } from "./route";
import { LOADTEST_TGA_YEAR } from "@/lib/qa/loadtest";

function req(
  url: string,
  body: unknown,
  authorization = "Bearer load-s3cret",
  writer: string | null = "1",
) {
  const headers = new Headers({
    authorization,
    "content-type": "application/json",
  });
  if (writer) headers.set("x-loadtest-writer", writer);
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/qa/loadtest", () => {
  beforeEach(() => {
    vi.stubEnv("LOADTEST_SECRET", "load-s3cret");
    profiles.getProfileByUsername.mockReset();
    profiles.getProfileByUsername.mockResolvedValue({ id: "p1" });
    for (const fn of Object.values(saves)) fn.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("404s on production hosts", async () => {
    const res = await POST(
      req("https://thegamies.gg/api/qa/loadtest", { op: "library" }),
    );
    expect(res.status).toBe(404);
    expect(saves.setLibraryStatus).not.toHaveBeenCalled();
  });

  it("401s without the secret", async () => {
    const res = await POST(
      req(
        "https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest",
        { op: "library", gameId: "g", gameSlug: "g", status: "playing" },
        "Bearer nope",
      ),
    );
    expect(res.status).toBe(401);
  });

  it("requires a writer index", async () => {
    const res = await POST(
      req(
        "https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest",
        { op: "library", gameId: "g", gameSlug: "g", status: "playing" },
        "Bearer load-s3cret",
        null,
      ),
    );
    expect(res.status).toBe(400);
    expect(profiles.getProfileByUsername).not.toHaveBeenCalled();
  });

  it("401s when the writer profile is missing", async () => {
    profiles.getProfileByUsername.mockResolvedValue(null);
    const res = await POST(
      req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
        op: "library",
        gameId: "g",
        gameSlug: "g",
        status: "playing",
      }),
    );
    expect(res.status).toBe(401);
    expect(saves.setLibraryStatus).not.toHaveBeenCalled();
  });

  it("refuses the QA showcase community", async () => {
    const res = await POST(
      req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
        op: "ballot",
        slug: "gamies_qa_showcase",
        year: 2026,
        items: [],
      }),
    );
    expect(res.status).toBe(400);
    expect(saves.upsertEditionBallot).not.toHaveBeenCalled();
  });

  it("creates a list and returns publicId", async () => {
    saves.saveOwnedListFromClientDraft.mockResolvedValue({
      list: { publicId: "lst_load" },
    });
    const draft = {
      listType: "custom",
      title: "Load test list",
      items: [{ igdbId: 1, rank: 1 }],
    };
    const res = await POST(
      req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
        op: "list-create",
        draft,
      }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      publicId: "lst_load",
    });
    expect(saves.saveOwnedListFromClientDraft).toHaveBeenCalledWith(draft, {
      profileId: "p1",
    });
  });

  it("rejects the old list op name", async () => {
    const res = await POST(
      req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
        op: "list",
        draft: { listType: "custom", title: "x", items: [] },
      }),
    );
    expect(res.status).toBe(400);
    expect(saves.saveOwnedListFromClientDraft).not.toHaveBeenCalled();
  });

  it("saves a library row when authorized", async () => {
    saves.setLibraryStatus.mockResolvedValue({});
    const res = await POST(
      req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
        op: "library",
        gameId: "g1",
        gameSlug: "hades",
        status: "playing",
      }),
    );
    expect(res.status).toBe(200);
    expect(saves.setLibraryStatus).toHaveBeenCalledWith("p1", "g1", {
      status: "playing",
    });
    expect(profiles.getProfileByUsername).toHaveBeenCalledWith("gamies_qa_load_001");
  });

  it("rejects pickem writes for a non-open load year", async () => {
    const res = await POST(
      req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
        op: "pickem",
        slug: "gamies_qa_load",
        year: LOADTEST_TGA_YEAR + 1,
        worldPremieresGuess: 1,
        picks: {},
      }),
    );
    expect(res.status).toBe(400);
    expect(saves.saveCommunitySheet).not.toHaveBeenCalled();
  });
});
