import { mkdir } from "node:fs/promises";
import { request } from "@playwright/test";
import {
  QA_ACCOUNTS,
  QA_ACCOUNT_KEYS,
} from "../../src/lib/qa/staging-fixtures";
import { AUTH_DIR, stagingBaseUrl, storageStatePath } from "./qa";

/** Sign in each QA account through the app's auth endpoint and keep its cookies. */
export default async function globalSetup() {
  const baseURL = stagingBaseUrl();
  const password = process.env.QA_ACCOUNT_PASSWORD;
  if (!password) throw new Error("QA_ACCOUNT_PASSWORD is required.");
  await mkdir(AUTH_DIR, { recursive: true });

  for (const key of QA_ACCOUNT_KEYS) {
    const context = await request.newContext({
      baseURL,
      extraHTTPHeaders: { origin: baseURL },
    });
    const res = await context.post("/api/auth/sign-in/email", {
      data: { email: QA_ACCOUNTS[key].email, password },
    });
    if (!res.ok()) {
      throw new Error(`Sign-in for QA ${key} failed with HTTP ${res.status()}.`);
    }
    const state = await context.storageState({ path: storageStatePath(key) });
    if (state.cookies.length === 0) {
      throw new Error(`Sign-in for QA ${key} set no cookies.`);
    }
    await context.dispose();
  }
}
