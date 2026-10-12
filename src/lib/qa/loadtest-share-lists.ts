import { and, eq } from "drizzle-orm";
import { listItems, lists, type Db } from "@thegamies/db";
import { createDraft, replaceItems } from "@/lib/lists/service";
import {
  LOADTEST_SHARE_LIST_SLUG,
  LOADTEST_SHARE_LIST_TITLE,
  type LoadtestShareList,
} from "@/lib/qa/loadtest";

const SHARE_ITEM_COUNT = 5;

/**
 * Idempotent public custom list for a load-test profile.
 * Separate from writer GOTY creates so those ops still work.
 */
export async function ensureLoadtestShareList(
  db: Db,
  input: {
    profileId: string;
    username: string;
    gameIds: string[];
  },
): Promise<LoadtestShareList> {
  const [existing] = await db
    .select({
      id: lists.id,
      publicId: lists.publicId,
      slug: lists.slug,
    })
    .from(lists)
    .where(
      and(
        eq(lists.profileId, input.profileId),
        eq(lists.slug, LOADTEST_SHARE_LIST_SLUG),
      ),
    )
    .limit(1);

  let listId = existing?.id;
  let publicId = existing?.publicId;
  let slug = existing?.slug ?? LOADTEST_SHARE_LIST_SLUG;

  if (!publicId || !listId) {
    const created = await createDraft(
      { listType: "custom", title: LOADTEST_SHARE_LIST_TITLE },
      { profileId: input.profileId },
      db,
    );
    if ("error" in created) {
      throw new Error(created.error);
    }
    listId = created.list.id;
    publicId = created.list.publicId;
    slug = created.list.slug ?? LOADTEST_SHARE_LIST_SLUG;
  }

  const [item] = await db
    .select({ listId: listItems.listId })
    .from(listItems)
    .where(eq(listItems.listId, listId))
    .limit(1);

  if (!item) {
    const gameIds = input.gameIds.slice(0, SHARE_ITEM_COUNT);
    if (gameIds.length === 0) {
      throw new Error("Need catalog games for load-test share lists.");
    }
    const replaced = await replaceItems(
      publicId,
      gameIds.map((gameId, index) => ({ gameId, rank: index + 1 })),
      { profileId: input.profileId },
      db,
    );
    if ("error" in replaced) {
      throw new Error(replaced.error);
    }
  }

  return { username: input.username, slug, publicId };
}
