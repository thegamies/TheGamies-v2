import { liveGotyYearStats, type Db } from "@thegamies/db";
import { getLiveAggregateDb } from "./contrib";

export async function setYearRevealed(
  year: number,
  revealed: boolean,
  db: Db = getLiveAggregateDb(),
): Promise<void> {
  await db
    .insert(liveGotyYearStats)
    .values({
      year,
      detailedStatsRevealed: revealed,
    })
    .onConflictDoUpdate({
      target: liveGotyYearStats.year,
      set: { detailedStatsRevealed: revealed },
    });
}
