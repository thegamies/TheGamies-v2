import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, type OgCardCover } from "./og-card";
import { loadOgFonts } from "./og-fonts";

async function imageOptions() {
  try {
    return { ...OG_SIZE, fonts: await loadOgFonts() };
  } catch {
    return { ...OG_SIZE };
  }
}

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
    await imageOptions(),
  );
}

export async function renderGameOgImage(input: {
  title: string;
  year?: number | null;
  coverUrl?: string | null;
}) {
  return new ImageResponse(
    (
      <OgCard
        kicker="Game"
        title={input.title}
        subtitle={input.year != null ? `Released ${input.year}` : undefined}
        heroCover={input.coverUrl ?? null}
      />
    ),
    await imageOptions(),
  );
}
