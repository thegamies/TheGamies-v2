import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  getRequestSessionUser: vi.fn(),
  getRequestProfileByAuthUserId: vi.fn(),
}));
const saves = vi.hoisted(() => ({
  saveOwnedListFromClientDraft: vi.fn(),
  setLibraryStatus: vi.fn(),
  upsertEditionBallot: vi.fn(),
  saveCommunitySheet: vi.fn(),
  getCommunityBySlug: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => session);
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
import { LOADTEST_TGA_OPEN_YEAR } from "@/lib/qa/loadtest";

function req(
  url: string,
  body: unknown,
  authorization = "Bearer load-s3cret",
) {
  return new Request(url, {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/qa/loadtest", () => {
  beforeEach(() => {
    vi.stubEnv("LOADTEST_SECRET", "load-s3cret");
    session.getRequestSessionUser.mockReset();
    session.getRequestProfileByAuthUserId.mockReset();
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

  it("refuses the QA showcase community", async () => {
    session.getRequestSessionUser.mockResolvedValue({ id: "u1" });
    session.getRequestProfileByAuthUserId.mockResolvedValue({ id: "p1" });
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

  it("saves a library row when authorized", async () => {
    session.getRequestSessionUser.mockResolvedValue({ id: "u1" });
    session.getRequestProfileByAuthUserId.mockResolvedValue({ id: "p1" });
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
  });

  it("rejects pickem writes for a non-open load year", async () => {
    session.getRequestSessionUser.mockResolvedValue({ id: "u1" });
    session.getRequestProfileByAuthUserId.mockResolvedValue({ id: "p1" });
    const res = await POST(
      req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
        op: "pickem",
        slug: "gamies_qa_load",
        year: LOADTEST_TGA_OPEN_YEAR + 1,
        worldPremieresGuess: 1,
        picks: {},
      }),
    );
    expect(res.status).toBe(400);
    expect(saves.saveCommunitySheet).not.toHaveBeenCalled();
  });
});
