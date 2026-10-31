import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actor = vi.hoisted(() => ({
  resolveLoadtestWriteActor: vi.fn(),
}));
const saves = vi.hoisted(() => ({
  saveOwnedListFromClientDraft: vi.fn(),
  setLibraryStatus: vi.fn(),
  upsertEditionBallot: vi.fn(),
  saveCommunitySheet: vi.fn(),
  getCommunityBySlug: vi.fn(),
}));

vi.mock("@/lib/qa/loadtest-guard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/qa/loadtest-guard")>(
    "@/lib/qa/loadtest-guard",
  );
  return {
    ...actual,
    resolveLoadtestWriteActor: actor.resolveLoadtestWriteActor,
  };
});
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

function req(url: string, body: unknown, cookie?: string) {
  const headers = new Headers({
    "content-type": "application/json",
  });
  if (cookie) headers.set("cookie", cookie);
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const staging =
  "https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest";

describe("POST /api/qa/loadtest", () => {
  beforeEach(() => {
    actor.resolveLoadtestWriteActor.mockReset();
    actor.resolveLoadtestWriteActor.mockResolvedValue({
      ok: true,
      profileId: "p1",
      mode: "session",
    });
    for (const fn of Object.values(saves)) fn.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("404s when the actor gate refuses production", async () => {
    actor.resolveLoadtestWriteActor.mockResolvedValue({
      status: 404,
      error: "Not found.",
    });
    const res = await POST(
      req("https://thegamies.gg/api/qa/loadtest", { op: "library" }),
    );
    expect(res.status).toBe(404);
    expect(saves.setLibraryStatus).not.toHaveBeenCalled();
  });

  it("401s when the actor is unauthorized", async () => {
    actor.resolveLoadtestWriteActor.mockResolvedValue({
      status: 401,
      error: "Unauthorized.",
    });
    const res = await POST(
      req(staging, {
        op: "library",
        gameId: "g",
        gameSlug: "g",
        status: "playing",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400s when the secret escape hatch omits the writer", async () => {
    actor.resolveLoadtestWriteActor.mockResolvedValue({
      status: 400,
      error: "Writer required.",
    });
    const res = await POST(
      req(staging, {
        op: "library",
        gameId: "g",
        gameSlug: "g",
        status: "playing",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("refuses the QA showcase community", async () => {
    const res = await POST(
      req(staging, {
        op: "ballot",
        slug: "gamies_qa_showcase",
        year: 2026,
        items: [],
      }),
    );
    expect(res.status).toBe(400);
    expect(saves.upsertEditionBallot).not.toHaveBeenCalled();
  });

  it("allows ballot writes on a scale community slug", async () => {
    saves.upsertEditionBallot.mockResolvedValue({ ok: true });
    const res = await POST(
      req(staging, {
        op: "ballot",
        slug: "seed_pem_0001",
        year: 2025,
        items: [{ gameId: "g1", rank: 1 }],
      }),
    );
    expect(res.status).toBe(200);
    expect(saves.upsertEditionBallot).toHaveBeenCalled();
  });

  it("creates a list and returns publicId for a session actor", async () => {
    saves.saveOwnedListFromClientDraft.mockResolvedValue({
      list: { publicId: "lst_load" },
    });
    const draft = {
      listType: "custom",
      title: "Load test list",
      items: [{ igdbId: 1, rank: 1 }],
    };
    const res = await POST(
      req(
        staging,
        { op: "list-create", draft },
        "better-auth.session_token=abc",
      ),
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
      req(staging, {
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
      req(staging, {
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
    const res = await POST(
      req(staging, {
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
