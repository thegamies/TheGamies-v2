export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 700;
  style: "normal";
};

const OUTFIT_URL =
  "https://cdn.jsdelivr.net/fontsource/fonts/outfit@5.0.8/latin-700-normal.ttf";

let cached: OgFont[] | null = null;

export async function loadOgFonts(): Promise<OgFont[]> {
  if (cached) return cached;
  const res = await fetch(OUTFIT_URL);
  if (!res.ok) {
    throw new Error(`Could not load OG font (${res.status}).`);
  }
  cached = [
    {
      name: "Outfit",
      data: await res.arrayBuffer(),
      weight: 700,
      style: "normal",
    },
  ];
  return cached;
}
