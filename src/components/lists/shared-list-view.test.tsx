/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SharedListView } from "./SharedListView";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/components/lists/RefreshOnBfcache", () => ({
  RefreshOnBfcache: () => null,
}));

vi.mock("@/components/lists/SoftSavePrompt", () => ({
  SoftSavePrompt: () => null,
}));

vi.mock("@/components/list-export/ShareExportButton", () => ({
  ShareExportButton: () => null,
}));

vi.mock("@/components/list-export/ListExportAwardsLayout", () => ({
  ListExportPoster: () => null,
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

afterEach(() => {
  cleanup();
});

const data = {
  owner: { username: "eric4", displayName: "Eric", avatarUrl: null },
  items: [
    {
      gameId: "g1",
      slug: "hades-ii",
      title: "Hades II",
      year: 2026,
      coverUrl: null,
      rank: 1,
      blurb: "",
    },
  ],
  list: {
    publicId: "pub",
    listType: "goty",
    title: "2026 Game of the Year",
    year: 2026,
    listFormat: "list",
    rankStyle: "chip",
    showSuffix: false,
  },
};

const sharePath = "/u/eric4/goty-2026";

describe("SharedListView", () => {
  it("hides Make your own on your own list and skips GOTY year chrome", () => {
    render(
      <SharedListView
        data={data}
        canEdit
        canClaim={false}
        isSignedIn
        alreadyOwned
        editHref="/create/goty?id=pub"
        sharePath={sharePath}
      />,
    );

    expect(screen.queryByRole("link", { name: "Make your own" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "2026 Game of the Year" }),
    ).toBeTruthy();
    expect(screen.getByRole("group", { name: "List format" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Grid" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Poster" })).toBeTruthy();
  });

  it("offers Make your own on someone else’s list", () => {
    render(
      <SharedListView
        data={data}
        canEdit={false}
        canClaim={false}
        isSignedIn
        alreadyOwned={false}
        editHref="/create/goty?id=pub"
        sharePath={sharePath}
      />,
    );
    expect(screen.getByRole("link", { name: "Make your own" })).toBeTruthy();
  });

  it("links Game of the Year and Categories tabs on GOTY lists", () => {
    render(
      <SharedListView
        data={data}
        canEdit
        canClaim={false}
        isSignedIn
        alreadyOwned
        editHref="/create/goty?id=pub"
        sharePath={sharePath}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Game of the Year" }),
    ).toHaveAttribute("href", sharePath);
    expect(screen.getByRole("link", { name: "Categories" })).toHaveAttribute(
      "href",
      `${sharePath}?view=categories`,
    );
  });

  it("shows category picks and hides format controls on the Categories tab", () => {
    render(
      <SharedListView
        data={data}
        canEdit
        canClaim={false}
        isSignedIn
        alreadyOwned
        editHref="/create/goty?id=pub"
        sharePath={sharePath}
        view="categories"
        categoryPicks={[
          {
            categoryId: "best-debut",
            label: "Best Debut",
            description: null,
            slug: "hades-ii",
            title: "Hades II",
            coverUrl: null,
          },
        ]}
      />,
    );

    expect(screen.queryByRole("group", { name: "List format" })).toBeNull();
    expect(screen.getByText("Best Debut")).toBeTruthy();
    expect(screen.getByText(/1 pick/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/create/goty?id=pub&view=categories",
    );
  });

  it("omits GOTY tabs on custom lists", () => {
    render(
      <SharedListView
        data={{
          ...data,
          list: { ...data.list, listType: "custom", title: "Favorites" },
        }}
        canEdit={false}
        canClaim={false}
        isSignedIn
        alreadyOwned={false}
        editHref="/create/custom?id=pub"
        sharePath="/u/eric4/favorites"
      />,
    );

    expect(screen.queryByRole("link", { name: "Categories" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Game of the Year" }),
    ).toBeNull();
  });
});
