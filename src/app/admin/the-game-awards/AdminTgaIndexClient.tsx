"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { createTgaYearAction } from "./actions";

type YearRow = {
  year: number;
  status: string;
  enabled: boolean;
  promoted: boolean;
  complete: boolean;
};

export function AdminTgaIndexClient({ years }: { years: YearRow[] }) {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-10">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            setMessage(null);
            const result = await createTgaYearAction(year);
            if ("error" in result && result.error) {
              setMessage(result.error);
              return;
            }
            if ("year" in result) {
              router.push(`/admin/the-game-awards/${result.year}`);
            }
          });
        }}
      >
        <label className="block text-sm">
          <span className="text-muted">New year</span>
          <input
            type="number"
            className={`${fieldInputClass} mt-1 w-32`}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create year"}
        </Button>
      </form>
      {message ? (
        <p className="text-sm text-accent" role="alert">
          {message}
        </p>
      ) : null}
      <ul className="max-w-xl divide-y divide-line border-y border-line">
        {years.length === 0 ? (
          <li className="py-5 text-sm text-muted">No years yet.</li>
        ) : (
          years.map((row) => (
            <li key={row.year} className="flex flex-wrap items-center justify-between gap-3 py-5">
              <div>
                <Link
                  href={`/admin/the-game-awards/${row.year}`}
                  className="font-display text-2xl tracking-wide text-ink hover:text-accent"
                >
                  {row.year}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {row.status}
                  {row.promoted ? " · Promoted" : ""}
                  {row.complete ? "" : " · Incomplete"}
                </p>
              </div>
              <Link
                href={`/admin/the-game-awards/${row.year}/show`}
                className="text-sm font-semibold text-accent hover:opacity-80"
              >
                Show room
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
