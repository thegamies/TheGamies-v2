"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  hasEditionResultsEntrancePreference,
  markEditionResultsEntranceSeen,
} from "@/lib/communities/edition-results-entrance";
import { editionResultsHref } from "@/lib/communities/edition-results-href";
import type { EditionResultsPublicMode } from "@/lib/communities/edition-results-scoring";

/**
 * Spoiler-safe landing after results publish. No GOTY art or titles —
 * choice between cinematic Reveal and full Results.
 */
export function EditionResultsEntrance({
  slug,
  year,
  communityName,
  mode = "community",
}: {
  slug: string;
  year: number;
  communityName: string;
  mode?: EditionResultsPublicMode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const revealHref = editionResultsHref(slug, year, {
    mode,
    view: "reveal",
  });
  const resultsHref = editionResultsHref(slug, year, {
    mode,
    view: "overview",
  });

  useEffect(() => {
    if (hasEditionResultsEntrancePreference(slug, year)) {
      router.replace(resultsHref);
      return;
    }
    setReady(true);
  }, [slug, year, resultsHref, router]);

  if (!ready) {
    return (
      <div className="mt-10 min-h-[12rem]" aria-busy="true" aria-label="Loading" />
    );
  }

  function skipToResults() {
    markEditionResultsEntranceSeen(slug, year);
  }

  return (
    <div className="mt-10 max-w-xl">
      <h3 className="font-display text-[clamp(2.25rem,6vw,3.25rem)] leading-[0.95] tracking-wide text-ink">
        The {year} {communityName} Results Are Here
      </h3>
      <p className="mt-4 font-serif text-lg leading-relaxed text-muted">
        Experience the cinematic reveal, or skip straight to the full results.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href={revealHref}>
          <Button type="button">Start the Reveal</Button>
        </Link>
        <Link href={resultsHref} onClick={skipToResults}>
          <Button type="button" variant="bordered">
            View Full Results
          </Button>
        </Link>
      </div>
    </div>
  );
}
