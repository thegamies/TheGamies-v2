import { expect, test } from "@playwright/test";
import {
  editionCategoryStandingsHref,
  editionResultsHref,
  editionVoterBallotHref,
} from "../../src/lib/communities/edition-results-href";
import {
  QA_ACCOUNTS,
  type QaAccountKey,
} from "../../src/lib/qa/staging-fixtures";
import { readFixtures, stagingBaseUrl, storageStatePath } from "../staging/qa";
import { recordJourney, saveJourney, type StepPlan } from "./journey";

const VIEWERS: Array<{ label: string; account: QaAccountKey | null }> = [
  { label: "signed out", account: null },
  { label: "member", account: "member" },
];

function editionSteps(slug: string, year: number, categoryId: string): StepPlan[] {
  return [
    { step: "results", path: editionResultsHref(slug, year, { view: "overview" }) },
    {
      step: "standings",
      path: editionResultsHref(slug, year, { view: "standings" }),
      click: true,
    },
    {
      step: "hosts-standings",
      path: editionResultsHref(slug, year, { mode: "voices", view: "standings" }),
      click: true,
    },
    {
      step: "categories",
      path: editionResultsHref(slug, year, { view: "categories" }),
      click: true,
    },
    {
      step: "category",
      path: editionCategoryStandingsHref(slug, year, categoryId),
      click: true,
    },
    {
      step: "comparison",
      path: editionResultsHref(slug, year, { view: "comparison" }),
      click: true,
    },
    {
      step: "voters",
      path: editionResultsHref(slug, year, { view: "voters" }),
      click: true,
    },
    {
      step: "voter-ballot",
      path: editionVoterBallotHref(slug, year, QA_ACCOUNTS.member.username),
      click: true,
    },
  ];
}

for (const viewer of VIEWERS) {
  test.describe(`edition results cost as ${viewer.label}`, () => {
    test.use({
      storageState: viewer.account
        ? storageStatePath(viewer.account)
        : { cookies: [], origins: [] },
    });

    test("walk the published results", async ({ page }) => {
      const fixtures = readFixtures();
      const { slug, categoryId } = fixtures.communities.showcase;
      const run = await recordJourney(
        page,
        {
          journey: "edition-results",
          viewer: viewer.label,
          baseUrl: stagingBaseUrl(),
        },
        editionSteps(slug, fixtures.year, categoryId),
      );
      const file = await saveJourney(run);
      test.info().annotations.push({ type: "cost", description: file });

      for (const step of run.steps) {
        const page = step.requests.find(
          (r) => r.kind === "document" || r.kind === "rsc",
        );
        expect(page, `${step.step} loaded`).toBeTruthy();
        expect(page!.status, `${step.step} status`).toBe(200);
      }
    });
  });
}
