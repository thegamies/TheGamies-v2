import {
  expect,
  request,
  test,
  type APIRequestContext,
} from "@playwright/test";
import {
  QA_COMMUNITIES,
  type QaAccountKey,
  type QaCommunityKey,
} from "../../src/lib/qa/staging-fixtures";
import { readFixtures, stagingBaseUrl, storageStatePath } from "./qa";

const PRIVATE_COPY = "This community is private.";

const VIEWERS: Array<{ label: string; account: QaAccountKey | null }> = [
  { label: "signed out", account: null },
  { label: "outsider", account: "outsider" },
  { label: "member", account: "member" },
  { label: "host", account: "host" },
];

function canBrowse(community: QaCommunityKey, account: QaAccountKey | null) {
  if (community === "showcase") return true;
  return account === "member" || account === "host";
}

for (const viewer of VIEWERS) {
  test.describe(`edition access as ${viewer.label}`, () => {
    let api: APIRequestContext;

    test.beforeAll(async () => {
      api = await request.newContext({
        baseURL: stagingBaseUrl(),
        storageState: viewer.account
          ? storageStatePath(viewer.account)
          : undefined,
      });
    });

    test.afterAll(async () => {
      await api.dispose();
    });

    if (viewer.account) {
      test("session is recognized", async () => {
        const res = await api.get("/account", { maxRedirects: 0 });
        expect(res.status(), "signed-in /account should not redirect").toBe(200);
      });
    }

    for (const community of Object.keys(QA_COMMUNITIES) as QaCommunityKey[]) {
      const allowed = canBrowse(community, viewer.account);
      const expected = allowed ? 200 : 404;

      test(`${QA_COMMUNITIES[community].slug} APIs answer ${expected}`, async () => {
        const fixtures = readFixtures();
        const { slug, categoryId } = fixtures.communities[community];
        const base = `/api/communities/${slug}/edition/${fixtures.year}`;
        for (const path of [
          `${base}/standings`,
          `${base}/categories?categoryId=${encodeURIComponent(categoryId)}`,
          `${base}/comparison`,
        ]) {
          const res = await api.get(path);
          expect(res.status(), path).toBe(expected);
        }
      });

      test(`${QA_COMMUNITIES[community].slug} edition page is ${allowed ? "open" : "private"}`, async () => {
        const fixtures = readFixtures();
        const { slug } = fixtures.communities[community];
        const res = await api.get(
          `/communities/${slug}/edition/${fixtures.year}`,
        );
        expect(res.status()).toBe(200);
        const html = await res.text();
        if (allowed) {
          expect(html).not.toContain(PRIVATE_COPY);
        } else {
          expect(html).toContain(PRIVATE_COPY);
        }
      });
    }
  });
}
