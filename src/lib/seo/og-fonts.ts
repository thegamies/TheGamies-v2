export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

const FONT_FILES: { name: string; weight: 400 | 700; url: string }[] = [
  {
    name: "Bebas Neue",
    weight: 400,
    url: "https://cdn.jsdelivr.net/fontsource/fonts/bebas-neue@5.2.5/latin-400-normal.ttf",
  },
  {
    name: "Archivo",
    weight: 400,
    url: "https://cdn.jsdelivr.net/fontsource/fonts/archivo@5.2.5/latin-400-normal.ttf",
  },
  {
    name: "Archivo",
    weight: 700,
    url: "https://cdn.jsdelivr.net/fontsource/fonts/archivo@5.2.5/latin-700-normal.ttf",
  },
];

let cached: OgFont[] | null = null;

export async function loadOgFonts(): Promise<OgFont[]> {
  if (cached) return cached;
  const loaded = await Promise.all(
    FONT_FILES.map(async (font) => {
      const res = await fetch(font.url);
      if (!res.ok) {
        throw new Error(`Could not load OG font ${font.name} (${res.status}).`);
      }
      return {
        name: font.name,
        data: await res.arrayBuffer(),
        weight: font.weight,
        style: "normal" as const,
      };
    }),
  );
  cached = loaded;
  return cached;
}
