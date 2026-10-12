import { sql } from "drizzle-orm";
import { createDb, type Db } from "@thegamies/db";
import { fingerprintNeonSql } from "@thegamies/db/request-cost";

export type PgStatSnapshotRow = {
  queryid: string;
  query: string;
  calls: number;
  totalExecMs: number;
};

export type PgStatDeltaRow = {
  queryid: string;
  query: string;
  fingerprint: string;
  calls: number;
  totalMs: number;
  meanMs: number;
};

export type PgExecAttach = {
  calls: number;
  totalMs: number;
  meanMs: number;
};

const NOISE = /^(reset\b|set\b|begin\b|commit\b|deallocate\b)/i;

export function isPgStatNoiseQuery(query: string): boolean {
  const collapsed = query.replace(/\s+/g, " ").trim();
  if (!collapsed) return true;
  if (NOISE.test(collapsed)) return true;
  const lower = collapsed.toLowerCase();
  return lower.includes("pg_stat_statements") || lower.includes("pg_catalog");
}

export function sqlFingerprintForPgQuery(query: string): string {
  return fingerprintNeonSql(query);
}

/** Best-effort: trip SQL is already a Worker fingerprint; pg rows are fingerprinted the same way. */
export function tripSqlMatchesPgFingerprint(
  tripSql: string,
  pgFingerprint: string,
): boolean {
  if (!tripSql || !pgFingerprint) return false;
  if (tripSql === pgFingerprint) return true;
  for (const part of tripSql.split(" | ")) {
    if (part === pgFingerprint) return true;
  }
  return false;
}

export function diffPgStatSnapshots(
  before: PgStatSnapshotRow[],
  after: PgStatSnapshotRow[],
): PgStatDeltaRow[] {
  const prev = new Map(before.map((row) => [row.queryid, row]));
  const rows: PgStatDeltaRow[] = [];
  for (const row of after) {
    if (isPgStatNoiseQuery(row.query)) continue;
    const earlier = prev.get(row.queryid);
    const calls = row.calls - (earlier?.calls ?? 0);
    const totalMs = row.totalExecMs - (earlier?.totalExecMs ?? 0);
    if (calls <= 0 || totalMs < 0) continue;
    rows.push({
      queryid: row.queryid,
      query: row.query,
      fingerprint: sqlFingerprintForPgQuery(row.query),
      calls,
      totalMs,
      meanMs: totalMs / calls,
    });
  }
  return rows.sort((a, b) => b.totalMs - a.totalMs || b.calls - a.calls);
}

export function attachPgExecToTripSql(
  tripSql: string,
  pgRows: PgStatDeltaRow[],
): PgExecAttach | null {
  let calls = 0;
  let totalMs = 0;
  const used = new Set<string>();
  for (const row of pgRows) {
    if (used.has(row.queryid)) continue;
    if (!tripSqlMatchesPgFingerprint(tripSql, row.fingerprint)) continue;
    used.add(row.queryid);
    calls += row.calls;
    totalMs += row.totalMs;
  }
  if (calls <= 0) return null;
  return { calls, totalMs, meanMs: totalMs / calls };
}

export function unmatchedPgExecRows(
  tripSqls: string[],
  pgRows: PgStatDeltaRow[],
): PgStatDeltaRow[] {
  return pgRows.filter(
    (row) =>
      !tripSqls.some((sqlText) =>
        tripSqlMatchesPgFingerprint(sqlText, row.fingerprint),
      ),
  );
}

type SnapshotSqlRow = {
  queryid: string;
  query: string;
  calls: string | number;
  total_exec_time: string | number;
};

export async function snapshotPgStatStatements(
  db: Db,
): Promise<PgStatSnapshotRow[] | { error: string }> {
  try {
    const result = await db.execute(sql`
      SELECT
        queryid::text AS queryid,
        query,
        calls::bigint AS calls,
        total_exec_time::float8 AS total_exec_time
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
    `);
    const rows = (result.rows ?? []) as SnapshotSqlRow[];
    return rows.map((row) => ({
      queryid: String(row.queryid),
      query: String(row.query ?? ""),
      calls: Number(row.calls) || 0,
      totalExecMs: Number(row.total_exec_time) || 0,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/pg_stat_statements/i.test(message)) {
      return {
        error:
          "pg_stat_statements is not installed on this database (develop only).",
      };
    }
    return { error: "Could not read pg_stat_statements for this run." };
  }
}

export async function snapshotPgStatStatementsAt(
  databaseUrl: string,
): Promise<PgStatSnapshotRow[] | { error: string }> {
  return snapshotPgStatStatements(createDb(databaseUrl));
}
