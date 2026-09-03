import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "tga-seed", "2025");

const SOURCES = [
  ["https://cdn.thegameawards.com/1/2025/11/tga25_jenniferenglish.png", "tga25_jenniferenglish.png"],
  ["https://cdn.thegameawards.com/1/2025/11/tga25_benstarr.png", "tga25_benstarr.png"],
  ["https://cdn.thegameawards.com/1/2025/11/tga25_charliecox.png", "tga25_charliecox.png"],
  ["https://cdn.thegameawards.com/1/2025/11/erika_ishii.jpg", "erika_ishii.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/konatsu_kato.jpg", "konatsu_kato.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/troy_baker-1.jpg", "troy_baker.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/a_minecraft_movie.jpg", "a_minecraft_movie.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/devil_may_cry.jpg", "devil_may_cry.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/splinter_cell.jpg", "splinter_cell.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/tlou_season2.jpg", "tlou_season2.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/until_dawn.jpg", "until_dawn.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/caedrel.jpg", "caedrel.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/kaicenat.jpg", "kaicenat.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/moistcritical.jpg", "moistcritical.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/sakura_miko.jpg", "sakura_miko.jpg"],
  [
    "https://cdn.thegameawards.com/1/2025/11/content-creator-of-the-year-the-burnt-peanut.jpg",
    "the_burnt_peanut.jpg",
  ],
  ["https://cdn.thegameawards.com/1/2025/11/brawk.jpg", "brawk.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/chovy.jpg", "chovy.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/forsaken.jpg", "forsaken.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/kakeru.jpg", "kakeru.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/menard.jpg", "menard.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/zywoo.jpg", "zywoo.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/gen-g.jpg", "gen-g.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/nrg.jpg", "nrg.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/falcons.jpg", "falcons.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/team_liquid_ph.jpg", "team_liquid_ph.jpg"],
  ["https://cdn.thegameawards.com/1/2025/11/teamvitalty.jpg", "teamvitalty.jpg"],
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const [url, filename] of SOURCES) {
    const res = await fetch(url, {
      headers: { "User-Agent": "thegamies-v2 tga-seed" },
    });
    if (!res.ok) {
      throw new Error(`Could not download ${url} (${res.status})`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    await writeFile(join(OUT_DIR, filename), bytes);
    console.log(`wrote ${filename} (${bytes.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
