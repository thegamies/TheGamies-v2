export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_PAPER = "#0d0d0e";
export const OG_INK = "#f4f0e8";
export const OG_MUTED = "#aaa69e";
export const OG_LINE = "#2b2a28";
export const OG_ACCENT = "#ff5a1f";
export const OG_PANEL = "#151516";

export const GAME_OG_COVER = { width: 300, height: 400 } as const;
const LIST_COVER = { width: 156, height: 208 } as const;

export type OgCardCover = {
  url: string;
  rank?: number;
};

function clampText(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function OgBrand() {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Bebas Neue",
        fontSize: 64,
        letterSpacing: 3,
        color: OG_ACCENT,
        lineHeight: 0.9,
      }}
    >
      The Gamies
    </div>
  );
}

function CoverFrame({
  url,
  width,
  height,
  rank,
}: {
  url?: string | null;
  width: number;
  height: number;
  rank?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
        background: OG_PANEL,
        border: `1px solid ${OG_LINE}`,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          width={width}
          height={height}
          style={{ width, height, objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            width,
            height,
            alignItems: "center",
            justifyContent: "center",
            color: OG_MUTED,
            fontFamily: "Archivo",
            fontSize: 20,
          }}
        >
          No cover
        </div>
      )}
      {rank != null ? (
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 8,
            bottom: 6,
            fontFamily: "Bebas Neue",
            fontSize: 36,
            lineHeight: 0.9,
            color: OG_ACCENT,
          }}
        >
          {String(rank)}
        </div>
      ) : null}
    </div>
  );
}

export function OgCard({
  kicker,
  title,
  subtitle,
  covers = [],
  heroCover,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  covers?: OgCardCover[];
  heroCover?: string | null;
}) {
  const displayTitle = clampText(title, 72);
  const displaySubtitle = subtitle ? clampText(subtitle, 140) : undefined;
  const hero = heroCover !== undefined;
  const titleSize = displayTitle.length > 42 ? 64 : hero ? 76 : 88;

  return (
    <div
      style={{
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: OG_PAPER,
        color: OG_INK,
        padding: "48px 56px 44px",
        borderBottom: `8px solid ${OG_ACCENT}`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <OgBrand />
        {kicker ? (
          <div
            style={{
              display: "flex",
              fontFamily: "Archivo",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: OG_MUTED,
            }}
          >
            {kicker}
          </div>
        ) : null}
      </div>

      {hero ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 48,
            flex: 1,
            marginTop: 36,
          }}
        >
          <CoverFrame
            url={heroCover}
            width={GAME_OG_COVER.width}
            height={GAME_OG_COVER.height}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Bebas Neue",
                fontSize: titleSize,
                lineHeight: 0.92,
                letterSpacing: 1,
                maxWidth: 720,
              }}
            >
              {displayTitle}
            </div>
            {displaySubtitle ? (
              <div
                style={{
                  display: "flex",
                  fontFamily: "Archivo",
                  fontSize: 26,
                  color: OG_MUTED,
                }}
              >
                {displaySubtitle}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            gap: 16,
            marginTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Bebas Neue",
              fontSize: titleSize,
              lineHeight: 0.92,
              letterSpacing: 1,
              maxWidth: 1040,
            }}
          >
            {displayTitle}
          </div>
          {displaySubtitle ? (
            <div
              style={{
                display: "flex",
                fontFamily: "Archivo",
                fontSize: 28,
                color: OG_MUTED,
                maxWidth: 920,
              }}
            >
              {displaySubtitle}
            </div>
          ) : null}
        </div>
      )}

      {!hero && covers.length > 0 ? (
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          {covers.slice(0, 4).map((cover) => (
            <CoverFrame
              key={`${cover.rank ?? ""}-${cover.url}`}
              url={cover.url}
              width={LIST_COVER.width}
              height={LIST_COVER.height}
              rank={cover.rank}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
