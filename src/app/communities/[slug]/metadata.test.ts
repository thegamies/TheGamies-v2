import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCommunityBySlug } = vi.hoisted(() => ({
  getCommunityBySlug: vi.fn(),
}));

vi.mock("@/lib/communities/service", () => ({ getCommunityBySlug }));
vi.mock("@/lib/auth/session", () => ({
  getRequestSessionUser: vi.fn(),
  getRequestProfileByAuthUserId: vi.fn(),
}));
vi.mock("@/lib/communities/editions", () => ({
  listEditionsForCommunity: vi.fn(),
  pickFeaturedEdition: vi.fn(),
  pickOverviewEditions: vi.fn(),
}));
vi.mock("@/lib/tga-pickem/service", () => ({
  getCommunityTgaPromoYear: vi.fn(),
}));

import { generateMetadata } from "./page";

function community(visibility: "public" | "private") {
  return {
    id: "c1",
    slug: "secret_club",
    name: "Secret Club",
    description: "We meet Tuesdays at the old arcade.",
    visibility,
    joinsClosed: false,
  };
}

async function metadataFor(visibility: "public" | "private") {
  getCommunityBySlug.mockResolvedValueOnce(community(visibility));
  return generateMetadata({ params: Promise.resolve({ slug: "secret_club" }) });
}

beforeEach(() => {
  getCommunityBySlug.mockReset();
});

describe("community home metadata", () => {
  it("never puts a private community's description in metadata", async () => {
    const meta = await metadataFor("private");
    const serialized = JSON.stringify(meta);
    expect(serialized).not.toContain("old arcade");
    expect(meta.description).toBe("Secret Club on The Gamies");
    expect(serialized).toContain("Secret Club");
  });

  it("keeps the description for public communities", async () => {
    const meta = await metadataFor("public");
    expect(meta.description).toBe("We meet Tuesdays at the old arcade.");
  });
});
