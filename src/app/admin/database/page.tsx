import type { Metadata } from "next";
import Link from "next/link";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import {
  formatBytes,
  listDatabaseTableSizes,
  sumTableBytes,
  tableDisplayName,
  type DatabaseTableSize,
} from "@/lib/admin/database-size";

export const metadata: Metadata = {
  title: "Database size",
  robots: { index: false, follow: false },
};

function SizeCell({ bytes }: { bytes: number }) {
  return (
    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums text-ink">
      {formatBytes(bytes)}
    </td>
  );
}

function TableSizes({ tables }: { tables: DatabaseTableSize[] }) {
  return (
    <div className="mt-10 overflow-x-auto">
      <table className="min-w-full border-y border-line text-left">
        <thead>
          <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
            <th className="px-3 py-3 font-extrabold">Table</th>
            <th className="px-3 py-3 text-right font-extrabold">Est. rows</th>
            <th className="px-3 py-3 text-right font-extrabold">Table</th>
            <th className="px-3 py-3 text-right font-extrabold">Indexes</th>
            <th className="px-3 py-3 text-right font-extrabold">Toast</th>
            <th className="px-3 py-3 text-right font-extrabold">Total</th>
          </tr>
        </thead>
        <tbody>
          {tables.map((table) => (
            <TableSizeBlock key={`${table.schema}.${table.name}`} table={table} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableSizeBlock({ table }: { table: DatabaseTableSize }) {
  return (
    <>
      <tr className="border-t border-line">
        <th
          scope="row"
          className="px-3 py-2 font-sans text-sm font-semibold text-ink"
        >
          {tableDisplayName(table.schema, table.name)}
        </th>
        <td className="px-3 py-2 text-right font-mono text-sm tabular-nums text-muted">
          {table.estRows.toLocaleString("en-US")}
        </td>
        <SizeCell bytes={table.heapBytes} />
        <SizeCell bytes={table.indexBytes} />
        <SizeCell bytes={table.toastBytes} />
        <SizeCell bytes={table.totalBytes} />
      </tr>
      {table.indexes.map((index) => (
        <tr key={index.name} className="bg-panel/40">
          <td className="px-3 py-1.5 pl-8 font-mono text-xs text-muted">
            {index.name}
          </td>
          <td className="px-3 py-1.5 text-right text-xs text-muted">index</td>
          <td className="px-3 py-1.5" />
          <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums text-muted">
            {formatBytes(index.bytes)}
          </td>
          <td className="px-3 py-1.5" />
          <td className="px-3 py-1.5" />
        </tr>
      ))}
    </>
  );
}

export default async function AdminDatabasePage() {
  await requireSiteAdminPage();
  let tables: DatabaseTableSize[] = [];
  let loadError = false;
  try {
    tables = await listDatabaseTableSizes();
  } catch {
    loadError = true;
  }
  const totalBytes = sumTableBytes(tables);

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Ops
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Database size
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        How much space each table uses, with indexes listed under the table.
        Row counts are planner estimates.
      </p>
      {loadError ? (
        <p className="mt-10 text-sm text-muted">Couldn’t read table sizes.</p>
      ) : tables.length === 0 ? (
        <p className="mt-10 text-sm text-muted">No tables to measure.</p>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted">
            {tables.length} {tables.length === 1 ? "table" : "tables"} ·{" "}
            {formatBytes(totalBytes)} total
          </p>
          <TableSizes tables={tables} />
        </>
      )}
    </main>
  );
}
