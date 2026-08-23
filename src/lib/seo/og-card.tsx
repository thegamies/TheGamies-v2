export const OG_SIZE = { width: 1200, height: 630 } as const;

export type OgCardCover = {
  url: string;
  rank?: number;
};

export function OgCard({
  kicker = "The Gamies",
  title,
  subtitle,
  covers = [],
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  covers?: OgCardCover[];
}) {
  return (
    <div
      style={{
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0d0d0e",
        color: "#f4f0e8",
        padding: "56px 64px",
        borderBottom: "8px solid #ff5a1f",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            fontFamily: "Archivo",
            fontSize: 22,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#ff5a1f",
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontFamily: "Bebas Neue",
            fontSize: title.length > 42 ? 72 : 88,
            lineHeight: 0.95,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              fontFamily: "Archivo",
              fontSize: 28,
              color: "#c8c2b6",
              maxWidth: 900,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {covers.length > 0 ? (
        <div style={{ display: "flex", gap: 16 }}>
          {covers.slice(0, 4).map((cover) => (
            <div
              key={cover.url}
              style={{
                display: "flex",
                position: "relative",
                width: 96,
                height: 128,
                border: "1px solid #3a3936",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.url}
                alt=""
                width={96}
                height={128}
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
