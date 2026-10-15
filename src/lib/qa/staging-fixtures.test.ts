import { describe, expect, it } from "vitest";
import { isUndeliverableEmailAddress } from "@/lib/email/send";
import { parseOwnedUsername } from "@/lib/profile/username";
import { slugifyCommunityName } from "@/lib/communities/schema";
import {
  QA_ACCOUNTS,
  QA_COMMUNITIES,
  isProductionAppHost,
  resolveQaTarget,
} from "./staging-fixtures";

const base = {
  QA_TARGET: "staging",
  QA_STAGING_URL: "https://thegamies-v2-develop.example.workers.dev/",
  DATABASE_URL: "postgres://user:pass@host/db",
  QA_ACCOUNT_PASSWORD: "longrandom123",
};

describe("resolveQaTarget", () => {
  it("accepts an explicit staging target", () => {
    expect(resolveQaTarget(base)).toEqual({
      appUrl: "https://thegamies-v2-develop.example.workers.dev",
      databaseUrl: base.DATABASE_URL,
      password: base.QA_ACCOUNT_PASSWORD,
      year: 2025,
    });
  });

  it("requires QA_TARGET=staging", () => {
    expect(resolveQaTarget({ ...base, QA_TARGET: undefined })).toHaveProperty(
      "error",
    );
    expect(resolveQaTarget({ ...base, QA_TARGET: "production" })).toHaveProperty(
      "error",
    );
  });

  it("refuses production app hosts", () => {
    for (const url of [
      "https://thegamies.gg",
      "https://www.thegamies.gg",
      "https://thegamies-v2.ecdm981.workers.dev",
    ]) {
      expect(resolveQaTarget({ ...base, QA_STAGING_URL: url })).toEqual({
        error: "QA_STAGING_URL points at production.",
      });
    }
  });

  it("refuses non-https, missing database, weak password, bad year", () => {
    expect(
      resolveQaTarget({ ...base, QA_STAGING_URL: "http://staging.example" }),
    ).toHaveProperty("error");
    expect(resolveQaTarget({ ...base, DATABASE_URL: "" })).toHaveProperty(
      "error",
    );
    expect(
      resolveQaTarget({ ...base, QA_ACCOUNT_PASSWORD: "short" }),
    ).toHaveProperty("error");
    expect(resolveQaTarget({ ...base, QA_EDITION_YEAR: "20x5" })).toHaveProperty(
      "error",
    );
  });

  it("never puts secret values in error messages", () => {
    const result = resolveQaTarget({
      ...base,
      QA_ACCOUNT_PASSWORD: "nodigits-secret",
    });
    expect(JSON.stringify(result)).not.toContain("nodigits-secret");
  });
});

describe("isProductionAppHost", () => {
  it("does not flag the staging worker", () => {
    expect(isProductionAppHost("thegamies-v2-develop.ecdm981.workers.dev")).toBe(
      false,
    );
  });
});

describe("QA fixtures", () => {
  it("use undeliverable emails and valid usernames", () => {
    for (const account of Object.values(QA_ACCOUNTS)) {
      expect(isUndeliverableEmailAddress(account.email)).toBe(true);
      expect(parseOwnedUsername(account.username)).not.toHaveProperty("error");
    }
  });

  it("community names slugify to the expected slugs", () => {
    for (const community of Object.values(QA_COMMUNITIES)) {
      expect(slugifyCommunityName(community.name)).toBe(community.slug);
    }
  });
});
