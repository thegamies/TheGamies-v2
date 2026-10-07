import { describe, expect, it } from "vitest";
import {
  describeDatabaseHost,
  integrationDatabaseUrl,
  isCiIntegrationBranch,
} from "@/test/integration/guard";

describe("integrationDatabaseUrl", () => {
  it("prefers INTEGRATION_DATABASE_URL", () => {
    expect(
      integrationDatabaseUrl({
        INTEGRATION_DATABASE_URL: "postgresql://a/x",
        DATABASE_URL: "postgresql://b/y",
      }),
    ).toBe("postgresql://a/x");
  });

  it("falls back to DATABASE_URL and treats blanks as missing", () => {
    expect(integrationDatabaseUrl({ DATABASE_URL: " postgresql://b/y " })).toBe(
      "postgresql://b/y",
    );
    expect(integrationDatabaseUrl({ DATABASE_URL: "  " })).toBeNull();
    expect(integrationDatabaseUrl({})).toBeNull();
  });
});

describe("describeDatabaseHost", () => {
  it("returns the hostname without credentials", () => {
    expect(
      describeDatabaseHost("postgresql://user:secret@ep-x.neon.tech/neondb"),
    ).toBe("ep-x.neon.tech");
  });

  it("does not echo unparseable input", () => {
    expect(describeDatabaseHost("not a url secret")).toBe("(unparseable URL)");
  });
});

describe("isCiIntegrationBranch", () => {
  it("requires CI and a ci/integration- branch name", () => {
    expect(
      isCiIntegrationBranch({
        CI: "true",
        INTEGRATION_BRANCH_NAME: "ci/integration-123-1",
      }),
    ).toBe(true);
    expect(
      isCiIntegrationBranch({ INTEGRATION_BRANCH_NAME: "ci/integration-1" }),
    ).toBe(false);
    expect(
      isCiIntegrationBranch({ CI: "true", INTEGRATION_BRANCH_NAME: "develop" }),
    ).toBe(false);
    expect(
      isCiIntegrationBranch({
        CI: "true",
        INTEGRATION_BRANCH_NAME: "ci/integration-",
      }),
    ).toBe(false);
  });
});
