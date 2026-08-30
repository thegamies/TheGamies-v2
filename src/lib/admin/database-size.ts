import { sql } from "drizzle-orm";
import { createDb, type Db } from "@thegamies/db";

export type DatabaseIndexSize = {
  name: string;
  bytes: number;
};

export type DatabaseTableSize = {
  schema: string;
  name: string;
  estRows: number;
  heapBytes: number;
  indexBytes: number;
  toastBytes: number;
  totalBytes: number;
  indexes: DatabaseIndexSize[];
};

export type DatabaseIndexRow = {
  schema: string;
  table: string;
  name: string;
  bytes: number;
};

export type DatabaseTableRow = Omit<DatabaseTableSize, "indexes">;

function getDb(db?: Db): Db {
  return db ?? createDb();
}

export function formatBytes(bytes: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(bytes) ? bytes : 0));
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function tableDisplayName(schema: string, name: string): string {
  return schema === "public" ? name : `${schema}.${name}`;
}

export function attachIndexes(
  tables: DatabaseTableRow[],
  indexes: DatabaseIndexRow[],
): DatabaseTableSize[] {
  const byTable = new Map<string, DatabaseIndexSize[]>();
  for (const index of indexes) {
    const key = `${index.schema}.${index.table}`;
    const list = byTable.get(key) ?? [];
    list.push({ name: index.name, bytes: index.bytes });
    byTable.set(key, list);
  }
  for (const list of byTable.values()) {
    list.sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
  }
  return tables.map((table) => ({
    ...table,
    indexes: byTable.get(`${table.schema}.${table.name}`) ?? [],
  }));
}

export function sumTableBytes(
  tables: Array<{ totalBytes: number }>,
): number {
  return tables.reduce((sum, table) => sum + table.totalBytes, 0);
}

function asInt(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export async function listDatabaseTableSizes(
  db: Db = getDb(),
): Promise<DatabaseTableSize[]> {
  const tablesResult = await db.execute(sql`
    select
      n.nspname as schema_name,
      c.relname as table_name,
      coalesce(c.reltuples, 0)::bigint as est_rows,
      pg_relation_size(c.oid) as heap_bytes,
      pg_indexes_size(c.oid) as index_bytes,
      greatest(
        pg_total_relation_size(c.oid)
          - pg_relation_size(c.oid)
          - pg_indexes_size(c.oid),
        0
      ) as toast_bytes,
      pg_total_relation_size(c.oid) as total_bytes
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
    order by pg_total_relation_size(c.oid) desc, n.nspname asc, c.relname asc
  `);

  const indexesResult = await db.execute(sql`
    select
      n.nspname as schema_name,
      t.relname as table_name,
      i.relname as index_name,
      pg_relation_size(i.oid) as bytes
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class t on t.oid = x.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where t.relkind = 'r'
      and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
    order by pg_relation_size(i.oid) desc, i.relname asc
  `);

  const tables: DatabaseTableRow[] = tablesResult.rows.map((row) => ({
    schema: String(row.schema_name ?? ""),
    name: String(row.table_name ?? ""),
    estRows: asInt(row.est_rows),
    heapBytes: asInt(row.heap_bytes),
    indexBytes: asInt(row.index_bytes),
    toastBytes: asInt(row.toast_bytes),
    totalBytes: asInt(row.total_bytes),
  }));

  const indexes: DatabaseIndexRow[] = indexesResult.rows.map((row) => ({
    schema: String(row.schema_name ?? ""),
    table: String(row.table_name ?? ""),
    name: String(row.index_name ?? ""),
    bytes: asInt(row.bytes),
  }));

  return attachIndexes(tables, indexes);
}
