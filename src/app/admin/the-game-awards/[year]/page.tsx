import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getTgaYear, listTgaBallot, listTgaYears } from "@/lib/tga-pickem/service";
import { tgaStatusLabel } from "@/lib/tga-pickem/status";
import { AdminTgaGate } from "../AdminTgaGate";
import { AdminTgaYearClient } from "./AdminTgaYearClient";

type Params = Promise<{ year: string }>;

export const metadata: Metadata = {
  title: "Video Game Awards Pick’em year",
  robots: { index: false, follow: false },
};

function toLocalInput(value: Date | null): string {
  if (!value) return "";
  const iso = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  return iso;
}

export default async function AdminTgaYearPage({ params }: { params: Params }) {
  const { year: raw } = await params;
  const year = Number(raw);
  if (!Number.isInteger(year)) notFound();
  const authorized = await isAdminAuthorized();
  const slate = authorized ? await getTgaYear(year).catch(() => null) : null;
  if (authorized && !slate) notFound();
  const ballot = authorized && slate ? await listTgaBallot(year) : [];
  const years = authorized ? await listTgaYears().catch(() => []) : [];

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin/the-game-awards" className="hover:text-ink">
          Video Game Awards Pick’em
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        {year}
      </h1>
      <div className="mt-10">
        <AdminTgaGate authorized={authorized}>
          {slate ? (
            <AdminTgaYearClient
              year={year}
              statusLabel={tgaStatusLabel(slate.status)}
              enabled={slate.enabled}
              promoted={slate.promoted}
              complete={slate.complete}
              completeReason={slate.completeReason}
              opensAt={toLocalInput(slate.opensAt)}
              showStartsAt={toLocalInput(slate.showStartsAt)}
              otherYears={years
                .map((row) => row.year)
                .filter((value) => value !== year)}
              categories={ballot}
            />
          ) : null}
        </AdminTgaGate>
      </div>
    </main>
  );
}
