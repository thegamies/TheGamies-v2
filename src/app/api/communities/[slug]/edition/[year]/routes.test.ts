import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSessionUser: vi.fn(),
  getRequestProfileByAuthUserId: vi.fn(),
  getCommunityBySlug: vi.fn(),
  getEditionByCommunityYear: vi.fn(),
  ensurePublishedEditionResults: vi.fn(),
  getEditionGotyPage: vi.fn(),
  getEditionCategoryPage: vi.fn(),
  getEditionComparisonBundle: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getRequestSessionUser: mocks.getRequestSessionUser,
  getRequestProfileByAuthUserId: mocks.getRequestProfileByAuthUserId,
}));

vi.mock("@/lib/communities/service", () => ({
  getCommunityBySlug: mocks.getCommunityBySlug,
}));

vi.mock("@/lib/communities/editions", () => ({
  getEditionByCommunityYear: mocks.getEditionByCommunityYear,
}));

vi.mock("@/lib/communities/edition-results", () => ({
  CATEGORY_RESULTS_PAGE_SIZE: 25,
  parseEditionResultMode: () => "combined",
  ensurePublishedEditionResults: mocks.ensurePublishedEditionResults,
  getEditionGotyPage: mocks.getEditionGotyPage,
  getEditionCategoryPage: mocks.getEditionCategoryPage,
  getEditionComparisonBundle: mocks.getEditionComparisonBundle,
}));

vi.mock("@/lib/live-aggregate/service", () => ({
  STANDINGS_PAGE_SIZE: 50,
}));

import { GET as getCategories } from "./categories/route";
import { GET as getComparison } from "./comparison/route";
import { GET as getStandings } from "./standings/route";

const MEMBER_PROFILE_ID = "profile-member";

type Setup = {
  visibility: "private" | "public";
  joinsClosed: boolean;
  signedInAsMember?: boolean;
  editionStatus?: string;
};

function setup({
  visibility,
  joinsClosed,
  signedInAsMember = false,
  editionStatus = "published",
}: Setup) {
  if (signedInAsMember) {
    mocks.getRequestSessionUser.mockResolvedValue({ id: "auth-member" });
    mocks.getRequestProfileByAuthUserId.mockResolvedValue({
      id: MEMBER_PROFILE_ID,
    });
  } else {
    mocks.getRequestSessionUser.mockResolvedValue(null);
  }
  mocks.getCommunityBySlug.mockImplementation(
    async (_slug: string, viewerProfileId?: string | null) => ({
      id: "community-1",
      slug: "secret-club",
      visibility,
      joinsClosed,
      viewerRole: viewerProfileId === MEMBER_PROFILE_ID ? "member" : null,
    }),
  );
  mocks.getEditionByCommunityYear.mockResolvedValue({
    id: "edition-1",
    year: 2025,
    status: editionStatus,
    rankMode: "dense",
  });
}

const context = {
  params: Promise.resolve({ slug: "secret-club", year: "2025" }),
};

const routes = [
  {
    name: "standings",
    call: () =>
      getStandings(
        new Request(
          "https://thegamies.gg/api/communities/secret-club/edition/2025/standings",
        ),
        context,
      ),
    loader: mocks.getEditionGotyPage,
  },
  {
    name: "categories",
    call: () =>
      getCategories(
        new Request(
          "https://thegamies.gg/api/communities/secret-club/edition/2025/categories?categoryId=cat-1",
        ),
        context,
      ),
    loader: mocks.getEditionCategoryPage,
  },
  {
    name: "comparison",
    call: () =>
      getComparison(
        new Request(
          "https://thegamies.gg/api/communities/secret-club/edition/2025/comparison",
        ),
        context,
      ),
    loader: mocks.getEditionComparisonBundle,
  },
];

describe.each(routes)("GET edition $name", ({ call, loader }) => {
  beforeEach(() => {
    vi.clearAllMocks();
    loader.mockResolvedValue({ ok: true });
  });

  it("hides a private community from signed-out visitors", async () => {
    setup({ visibility: "private", joinsClosed: true });
    const response = await call();
    expect(response.status).toBe(404);
    expect(loader).not.toHaveBeenCalled();
    expect(mocks.ensurePublishedEditionResults).not.toHaveBeenCalled();
  });

  it("hides a public community whose joins are still open", async () => {
    setup({ visibility: "public", joinsClosed: false });
    const response = await call();
    expect(response.status).toBe(404);
    expect(loader).not.toHaveBeenCalled();
  });

  it("serves a public showcase community to signed-out visitors", async () => {
    setup({ visibility: "public", joinsClosed: true });
    const response = await call();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("serves a private community to its members", async () => {
    setup({ visibility: "private", joinsClosed: false, signedInAsMember: true });
    const response = await call();
    expect(response.status).toBe(200);
    expect(mocks.getCommunityBySlug).toHaveBeenCalledWith(
      "secret-club",
      MEMBER_PROFILE_ID,
    );
  });

  it("hides an unpublished edition even from members", async () => {
    setup({
      visibility: "private",
      joinsClosed: false,
      signedInAsMember: true,
      editionStatus: "open",
    });
    const response = await call();
    expect(response.status).toBe(404);
    expect(loader).not.toHaveBeenCalled();
  });
});

describe("GET edition comparison viewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEditionComparisonBundle.mockResolvedValue({ ok: true });
  });

  it("passes the member's profile id to the comparison bundle", async () => {
    setup({ visibility: "private", joinsClosed: false, signedInAsMember: true });
    await routes[2].call();
    expect(mocks.getEditionComparisonBundle).toHaveBeenCalledWith("edition-1", {
      viewerProfileId: MEMBER_PROFILE_ID,
      rankMode: "dense",
    });
  });
});
