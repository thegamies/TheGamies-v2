import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { awardCategories } from "@thegamies/db";
import { integrationDb } from "@/test/integration/db";
import { createSeeder } from "@/test/integration/seed";
import {
  createAwardCategory,
  getAwardCategoryById,
  listAwardCategoriesForAdmin,
  updateAwardCategory,
} from "./award-category-admin";
import { ensureAwardCategories } from "./categories";

const db = integrationDb();
const seed = createSeeder(db);
const createdIds: string[] = [];

afterAll(async () => {
  if (createdIds.length > 0) {
    await db
      .delete(awardCategories)
      .where(inArray(awardCategories.id, createdIds));
  }
  await seed.cleanup();
});

describe("award category admin", () => {
  it("creates and edits a row without overwriting the catalog from TypeScript", async () => {
    const first = await ensureAwardCategories(db);
    const second = await ensureAwardCategories(db);
    expect(second.upserted).toBe(0);
    expect(second.active).toBe(first.active);

    const label = `Int Admin Award ${seed.tag}`;
    const created = await createAwardCategory(
      {
        label,
        description: "A test award.",
        categoryGroup: "fun",
        eligibility: "current_year",
        sortOrder: 9000,
        allowEditions: false,
        allowDlcAddon: true,
        currentOrPreviousYear: true,
        active: true,
      },
      db,
    );
    expect("ok" in created && created.ok).toBe(true);
    if (!("id" in created)) throw new Error("expected id");
    createdIds.push(created.id);

    const row = await getAwardCategoryById(created.id, db);
    expect(row).toMatchObject({
      label,
      allowDlcAddon: true,
      currentOrPreviousYear: true,
      active: true,
    });

    const updated = await updateAwardCategory(
      created.id,
      {
        label: `${label} Edited`,
        description: "Updated blurb.",
        categoryGroup: "genre",
        eligibility: "any_year",
        sortOrder: 9001,
        allowEditions: true,
        allowDlcAddon: false,
        currentOrPreviousYear: false,
        active: false,
      },
      db,
    );
    expect(updated).toEqual({ ok: true });

    const after = await getAwardCategoryById(created.id, db);
    expect(after).toMatchObject({
      id: created.id,
      label: `${label} Edited`,
      categoryGroup: "genre",
      eligibility: "any_year",
      allowEditions: true,
      allowDlcAddon: false,
      currentOrPreviousYear: false,
      active: false,
    });

    const listed = await listAwardCategoriesForAdmin(
      { q: seed.tag },
      db,
    );
    expect(listed.rows.some((r) => r.id === created.id)).toBe(true);

    const [dbRow] = await db
      .select({ id: awardCategories.id })
      .from(awardCategories)
      .where(eq(awardCategories.id, created.id))
      .limit(1);
    expect(dbRow?.id).toBe(created.id);
  });
});
