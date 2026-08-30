import { describe, expect, it } from "vitest";
import { renderGameOgImage, renderOgImage } from "./og-image";

const PNG = [137, 80, 78, 71, 13, 10, 26, 10];

async function expectPng(res: Response) {
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect(bytes.byteLength).toBeGreaterThan(1000);
  expect([...bytes.slice(0, 8)]).toEqual(PNG);
}

describe("OG cards", () => {
  it("renders a game card when the year is interpolated", async () => {
    await expectPng(
      await renderGameOgImage({
        title: "Resident Evil Requiem",
        year: 2026,
      }),
    );
  });

  it("renders a standings card with kicker and subtitle", async () => {
    await expectPng(
      await renderOgImage({
        kicker: "Standings",
        title: "2026 Game of the Year",
        subtitle: "Live rankings on The Gamies",
      }),
    );
  });
});
