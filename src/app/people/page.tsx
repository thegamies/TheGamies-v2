import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PeopleSearchForm } from "@/components/people/PeopleSearchForm";
import { PeopleSearchResults } from "@/components/people/PeopleSearchResults";
import { followingHref } from "@/lib/activity/paths";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { searchPeople } from "@/lib/people/search";
import { noIndexRobots, publicPageMetadata } from "@/lib/seo/site";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  if ((first(sp.q) ?? "").trim()) {
    return { title: "People", robots: noIndexRobots };
  }
  return publicPageMetadata({
    title: "People",
    description: "Find public profiles on The Gamies.",
    path: "/people",
  });
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = first(sp.q) ?? "";
  const user = await getRequestSessionUser();
  if (user?.id) {
    const profile = await getRequestProfileByAuthUserId(user.id).catch(
      () => null,
    );
    if (!profile) {
      redirect(
        `/auth/complete-profile?next=${encodeURIComponent("/following?view=discover")}`,
      );
    }
    redirect(followingHref({ view: "discover", q }));
  }

  const people = await searchPeople(q).catch(() => []);

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">People</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        People
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Search public profiles by name or username.
      </p>
      <PeopleSearchForm action="/people" q={q} />
      <PeopleSearchResults people={people} q={q} />
    </main>
  );
}
