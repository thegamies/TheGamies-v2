/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { searchGamesForList } from "@/lib/lists/search-games-client";
import { ListDragHandle } from "./ListDragHandle";
import { GridListBuilder } from "./GridListBuilder";
import { ListEditor } from "./ListEditor";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/create/goty",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/app/create/actions", () => ({
  completeListAuthIntentAction: vi.fn(),
  saveOwnedListAction: vi.fn(),
  shareListAction: vi.fn(),
  syncSharedListAction: vi.fn(),
  hydrateDraftGamesAction: vi.fn(),
}));

vi.mock("@/lib/lists/search-games-client", () => ({
  searchGamesForList: vi.fn(),
}));

vi.mock("@/hooks/useUnsavedChangesGuard", () => ({
  useUnsavedChangesGuard: () => ({
    allowLeave: vi.fn(),
    dialog: null,
  }),
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

describe("ListDragHandle", () => {
  it("exposes a hold-to-move control", () => {
    render(
      <ListDragHandle
        attributes={{} as never}
        listeners={undefined}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Hold to move" }),
    ).toBeTruthy();
  });
});

describe("GridListBuilder titles", () => {
  it("uses standings display type for game titles", () => {
    render(
      <GridListBuilder
        items={[{ id: "g1", title: "Hades II", coverUrl: null }]}
        slotCount={2}
        onReorder={() => {}}
        onRemove={() => {}}
        onPickEmpty={() => {}}
      />,
    );
    const title = screen.getByTitle("Hades II");
    expect(title.className).toContain("font-display");
    expect(title.className).toContain("text-ink");
  });
});

describe("ListEditor chrome", () => {
  it("shows GOTY as body ink without a Title field", () => {
    render(
      <ListEditor
        listType="goty"
        initialTitle="2026 Game of the Year"
        initialYear={2026}
        initialItems={[]}
      />,
    );
    expect(screen.getByText("2026 Game of the Year")).toBeTruthy();
    expect(screen.queryByLabelText("Title")).toBeNull();
  });

  it("keeps toolbar Save when signed in", () => {
    render(
      <ListEditor
        signedIn
        listType="custom"
        initialTitle="Favorites"
        initialYear={null}
        initialItems={[]}
      />,
    );
    const saves = screen.getAllByRole("button", { name: "Save" });
    expect(saves.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Default view" })).toBeTruthy();
  });

  it("keeps search text after adding a game from results", async () => {
    vi.mocked(searchGamesForList).mockResolvedValue([
      {
        id: "g1",
        igdbId: 1,
        slug: "hades-ii",
        title: "Hades II",
        year: 2026,
        coverUrl: null,
      },
    ]);
    render(
      <ListEditor
        signedIn
        listType="goty"
        initialTitle="2026 Game of the Year"
        initialYear={2026}
        initialItems={[]}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Search games" });
    fireEvent.change(input, { target: { value: "hades" } });
    await waitFor(() => {
      expect(screen.getByTitle("Hades II")).toBeTruthy();
    });
    fireEvent.click(screen.getByTitle("Hades II"));
    expect(input).toHaveProperty("value", "hades");
  });
});
