import { expect, request, test } from "@playwright/test";
import { SECURITY_HEADERS } from "../../src/lib/security-headers";
import { stagingBaseUrl, storageStatePath } from "./qa";

const PATHS = ["/", "/games", "/auth/sign-in", "/account", "/api/communities/none/edition/2025/standings"];

for (const signedIn of [false, true]) {
  test(`security headers on pages and APIs (${signedIn ? "signed in" : "signed out"})`, async () => {
    const api = await request.newContext({
      baseURL: stagingBaseUrl(),
      storageState: signedIn ? storageStatePath("member") : undefined,
    });
    try {
      for (const path of PATHS) {
        const res = await api.get(path, { maxRedirects: 0 });
        const headers = res.headers();
        for (const { key, value } of SECURITY_HEADERS) {
          expect(headers[key.toLowerCase()], `${path} ${key}`).toBe(value);
        }
      }
    } finally {
      await api.dispose();
    }
  });
}
