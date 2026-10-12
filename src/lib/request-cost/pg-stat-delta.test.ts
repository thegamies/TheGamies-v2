import { describe, expect, it } from "vitest";
import { fingerprintNeonSql } from "@thegamies/db/request-cost";
import {
  attachPgExecToTripSql,
  diffPgStatSnapshots,
  isPgStatNoiseQuery,
  tripSqlMatchesPgFingerprint,
  unmatchedPgExecRows,
} from "./pg-stat-delta";

describe("isPgStatNoiseQuery", () => {
  it("drops session chatter and the snapshot query", () => {
    expect(isPgStatNoiseQuery("RESET ALL")).toBe(true);
    expect(isPgStatNoiseQuery("SET SESSION AUTHORIZATION DEFAULT")).toBe(true);
    expect(
      isPgStatNoiseQuery("SELECT calls FROM pg_stat_statements WHERE dbid = $1"),
    ).toBe(true);
    expect(
      isPgStatNoiseQuery('select count(*)::int from "games" where "games"."is_adult" = $1'),
    ).toBe(false);
  });
});

describe("tripSqlMatchesPgFingerprint", () => {
  it("matches the Worker fingerprint of the same SQL", () => {
    const query =
      'select count(*)::int from "games" where ("games"."igdb_removed_at" is null and "games"."is_adult" = $1)';
    const fp = fingerprintNeonSql(query);
    expect(tripSqlMatchesPgFingerprint(fp, fp)).toBe(true);
    expect(tripSqlMatchesPgFingerprint(`${fp} | other`, fp)).toBe(true);
    expect(tripSqlMatchesPgFingerprint("select 1", fp)).toBe(false);
  });
});

describe("diffPgStatSnapshots", () => {
  it("subtracts calls and exec ms per queryid", () => {
    const query = 'select count(*)::int from "games"';
    const delta = diffPgStatSnapshots(
      [
        {
          queryid: "1",
          query,
          calls: 10,
          totalExecMs: 1000,
        },
      ],
      [
        {
          queryid: "1",
          query,
          calls: 343,
          totalExecMs: 1000 + 35_000,
        },
        {
          queryid: "2",
          query: "RESET ALL",
          calls: 100,
          totalExecMs: 50,
        },
      ],
    );
    expect(delta).toHaveLength(1);
    expect(delta[0]!.calls).toBe(333);
    expect(delta[0]!.totalMs).toBe(35_000);
    expect(delta[0]!.meanMs).toBeCloseTo(35_000 / 333);
  });
});

describe("attachPgExecToTripSql", () => {
  it("adds exec onto a matching trip and leaves unmatched rows", () => {
    const query = 'select count(*)::int from "games" where is_adult = $1';
    const rows = diffPgStatSnapshots(
      [],
      [{ queryid: "1", query, calls: 10, totalExecMs: 200 }],
    );
    const tripSql = fingerprintNeonSql(query);
    expect(attachPgExecToTripSql(tripSql, rows)).toEqual({
      calls: 10,
      totalMs: 200,
      meanMs: 20,
    });
    expect(unmatchedPgExecRows([tripSql], rows)).toEqual([]);
    expect(unmatchedPgExecRows(["select 1"], rows)).toEqual(rows);
  });
});
