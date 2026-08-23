import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedListView } from "@/components/lists/SharedListView";
import { getAuthOrNull } from "@/lib/auth/server";
import { readListEditCookie } from "@/lib/lists/cookies";
import { canEditList } from "@/lib/lists/ownership";
import {
  getShareListByUsernameSlug,
  getShareListCategoryPicks,
  getShareListItems,
} from "@/lib/lists/service";
import { listSharePath, parseListShareView } from "@/lib/lists/urls";
import { getProfileByAuthUserId, getProfileByUsername } from "@/lib/profile/service";
import { ogImagePath } from "@/lib/seo/og-path";
import { shouldIndexProfile } from "@/lib/seo/sitemap-plan";
import { noIndexRobots, publicPageMetadata } from "@/lib/seo/site";

type Params = Promise<{ username: string; listSlug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { username, listSlug } = await params;
  const [profile, data] = await Promise.all([
    getProfileByUsername(username).catch(() => null),
    getShareListByUsernameSlug(username, listSlug, {
      includeItems: false,
    }).catch(() => null),
  ]);
  if (!data) return { title: "List", robots: noIndexRobots };
  const path = listSharePath({
    publicId: data.list.publicId,
    slug: data.list.slug,
    username: data.owner?.username,
  });
  const index = Boolean(profile && shouldIndexProfile(profile));
  return publicPageMetadata({
    title: data.list.title,
    description: data.list.year
      ? `${data.list.year} list on The Gamies`
      : `${data.list.title} on The Gamies`,
    path,
    index,
    image:
      data.owner?.username && data.list.slug
        ? ogImagePath({
            kind: "list",
            username: data.owner.username,
            slug: data.list.slug,
          })
        : undefined,
  });
}

export default async function OwnedListBySlugPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { username, listSlug } = await params;
  const sp = await searchParams;
  const error = first(sp.error);
  const saved = first(sp.saved) === "1";

  const data = await getShareListByUsernameSlug(username, listSlug, {
    includeItems: false,
  }).catch(() => null);
  if (!data) notFound();

  const view =
    data.list.listType === "goty"
      ? parseListShareView(first(sp.view))
      : "goty";
  if (view !== "categories") {
    data.items = await getShareListItems(data.list.id).catch(() => []);
  }
  const categoryPicks =
    view === "categories"
      ? await getShareListCategoryPicks(data.list.id).catch(() => [])
      : [];

  const cookie = await readListEditCookie();
  let profileId: string | null = null;
  let isSignedIn = false;
  const auth = getAuthOrNull();
  if (auth) {
    try {
      const { data: session } = await auth.getSession();
      if (session?.user?.id) {
        isSignedIn = true;
        const profile = await getProfileByAuthUserId(session.user.id);
        profileId = profile?.id ?? null;
      }
    } catch {
      // ignore
    }
  }

  const publicId = data.list.publicId;
  const editSecret =
    cookie?.publicId === publicId ? cookie.secret : null;
  const canEdit = canEditList(data.list, { profileId, editSecret });
  const alreadyOwned = Boolean(
    data.list.profileId && profileId && data.list.profileId === profileId,
  );
  const editHref =
    data.list.listType === "goty"
      ? `/create/goty?id=${publicId}`
      : `/create/custom?id=${publicId}`;
  const sharePath = listSharePath({
    publicId,
    slug: data.list.slug,
    username: data.owner?.username,
  });

  return (
    <>
      <SharedListView
        data={data}
        canEdit={canEdit}
        canClaim={false}
        isSignedIn={isSignedIn}
        alreadyOwned={alreadyOwned}
        editHref={editHref}
        sharePath={sharePath}
        view={view}
        categoryPicks={categoryPicks}
        saved={saved}
        error={error}
      />
    </>
  );
}
