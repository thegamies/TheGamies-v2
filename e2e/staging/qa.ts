import { readFileSync } from "node:fs";
import path from "node:path";
import type { QaAccountKey, QaFixturesFile } from "../../src/lib/qa/staging-fixtures";

export const AUTH_DIR = path.resolve("e2e/.auth");

export function storageStatePath(key: QaAccountKey): string {
  return path.join(AUTH_DIR, `${key}.json`);
}

export function stagingBaseUrl(): string {
  const url = process.env.QA_STAGING_URL?.trim();
  if (!url) throw new Error("QA_STAGING_URL is required.");
  return new URL(url).origin;
}

export function readFixtures(): QaFixturesFile {
  const file = process.env.QA_FIXTURES_OUT ?? path.join(AUTH_DIR, "fixtures.json");
  return JSON.parse(readFileSync(file, "utf8")) as QaFixturesFile;
}
