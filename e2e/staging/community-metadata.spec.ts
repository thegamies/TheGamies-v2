import { expect, request, test } from "@playwright/test";
import { QA_COMMUNITIES, type QaAccountKey } from "../../src/lib/qa/staging-fixtures";
import { stagingBaseUrl, storageStatePath } from "./qa";

function head(html: string): string {
  return html.split("</head>")[0] ?? "";
}

const VIEWERS: Array<{ label: string; account: QaAccountKey | null }> = [
  { label: "signed out", account: null },
  { label: "outsider", account: "outsider" },
  { label: "member", account: "member" },
];

for (const viewer of VIEWERS) {
  test(`community metadata as ${viewer.label}`, async () => {
    const api = await request.newContext({
      baseURL: stagingBaseUrl(),
      storageState: viewer.account ? storageStatePath(viewer.account) : undefined,
    });
    try {
      const priv = QA_COMMUNITIES.private;
      const privateHead = head(
        await (await api.get(`/communities/${priv.slug}`)).text(),
      );
      expect(privateHead).toContain(priv.name);
      expect(privateHead, "private description must stay out of metadata").not.toContain(
        priv.description,
      );

      const show = QA_COMMUNITIES.showcase;
      const showcaseHead = head(
        await (await api.get(`/communities/${show.slug}`)).text(),
      );
      expect(showcaseHead).toContain(show.description);
    } finally {
      await api.dispose();
    }
  });
}
