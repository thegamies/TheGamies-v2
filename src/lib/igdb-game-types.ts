/** IGDB `game_types` ids (`https://api-docs.igdb.com/#game-type`). */
export const IGDB_GAME_TYPE = {
  mainGame: 0,
  dlcAddon: 1,
  expansion: 2,
  bundle: 3,
  standaloneExpansion: 4,
  mod: 5,
  episode: 6,
  season: 7,
  remake: 8,
  remaster: 9,
  expandedGame: 10,
  port: 11,
  fork: 12,
  pack: 13,
  update: 14,
} as const;

/**
 * GOTY ranking (personal list + edition GOTY ballot): full games and
 * expansions. Packs, DLC/addons, bundles, mods, episodes, seasons, ports,
 * forks, and updates stay off the ranking (award categories can still use them).
 * Null catalog type is allowed so unsynced main-game rows are not blocked.
 */
export const GOTY_ELIGIBLE_GAME_TYPE_IGDB_IDS: readonly number[] = [
  IGDB_GAME_TYPE.mainGame,
  IGDB_GAME_TYPE.expansion,
  IGDB_GAME_TYPE.standaloneExpansion,
  IGDB_GAME_TYPE.remake,
  IGDB_GAME_TYPE.remaster,
  IGDB_GAME_TYPE.expandedGame,
];

export function isGotyEligibleGameType(
  gameTypeIgdbId: number | null | undefined,
): boolean {
  if (gameTypeIgdbId == null) return true;
  return GOTY_ELIGIBLE_GAME_TYPE_IGDB_IDS.includes(gameTypeIgdbId);
}
