import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, type OgCardCover } from "./og-card";

export async function renderOgImage(input: {
  kicker?: string;
  title: string;
  subtitle?: string;
  covers?: OgCardCover[];
}) {
  return new ImageResponse(
    (
      <OgCard
        kicker={input.kicker}
        title={input.title}
        subtitle={input.subtitle}
        covers={input.covers}
      />
    ),
    { ...OG_SIZE },
  );
}
