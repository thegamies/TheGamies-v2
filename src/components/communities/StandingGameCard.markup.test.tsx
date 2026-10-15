import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompactTieStack } from "@/components/communities/CompactTieStack";
import {
  EmptyStandingCard,
  StandingGameCard,
  standingCmpCellAwardClass,
} from "@/components/communities/StandingGameCard";

const COVER =
  "https://images.igdb.com/igdb/image/upload/t_cover_big/co9ewj.jpg";

const LONG_UTILITY = [
  "position:absolute",
  "box-border",
  "w-[var(--strip-col)]",
  "pointer-events-none",
  "object-cover",
  "font-display",
  "tracking-wide",
  "rounded-[var(--radius-artwork)]",
  "data-nimg",
  "aspect-[3/4]",
  "w-[103px]",
  "lg:w-[206px]",
  "min-height:",
  "font-size:",
];

function expectShortMarkup(html: string) {
  for (const token of LONG_UTILITY) {
    expect(html, token).not.toContain(token);
  }
}

describe("standing card markup", () => {
  it("renders a ranked card without the repeated utility list", () => {
    const html = renderToStaticMarkup(
      <StandingGameCard
        place={1}
        placeSize="lg"
        slug="trench-tales"
        title="Trench Tales"
        coverUrl={COVER}
        points={4}
        scoreUnit="votes"
        pinCover
      />,
    );

    expectShortMarkup(html);
    expect(html).toContain('href="/games/trench-tales"');
    expect(html).toContain("Trench Tales");
    expect(html).toContain(COVER);
    expect(html).toContain("standing-card");
    expect(html).toContain("standing-cover");
    expect(html).toContain("standing-title--20");
    expect(html).toContain("standing-place--top");
    const img = html.match(/<img\b[^>]*>/)?.[0] ?? "";
    expect(img).not.toContain("style=");
    expect(img).toContain(`src="${COVER}"`);
  });

  it("renders a comparison cell without the repeated utility list", () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <tr>
            <td className={standingCmpCellAwardClass}>
              <StandingGameCard
                slug="trench-tales"
                title="Trench Tales"
                coverUrl={COVER}
                size="sm"
              />
            </td>
          </tr>
        </tbody>
      </table>,
    );

    expectShortMarkup(html);
    expect(html).toContain("standing-cmp-cell standing-cmp-cell--award");
    expect(html).toContain("standing-card standing-card--sm");
    expect(html).toContain("standing-title--18");
    expect(html).toContain("standing-title-slot--18");
    expect(html).toContain('href="/games/trench-tales"');
    expect(html).toContain(COVER);
    const img = html.match(/<img\b[^>]*>/)?.[0] ?? "";
    expect(img).not.toContain("style=");
    expect(img).toContain(`src="${COVER}"`);
  });

  it("renders an empty cell and a tie cover with the same short classes", () => {
    const empty = renderToStaticMarkup(<EmptyStandingCard />);
    expectShortMarkup(empty);
    expect(empty).toContain("standing-w-sm");
    expect(empty).toContain("standing-cover");
    expect(empty).toContain("standing-empty-label");

    const tie = renderToStaticMarkup(
      <CompactTieStack
        games={[
          {
            gameId: "1",
            slug: "trench-tales",
            title: "Trench Tales",
            coverUrl: COVER,
          },
          {
            gameId: "2",
            slug: "hades",
            title: "Hades",
            coverUrl: COVER,
          },
        ]}
      />,
    );
    const cover = tie.slice(0, tie.indexOf("Tied"));
    expectShortMarkup(cover);
    expect(tie).toContain("standing-tie");
    expect(tie).toContain("standing-cover standing-cover--fill");
    expect(tie).toContain("standing-title--18");
  });
});
