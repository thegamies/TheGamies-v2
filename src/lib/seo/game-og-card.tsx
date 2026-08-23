export const GAME_OG_COVER = { width: 320, height: 427 } as const;

export function GameOgCard({
  title,
  year,
  coverUrl,
}: {
  title: string;
  year?: number | null;
  coverUrl?: string | null;
}) {
  const displayTitle = title.length > 64 ? `${title.slice(0, 63).trimEnd()}…` : title;
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        background: "linear-gradient(135deg, #0d0d0e 0%, #161412 55%, #1a120e 100%)",
        padding: 56,
        gap: 56,
        fontFamily: "Outfit",
      }}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          width={GAME_OG_COVER.width}
          height={GAME_OG_COVER.height}
          style={{
            width: GAME_OG_COVER.width,
            height: GAME_OG_COVER.height,
            objectFit: "cover",
            borderRadius: 20,
          }}
        />
      ) : (
        <div
          style={{
            width: GAME_OG_COVER.width,
            height: GAME_OG_COVER.height,
            borderRadius: 20,
            background: "#161412",
            border: "1px solid #3a3936",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c8c2b6",
            fontSize: 28,
          }}
        >
          No cover
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          height: "100%",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#ff5a1f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0d0d0e",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            G
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                color: "#f4f0e8",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              The Gamies
            </div>
            <div style={{ color: "#ff5a1f", fontSize: 18, fontWeight: 700 }}>
              Community Game of the Year
            </div>
          </div>
        </div>
        <div
          style={{
            color: "#f4f0e8",
            fontSize: displayTitle.length > 40 ? 48 : 56,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: 680,
          }}
        >
          {displayTitle}
        </div>
        {year ? (
          <div style={{ color: "#c8c2b6", fontSize: 26, fontWeight: 700 }}>
            Released {year}
          </div>
        ) : null}
      </div>
    </div>
  );
}
