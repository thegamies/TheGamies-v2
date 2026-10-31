"use client";

import { useActionState } from "react";
import { createCommunityTgaYearAction } from "@/app/communities/[slug]/the-game-awards/actions";
import { Button } from "@/components/ui/Button";
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";
import { tgaPromoTitle } from "@/lib/tga-pickem/promo";

export function CommunityOverviewCreateTga({
  slug,
  year,
}: {
  slug: string;
  year: number;
}) {
  const [state, formAction, pending] = useActionState(
    createCommunityTgaYearAction,
    null,
  );

  return (
    <section>
      <h2 className="font-display text-3xl tracking-wide text-ink">
        {TGA_PUBLIC_LABEL}
      </h2>
      <p className="mt-4 max-w-xl text-sm text-muted">
        {tgaPromoTitle(year)} is on for the site. Create it so members can make
        picks here.
      </p>
      <form action={formAction} className="mt-6">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="dest" value="ballot" />
        <Button type="submit" variant="bordered" disabled={pending}>
          {pending ? "Creating…" : `Create ${year} Pick’em`}
        </Button>
        {state?.error ? (
          <p className="mt-3 text-sm text-accent" role="alert">
            {state.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
