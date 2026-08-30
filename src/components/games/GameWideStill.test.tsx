/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GameWideStill } from "./GameWideStill";

afterEach(() => {
  cleanup();
});

describe("GameWideStill", () => {
  it("keeps a fixed column width and uses native pixels on the image", () => {
    const { container } = render(
      <GameWideStill
        title="Banner"
        imageUrl="https://images.igdb.com/igdb/image/upload/t_720p/a.jpg"
        width={2560}
        height={800}
      />,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.className).toContain("sm:w-[320px]");
    expect(frame.className).not.toContain("aspect-video");
    const img = screen.getByRole("img", { name: "Banner" });
    expect(img.getAttribute("width")).toBe("2560");
    expect(img.getAttribute("height")).toBe("800");
  });
});
