/** Bundled 2025 TGA portraits for `other` nominees (Performance, Adaptation, Creators, Esports). */
export const TGA_2025_OTHER_IMAGE_DIR = "tga-seed/2025";

export const TGA_2025_OTHER_IMAGES: Record<string, string> = {
  "Jennifer English — Clair Obscur: Expedition 33": "tga25_jenniferenglish.png",
  "Ben Starr — Clair Obscur: Expedition 33": "tga25_benstarr.png",
  "Charlie Cox — Clair Obscur: Expedition 33": "tga25_charliecox.png",
  "Erika Ishii — Ghost of Yotei": "erika_ishii.jpg",
  "Konatsu Kato — Silent Hill f": "konatsu_kato.jpg",
  "Troy Baker — Indiana Jones and the Great Circle": "troy_baker.jpg",
  "The Last of Us: Season 2": "tlou_season2.jpg",
  "A Minecraft Movie": "a_minecraft_movie.jpg",
  "Devil May Cry": "devil_may_cry.jpg",
  "Splinter Cell: Deathwatch": "splinter_cell.jpg",
  "Until Dawn": "until_dawn.jpg",
  "MoistCr1TiKaL": "moistcritical.jpg",
  "Caedrel": "caedrel.jpg",
  "Kai Cenat": "kaicenat.jpg",
  "Sakura Miko": "sakura_miko.jpg",
  "The Burnt Peanut": "the_burnt_peanut.jpg",
  "Chovy — League of Legends": "chovy.jpg",
  "brawk — VALORANT": "brawk.jpg",
  "fOrsakeN — VALORANT": "forsaken.jpg",
  "Kakeru — Street Fighter": "kakeru.jpg",
  "MenaRD — Street Fighter": "menard.jpg",
  "ZywOo — Counter-Strike 2": "zywoo.jpg",
  "Team Vitality — Counter-Strike 2": "teamvitalty.jpg",
  "Gen.G — League of Legends": "gen-g.jpg",
  "NRG — VALORANT": "nrg.jpg",
  "Team Falcons — Dota 2": "falcons.jpg",
  "Team Liquid PH — Mobile Legends: Bang Bang": "team_liquid_ph.jpg",
};

export function tga2025OtherImageFile(displayName: string): string | null {
  return TGA_2025_OTHER_IMAGES[displayName] ?? null;
}
